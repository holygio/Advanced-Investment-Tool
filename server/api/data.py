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
        
        # Download all tickers at once for efficiency
        # Only fetch Close prices to minimize data transfer and processing time
        tickers_str = ' '.join(request.tickers)
        data = yf.download(
            tickers_str,
            start=request.start,
            end=request.end,
            interval=request.interval,
            progress=False,
            auto_adjust=True,
            actions=False  # Don't fetch dividends/splits  
        )
        
        if data.empty:
            return FetchPricesResponse(prices={}, returns={})
        
        # Extract only Close prices
        if len(request.tickers) == 1:
            # Single ticker - data is a simple DataFrame
            close_data = data['Close'] if 'Close' in data.columns else data
        else:
            # Multiple tickers - extract Close column
            if isinstance(data.columns, pd.MultiIndex):
                close_data = data['Close']
            else:
                close_data = data
        
        # Process each ticker
        for ticker in request.tickers:
            try:
                # Get close prices for this ticker
                if len(request.tickers) == 1:
                    adj_close = close_data
                else:
                    if ticker not in close_data.columns:
                        continue
                    adj_close = close_data[ticker]
                
                # Convert to price lists
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
                print(f"Error processing {ticker}: {str(e)}")
                continue
        
        return FetchPricesResponse(prices=prices_data, returns=returns_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching prices: {str(e)}")
