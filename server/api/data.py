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
    """
    Fetch data using Twelve Data API (production).
    Returns (data, error_msg) tuple - data is None on failure.
    """
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
            return None, f"No data returned from Twelve Data for {ticker}"
            
        # Twelve Data returns newest first, reverse it
        df = df.sort_index()
        
        # Use 'close' column (Twelve Data uses lowercase)
        if 'close' in df.columns:
            return df['close'], None
        return None, f"No 'close' column in Twelve Data response for {ticker}"
        
    except Exception as e:
        error_msg = str(e)
        # Detect rate limiting or API errors
        if "429" in error_msg or "rate limit" in error_msg.lower():
            return None, f"Rate limit hit for {ticker}"
        elif "4" in error_msg[:1]:  # 4xx errors
            return None, f"API error for {ticker}: {error_msg}"
        return None, f"Twelve Data error for {ticker}: {error_msg}"

def fetch_with_yfinance(ticker: str, start: str, end: str, interval: str = "1d"):
    """
    Fetch data using yfinance (development/fallback).
    Returns (data, error_msg) tuple - data is None on failure.
    """
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
            return None, f"No data returned from yfinance for {ticker}"
        
        # Get close prices
        if 'Close' in data.columns:
            return data['Close'].squeeze(), None
        else:
            # If auto_adjust=True, the adjusted close is the default
            close_data = data.iloc[:, 0].squeeze() if len(data.columns) > 0 else data.squeeze()
            return close_data, None
            
    except Exception as e:
        return None, f"yfinance error for {ticker}: {str(e)}"

def fetch_ticker_data(ticker: str, start: str, end: str, interval: str = "1d"):
    """
    Fetch data with automatic fallback: Try Twelve Data first (if configured),
    then fall back to yfinance on any error.
    Returns (data, source) tuple - raises exception if both fail.
    """
    # Try Twelve Data first (if configured)
    if USE_TWELVE_DATA:
        data, error = fetch_with_twelve_data(ticker, start, end, interval)
        if data is not None:
            return data, "Twelve Data"
        print(f"⚠️ {error} - falling back to yfinance")
    
    # Fallback to yfinance (or primary in dev mode)
    data, error = fetch_with_yfinance(ticker, start, end, interval)
    if data is not None:
        source = "yfinance (fallback)" if USE_TWELVE_DATA else "yfinance"
        return data, source
    
    # Both sources failed
    raise Exception(f"All data sources failed for {ticker}: {error}")

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
        
        print(f"⏳ Cache MISS for {request.tickers} - fetching data...")
        
        prices_data = {}
        returns_data = {}
        failed_tickers = []
        
        # Download data for each ticker with automatic fallback
        for ticker in request.tickers:
            try:
                adj_close, source = fetch_ticker_data(ticker, request.start, request.end, request.interval or "1d")
                print(f"✅ {ticker}: fetched from {source}")
                
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
                print(f"❌ Failed to fetch {ticker}: {str(e)}")
                failed_tickers.append(ticker)
                continue
        
        # If ALL tickers failed, return an error
        if len(failed_tickers) == len(request.tickers):
            raise HTTPException(
                status_code=503,
                detail=f"Failed to fetch data for all tickers: {', '.join(request.tickers)}. Both Twelve Data and yfinance are unavailable."
            )
        
        # If SOME tickers failed, log warning but continue WITHOUT caching
        # This allows retries on the next request in case the failure was transient
        if failed_tickers:
            print(f"⚠️ Warning: Failed to fetch data for {len(failed_tickers)} ticker(s): {', '.join(failed_tickers)}")
            print(f"⚠️ Skipping cache to allow retry on next request")
            response = FetchPricesResponse(prices=prices_data, returns=returns_data)
            return response
        
        # Only cache if ALL tickers succeeded
        response = FetchPricesResponse(prices=prices_data, returns=returns_data)
        _price_cache[cache_key] = response
        print(f"💾 Cached complete response for {len(prices_data)} ticker(s)")
        
        return response
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")
