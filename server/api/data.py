import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

router = APIRouter()

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
        prices_data = {}
        returns_data = {}
        
        for ticker in request.tickers:
            try:
                # Fetch data from yfinance
                data = yf.download(ticker, start=request.start, end=request.end, interval=request.interval, progress=False)
                
                if data.empty:
                    continue
                
                # Get adjusted close prices
                if isinstance(data.columns, pd.MultiIndex):
                    adj_close = data['Adj Close'][ticker] if ticker in data['Adj Close'].columns else data['Adj Close'].iloc[:, 0]
                else:
                    adj_close = data['Adj Close']
                
                # Convert to lists of dicts
                prices = []
                for date, price in adj_close.items():
                    if pd.notna(price):
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
                for date, ret in returns.items():
                    if pd.notna(ret):
                        returns_list.append(ReturnDataPoint(
                            date=date.strftime('%Y-%m-%d'),
                            ret=float(ret)
                        ))
                
                returns_data[ticker] = returns_list
                
            except Exception as e:
                print(f"Error fetching {ticker}: {str(e)}")
                continue
        
        return FetchPricesResponse(prices=prices_data, returns=returns_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")
