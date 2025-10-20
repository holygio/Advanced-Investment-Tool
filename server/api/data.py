import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
import json
import os

router = APIRouter()

# Fixed ticker universe for static dataset (includes S&P 500 index for CAPM)
AVAILABLE_TICKERS = ["SPY", "QQQ", "IWM", "XLF", "TLT", "HYG", "GLD", "SLV", "UUP", "VIXY", "^GSPC"]

# Simple in-memory cache for processed requests
_price_cache = {}

# Global dataset - loaded once on startup
_STATIC_DATA = None
_DATA_PATH = "../data/prices_10y.csv"  # Relative to server/ directory

def load_static_data():
    """
    Load static dataset of 10 assets (2015–2025).
    This is loaded once on startup and kept in memory.
    """
    global _STATIC_DATA
    
    if _STATIC_DATA is not None:
        return _STATIC_DATA
    
    try:
        df = pd.read_csv(_DATA_PATH, index_col=0, parse_dates=True)
        
        # Verify we have all expected tickers
        missing_tickers = [t for t in AVAILABLE_TICKERS if t not in df.columns]
        if missing_tickers:
            print(f"⚠️ Warning: Missing tickers in dataset: {missing_tickers}")
            print(f"   Available columns: {list(df.columns)}")
            # Filter to only available tickers
            available = [t for t in AVAILABLE_TICKERS if t in df.columns]
            df = df[available]
        else:
            # Ensure we have all tickers in the right order
            df = df[AVAILABLE_TICKERS]
        
        _STATIC_DATA = df
        print(f"✅ Loaded static dataset: {df.shape[0]} days × {df.shape[1]} assets")
        print(f"   Date range: {df.index[0].strftime('%Y-%m-%d')} to {df.index[-1].strftime('%Y-%m-%d')}")
        print(f"   Available tickers: {', '.join(df.columns.tolist())}")
        
        return df
    
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=f"Static dataset not found at {_DATA_PATH}. Please run scripts/download_static_data.py first."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading static dataset: {str(e)}"
        )

# Load data on module import
try:
    load_static_data()
except Exception as e:
    print(f"⚠️ Warning: Could not load static data on startup: {e}")
    print("   Static data will be loaded on first request.")

class FetchPricesRequest(BaseModel):
    tickers: List[str]
    start: str
    end: str
    interval: Optional[str] = "1d"
    log_returns: Optional[bool] = False

class PriceDataPoint(BaseModel):
    date: str
    adjClose: float

class ReturnDataPoint(BaseModel):
    date: str
    ret: float

class FetchPricesResponse(BaseModel):
    prices: Dict[str, List[PriceDataPoint]]
    returns: Dict[str, List[ReturnDataPoint]]

def validate_tickers(tickers: List[str]) -> tuple[List[str], List[str]]:
    """
    Validate tickers against available dataset.
    Returns (valid_tickers, invalid_tickers)
    """
    valid = []
    invalid = []
    
    for ticker in tickers:
        if ticker in AVAILABLE_TICKERS:
            valid.append(ticker)
        else:
            invalid.append(ticker)
    
    return valid, invalid

def resample_data(df: pd.DataFrame, interval: str) -> pd.DataFrame:
    """
    Resample daily data to requested interval.
    """
    if interval == "1d":
        return df
    elif interval == "1wk":
        # Resample to weekly, using last price of week
        return df.resample('W-FRI').last().dropna(how='all')
    elif interval == "1mo":
        # Resample to monthly, using last price of month
        return df.resample('M').last().dropna(how='all')
    else:
        # Default to daily
        return df

@router.post("/data/prices", response_model=FetchPricesResponse)
async def fetch_prices(request: FetchPricesRequest):
    try:
        # Create cache key from request parameters
        cache_key = hashlib.md5(
            json.dumps({
                "tickers": sorted(request.tickers),
                "start": request.start,
                "end": request.end,
                "interval": request.interval,
                "log_returns": request.log_returns
            }, sort_keys=True).encode()
        ).hexdigest()
        
        # Check cache first - instant response for cached data!
        if cache_key in _price_cache:
            print(f"✅ Cache HIT for {request.tickers}")
            return _price_cache[cache_key]
        
        print(f"⏳ Processing request for {request.tickers}...")
        
        # Load static dataset
        data = load_static_data()
        
        # Validate tickers
        valid_tickers, invalid_tickers = validate_tickers(request.tickers)
        
        if invalid_tickers:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid ticker(s): {', '.join(invalid_tickers)}. Available tickers: {', '.join(AVAILABLE_TICKERS)}"
            )
        
        if not valid_tickers:
            raise HTTPException(
                status_code=400,
                detail=f"No valid tickers provided. Available tickers: {', '.join(AVAILABLE_TICKERS)}"
            )
        
        # Filter by tickers
        df = data[valid_tickers].copy()
        
        # Filter by date range
        start_date = pd.to_datetime(request.start)
        end_date = pd.to_datetime(request.end)
        df = df[(df.index >= start_date) & (df.index <= end_date)]
        
        if df.empty:
            raise HTTPException(
                status_code=400,
                detail=f"No data available for date range {request.start} to {request.end}"
            )
        
        # Resample if needed
        if request.interval and request.interval != "1d":
            df = resample_data(df, request.interval)
        
        # Build response
        prices_data = {}
        returns_data = {}
        
        for ticker in valid_tickers:
            # Prices
            prices = []
            for idx, price in df[ticker].items():
                if not pd.isna(price):
                    prices.append(PriceDataPoint(
                        date=idx.strftime('%Y-%m-%d'),
                        adjClose=float(price)
                    ))
            prices_data[ticker] = prices
            
            # Returns
            if request.log_returns:
                returns_series = np.log(df[ticker] / df[ticker].shift(1))
            else:
                returns_series = df[ticker].pct_change()
            
            returns_list = []
            for idx, ret in returns_series.items():
                if not pd.isna(ret):
                    returns_list.append(ReturnDataPoint(
                        date=idx.strftime('%Y-%m-%d'),
                        ret=float(ret)
                    ))
            returns_data[ticker] = returns_list
        
        # Cache and return
        response = FetchPricesResponse(prices=prices_data, returns=returns_data)
        _price_cache[cache_key] = response
        print(f"✅ Served {len(prices_data)} ticker(s) from static dataset (cached)")
        
        return response
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")
