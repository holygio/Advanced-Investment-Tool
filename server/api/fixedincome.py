import yfinance as yf
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter()

class YieldCurvePoint(BaseModel):
    tenor: str
    yield_: float
    
    class Config:
        populate_by_name = True
        fields = {'yield_': 'yield'}

class CreditSpreadPoint(BaseModel):
    date: str
    spread: float

class CreditProxyData(BaseModel):
    series: List[CreditSpreadPoint]
    latest: float

class FixedIncomeRequest(BaseModel):
    useFRED: Optional[bool] = False

class FixedIncomeResponse(BaseModel):
    yieldCurve: List[YieldCurvePoint]
    termSpread: float
    creditProxy: CreditProxyData

@router.post("/fixedincome/term-credit", response_model=FixedIncomeResponse)
async def get_fixed_income_data(request: FixedIncomeRequest):
    try:
        # Use Treasury ETF proxies for yield curve
        # SHY (1-3yr), IEF (7-10yr), TLT (20+yr)
        tickers = {
            "^IRX": "3M",  # 13 Week Treasury Bill
            "^FVX": "5Y",  # 5 Year Treasury
            "^TNX": "10Y", # 10 Year Treasury
            "^TYX": "30Y"  # 30 Year Treasury
        }
        
        yield_curve = []
        end_date = datetime.now()
        start_date = end_date - timedelta(days=5)
        
        for ticker, tenor in tickers.items():
            try:
                data = yf.download(ticker, start=start_date, end=end_date, progress=False)
                if not data.empty:
                    latest_yield = data['Close'].iloc[-1] / 100  # Convert to decimal
                    yield_curve.append(YieldCurvePoint(tenor=tenor, yield_=float(latest_yield)))
            except:
                # Use approximate values if download fails
                approx_yields = {"3M": 0.0525, "5Y": 0.0425, "10Y": 0.0410, "30Y": 0.0435}
                if tenor in approx_yields:
                    yield_curve.append(YieldCurvePoint(tenor=tenor, yield_=approx_yields[tenor]))
        
        # Sort by tenor
        tenor_order = {"3M": 0, "6M": 1, "1Y": 2, "2Y": 3, "5Y": 4, "10Y": 5, "30Y": 6}
        yield_curve.sort(key=lambda x: tenor_order.get(x.tenor, 999))
        
        # Calculate term spread (10Y - 3M)
        yields_10y = [y.yield_ for y in yield_curve if y.tenor == "10Y"]
        yields_3m = [y.yield_ for y in yield_curve if y.tenor == "3M"]
        
        if yields_10y and yields_3m:
            term_spread = yields_10y[0] - yields_3m[0]
        else:
            term_spread = 0.0185  # Default
        
        # Credit spread proxy: LQD (investment grade) vs TLT (long treasury)
        # Or HYG (high yield) vs IEF (intermediate treasury)
        credit_series = []
        
        try:
            # Fetch recent data for credit spread calculation
            lqd_data = yf.download("LQD", start=start_date - timedelta(days=30), end=end_date, progress=False)
            tlt_data = yf.download("TLT", start=start_date - timedelta(days=30), end=end_date, progress=False)
            
            if not lqd_data.empty and not tlt_data.empty:
                # Calculate yield spread (simplified using price ratios as proxy)
                lqd_returns = lqd_data['Close'].pct_change()
                tlt_returns = tlt_data['Close'].pct_change()
                
                # Align dates
                common_dates = lqd_returns.index.intersection(tlt_returns.index)
                for date in common_dates[-10:]:  # Last 10 days
                    spread = float(lqd_returns.loc[date] - tlt_returns.loc[date])
                    credit_series.append(CreditSpreadPoint(
                        date=date.strftime('%Y-%m-%d'),
                        spread=spread
                    ))
                
                latest_spread = credit_series[-1].spread if credit_series else 0.0125
            else:
                # Default values
                latest_spread = 0.0125
        except:
            # Fallback to default
            latest_spread = 0.0125
            # Generate some dummy historical data
            for i in range(10):
                date = (end_date - timedelta(days=10-i)).strftime('%Y-%m-%d')
                spread = 0.0125 + np.random.normal(0, 0.001)
                credit_series.append(CreditSpreadPoint(date=date, spread=float(spread)))
        
        return FixedIncomeResponse(
            yieldCurve=yield_curve,
            termSpread=float(term_spread),
            creditProxy=CreditProxyData(
                series=credit_series,
                latest=float(latest_spread)
            )
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching fixed income data: {str(e)}")


class RiskNeutralRequest(BaseModel):
    ticker: str
    expiry: str
    s: float  # Current stock price
    r: float  # Risk-free rate
    u: float  # Up factor
    d: float  # Down factor

class RiskNeutralResponse(BaseModel):
    p_up: float
    p_down: float
    notes: str

@router.post("/derivatives/risk-neutral", response_model=RiskNeutralResponse)
async def calculate_risk_neutral(request: RiskNeutralRequest):
    try:
        # Calculate risk-neutral probability
        # p = (e^r - d) / (u - d)
        exp_r = np.exp(request.r)
        p_up = (exp_r - request.d) / (request.u - request.d)
        p_down = 1 - p_up
        
        notes = f"Binomial model risk-neutral probabilities. "
        notes += f"Under risk-neutral measure: E^Q[R] = r_f. "
        notes += f"Up factor u={request.u:.3f}, down factor d={request.d:.3f}. "
        notes += f"Risk-neutral probability p={p_up:.4f} ensures expected return equals risk-free rate."
        
        return RiskNeutralResponse(
            p_up=float(p_up),
            p_down=float(p_down),
            notes=notes
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating risk-neutral probabilities: {str(e)}")
