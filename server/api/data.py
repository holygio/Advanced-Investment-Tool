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
        data = yf.download(
            request.tickers,
            start=request.start,
            end=request.end,
            interval=request.interval,
            progress=False,
            auto_adjust=True  # Use adjusted prices
        )
        
        if data.empty:
            return FetchPricesResponse(prices={}, returns={})
        
        # Handle single vs multiple tickers
        if len(request.tickers) == 1:
            ticker = request.tickers[0]
            
            # For single ticker, columns are simple
            if hasattr(data.columns, 'nlevels') and data.columns.nlevels > 1:
                # Still MultiIndex even for single ticker
                adj_close = data['Close'].iloc[:, 0] if 'Close' in data.columns else data.iloc[:, 0]
            elif 'Close' in list(data.columns):
                adj_close = data['Close']
            else:
                adj_close = data.iloc[:, 0]  # Take first column
            
            # Convert to lists
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
        else:
            # Multiple tickers - columns are MultiIndex
            for ticker in request.tickers:
                try:
                    # Get close prices for this ticker
                    if isinstance(data.columns, pd.MultiIndex):
                        if ('Close', ticker) in data.columns:
                            adj_close = data[('Close', ticker)]
                        else:
                            continue
                    else:
                        continue
                    
                    # Convert to lists
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
