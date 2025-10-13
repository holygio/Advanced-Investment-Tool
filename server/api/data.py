import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import hashlib
import json

router = APIRouter()

# Simple in-memory cache for price data
_price_cache = {}

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
        
        print(f"Cache MISS for {request.tickers} - fetching from Yahoo Finance...")
        
        prices_data = {}
        returns_data = {}
        
        # Download data for each ticker individually for simplicity and robustness
        for ticker in request.tickers:
            try:
                data = yf.download(
                    ticker,
                    start=request.start,
                    end=request.end,
                    interval=request.interval,
                    progress=False,
                    auto_adjust=True,
                    actions=False
                )
                
                if data.empty:
                    continue
                
                # Get close prices
                if 'Close' in data.columns:
                    adj_close = data['Close'].squeeze()
                else:
                    # If auto_adjust=True, the adjusted close is the default
                    adj_close = data.iloc[:, 0].squeeze() if len(data.columns) > 0 else data.squeeze()
                
                # Ensure it's a pandas Series
                if not isinstance(adj_close, pd.Series):
                    adj_close = pd.Series(adj_close)
                
                # Convert to price lists
                prices = []
                for idx in range(len(adj_close)):
                    date = adj_close.index[idx]
                    price = adj_close.iloc[idx]
                    if not pd.isna(price):
                        prices.append(PriceDataPoint(
                            date=date.strftime('%Y-%m-%d'),
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
                    date = returns.index[idx]
                    ret = returns.iloc[idx]
                    if not pd.isna(ret):
                        returns_list.append(ReturnDataPoint(
                            date=date.strftime('%Y-%m-%d'),
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
