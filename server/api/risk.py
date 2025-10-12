import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from scipy import stats

router = APIRouter()

class ReturnDataPoint(BaseModel):
    date: str
    ret: float

class LPMParams(BaseModel):
    tau: float
    n: float

class PerformanceRequest(BaseModel):
    portfolio: List[ReturnDataPoint]
    benchmark: Optional[List[ReturnDataPoint]] = None
    rf: Optional[float] = 0.02
    lpm: Optional[LPMParams] = None
    interval: Optional[str] = "1d"  # Data frequency for annualization

class PerformanceResponse(BaseModel):
    sharpe: float
    treynor: Optional[float] = None
    informationRatio: Optional[float] = None
    jensenAlpha: Optional[float] = None
    m2: Optional[float] = None
    skew: float
    kurtosis: float
    jb: float
    lpm: Optional[float] = None

@router.post("/risk/performance", response_model=PerformanceResponse)
async def calculate_performance(request: PerformanceRequest):
    try:
        # Convert portfolio returns to array
        portfolio_returns = np.array([r.ret for r in request.portfolio])
        
        # Determine annualization factor based on data frequency
        annualization_factors = {
            "1d": 252,   # Daily: 252 trading days/year
            "1wk": 52,   # Weekly: 52 weeks/year
            "1mo": 12,   # Monthly: 12 months/year
        }
        periods_per_year = annualization_factors.get(request.interval, 252)
        
        # Calculate basic statistics
        mean_return = np.mean(portfolio_returns) * periods_per_year
        std_return = np.std(portfolio_returns) * np.sqrt(periods_per_year)
        
        # Sharpe Ratio
        sharpe = (mean_return - request.rf) / std_return if std_return > 0 else 0
        
        # Skewness and Kurtosis
        skewness = float(stats.skew(portfolio_returns))
        kurt = float(stats.kurtosis(portfolio_returns))
        
        # Jarque-Bera test
        jb_stat = float(stats.jarque_bera(portfolio_returns)[0])
        
        # Treynor, IR, Jensen's Alpha (if benchmark provided)
        treynor = None
        information_ratio = None
        jensen_alpha = None
        m2 = None
        
        if request.benchmark:
            benchmark_returns = np.array([r.ret for r in request.benchmark])
            
            # Align lengths
            min_len = min(len(portfolio_returns), len(benchmark_returns))
            port_ret = portfolio_returns[:min_len]
            bench_ret = benchmark_returns[:min_len]
            
            # Calculate beta
            covariance = np.cov(port_ret, bench_ret)[0, 1]
            benchmark_var = np.var(bench_ret)
            beta = covariance / benchmark_var if benchmark_var > 0 else 1
            
            # Treynor Ratio
            treynor = (mean_return - request.rf) / beta if beta != 0 else 0
            
            # Information Ratio
            active_returns = port_ret - bench_ret
            tracking_error = np.std(active_returns) * np.sqrt(periods_per_year)
            information_ratio = np.mean(active_returns) * periods_per_year / tracking_error if tracking_error > 0 else 0
            
            # Jensen's Alpha
            benchmark_mean = np.mean(bench_ret) * periods_per_year
            jensen_alpha = mean_return - (request.rf + beta * (benchmark_mean - request.rf))
            
            # M²
            benchmark_std = np.std(bench_ret) * np.sqrt(periods_per_year)
            if std_return > 0:
                adjusted_return = request.rf + sharpe * benchmark_std
                m2 = adjusted_return - benchmark_mean
        
        # Lower Partial Moment
        lpm_value = None
        if request.lpm:
            tau = request.lpm.tau / periods_per_year  # Convert to same frequency as returns
            n = request.lpm.n
            shortfalls = np.minimum(portfolio_returns - tau, 0)
            lpm_value = float(np.mean(np.power(np.abs(shortfalls), n)))
        
        return PerformanceResponse(
            sharpe=float(sharpe),
            treynor=float(treynor) if treynor is not None else None,
            informationRatio=float(information_ratio) if information_ratio is not None else None,
            jensenAlpha=float(jensen_alpha) if jensen_alpha is not None else None,
            m2=float(m2) if m2 is not None else None,
            skew=float(skewness),
            kurtosis=float(kurt),
            jb=float(jb_stat),
            lpm=float(lpm_value) if lpm_value is not None else None
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating performance: {str(e)}")
