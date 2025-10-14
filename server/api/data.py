import yfinance as yf
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

# Simple in-memory cache for price data
_price_cache = {}

# Check for Twelve Data API key (production)
TWELVE_DATA_API_KEY = os.environ.get('TWELVE_DATA_API_KEY')
USE_TWELVE_DATA = bool(TWELVE_DATA_API_KEY)

if USE_TWELVE_DATA:
    from twelvedata import TDClient
    td = TDClient(apikey=TWELVE_DATA_API_KEY)
    print("✅ Using Twelve Data API for production data fetching")
else:
    print("⚠️ Using yfinance (development mode) - may fail in production")

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

def fetch_with_twelve_data(ticker: str, start: str, end: str, interval: str = "1d"):
    """Fetch data using Twelve Data API (production)"""
    try:
        # Map interval format: yfinance uses "1d", Twelve Data uses "1day"
        interval_map = {
            "1d": "1day",
            "1wk": "1week",
            "1mo": "1month"
        }
        td_interval = interval_map.get(interval, "1day")
        
        # Fetch time series data
        ts = td.time_series(
            symbol=ticker,
            interval=td_interval,
            start_date=start,
            end_date=end,
            outputsize=5000
        )
        
        # Get data as pandas DataFrame
        df = ts.as_pandas()
        
        if df is None or df.empty:
            return None
            
        # Twelve Data returns newest first, reverse it
        df = df.sort_index()
        
        # Use 'close' column (Twelve Data uses lowercase)
        if 'close' in df.columns:
            return df['close']
        return None
        
    except Exception as e:
        print(f"Twelve Data error for {ticker}: {str(e)}")
        return None

def fetch_with_yfinance(ticker: str, start: str, end: str, interval: str = "1d"):
    """Fetch data using yfinance (development fallback)"""
    try:
        data = yf.download(
            ticker,
            start=start,
            end=end,
            interval=interval,
            progress=False,
            auto_adjust=True,
            actions=False
        )
        
        if data.empty:
            return None
        
        # Get close prices
        if 'Close' in data.columns:
            return data['Close'].squeeze()
        else:
            # If auto_adjust=True, the adjusted close is the default
            return data.iloc[:, 0].squeeze() if len(data.columns) > 0 else data.squeeze()
            
    except Exception as e:
        print(f"yfinance error for {ticker}: {str(e)}")
        return None

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
            print(f"Cache HIT for {request.tickers}")
            return _price_cache[cache_key]
        
        data_source = "Twelve Data" if USE_TWELVE_DATA else "Yahoo Finance"
        print(f"Cache MISS for {request.tickers} - fetching from {data_source}...")
        
        prices_data = {}
        returns_data = {}
        
        # Download data for each ticker
        for ticker in request.tickers:
            try:
                # Use appropriate data source
                if USE_TWELVE_DATA:
                    adj_close = fetch_with_twelve_data(ticker, request.start, request.end, request.interval or "1d")
                else:
                    adj_close = fetch_with_yfinance(ticker, request.start, request.end, request.interval or "1d")
                
                if adj_close is None:
                    print(f"No data available for {ticker}")
                    continue
                
                # Ensure it's a pandas Series
                if not isinstance(adj_close, pd.Series):
                    adj_close = pd.Series(adj_close)
                
                # Convert to price lists
                prices = []
                for idx in range(len(adj_close)):
                    date_val = adj_close.index[idx]
                    price = adj_close.iloc[idx]
                    if not pd.isna(price):
                        # Handle both Timestamp and datetime objects
                        if hasattr(date_val, 'strftime'):
                            date_str = date_val.strftime('%Y-%m-%d')
                        else:
                            date_str = str(date_val)[:10]
                        
                        prices.append(PriceDataPoint(
                            date=date_str,
                            adjClose=float(price)
                        ))
                
                prices_data[ticker] = prices
                
                # Calculate returns
                if request.log_returns:
                    returns = np.log(adj_close / adj_close.shift(1))
                else:
                    returns = adj_close.pct_change()
                
                returns_list = []
                for idx in range(len(returns)):
                    date_val = returns.index[idx]
                    ret = returns.iloc[idx]
                    if not pd.isna(ret):
                        # Handle both Timestamp and datetime objects
                        if hasattr(date_val, 'strftime'):
                            date_str = date_val.strftime('%Y-%m-%d')
                        else:
                            date_str = str(date_val)[:10]
                        
                        returns_list.append(ReturnDataPoint(
                            date=date_str,
                            ret=float(ret)
                        ))
                
                returns_data[ticker] = returns_list
            
            except Exception as e:
                print(f"Error processing {ticker}: {str(e)}")
                continue
        
        # Cache the response for instant future access
        response = FetchPricesResponse(prices=prices_data, returns=returns_data)
        _price_cache[cache_key] = response
        print(f"Cached response for {request.tickers}")
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")
