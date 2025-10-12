import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import statsmodels.api as sm
from scipy import stats

router = APIRouter()

class ReturnDataPoint(BaseModel):
    date: str
    ret: float

class CAPMResult(BaseModel):
    ticker: str
    alpha: float
    beta: float
    t_alpha: float
    t_beta: float
    r2: float
    expected_return: float

class SMLPoint(BaseModel):
    beta: float
    expectedReturn: float

class CAPMRequest(BaseModel):
    returns: Dict[str, List[ReturnDataPoint]]
    market: str
    rf: float = 0.025  # Annual risk-free rate
    interval: str = "1wk"  # Data interval
    rf_series: Optional[List[Dict[str, Any]]] = None

class CAPMResponse(BaseModel):
    results: List[CAPMResult]
    sml: List[SMLPoint]
    summary: Dict[str, Any]

@router.post("/model/capm", response_model=CAPMResponse)
async def run_capm(request: CAPMRequest):
    try:
        # Convert returns to DataFrame
        returns_df = pd.DataFrame()
        for ticker, returns in request.returns.items():
            returns_df[ticker] = [r.ret for r in returns]
        
        # Get market returns
        if request.market not in returns_df.columns:
            raise HTTPException(status_code=400, detail=f"Market proxy {request.market} not found in returns data")
        
        market_returns = returns_df[request.market]
        
        # Convert annual risk-free rate to period rate
        annualization_factors = {
            "1d": 252,
            "1wk": 52,
            "1mo": 12,
        }
        annualization = annualization_factors.get(request.interval, 52)
        rf_period = request.rf / annualization
        
        # Calculate excess returns
        market_excess = market_returns - rf_period
        
        results = []
        betas = []
        expected_returns = []
        
        for ticker in returns_df.columns:
            if ticker == request.market:
                continue
            
            asset_returns = returns_df[ticker]
            asset_excess = asset_returns - rf_period
            
            # Run OLS regression
            X = sm.add_constant(market_excess)
            y = asset_excess
            
            # Remove NaN values
            mask = ~(X.isna().any(axis=1) | y.isna())
            X_clean = X[mask]
            y_clean = y[mask]
            
            if len(X_clean) < 10:
                continue
            
            model = sm.OLS(y_clean, X_clean).fit()
            
            alpha = float(model.params[0])
            beta = float(model.params[1])
            t_alpha = float(model.tvalues[0])
            t_beta = float(model.tvalues[1])
            r2 = float(model.rsquared)
            
            # Calculate expected return using CAPM formula
            market_return_annual = market_returns.mean() * annualization
            market_premium = market_return_annual - request.rf
            expected_return = alpha * annualization + beta * market_premium
            
            results.append(CAPMResult(
                ticker=ticker,
                alpha=alpha * annualization,  # Annualize alpha
                beta=beta,
                t_alpha=t_alpha,
                t_beta=t_beta,
                r2=r2,
                expected_return=expected_return
            ))
            
            betas.append(beta)
            expected_returns.append(expected_return)
        
        # Calculate SML
        market_return_annual = market_returns.mean() * annualization
        market_premium = market_return_annual - request.rf
        
        if betas:
            beta_range = np.linspace(min(betas) - 0.5, max(betas) + 0.5, 50)
            sml_points = [
                SMLPoint(beta=float(b), expectedReturn=float(request.rf + b * market_premium))
                for b in beta_range
            ]
        else:
            sml_points = []
        
        summary = {
            "market_return": float(market_return_annual),
            "market_volatility": float(market_returns.std() * np.sqrt(annualization)),
            "risk_free_rate": float(request.rf),
            "market_premium": float(market_premium)
        }
        
        return CAPMResponse(results=results, sml=sml_points, summary=summary)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running CAPM: {str(e)}")


class FactorDataPoint(BaseModel):
    date: str
    MKT_RF: Optional[float] = None
    SMB: Optional[float] = None
    HML: Optional[float] = None
    MOM: Optional[float] = None
    RMW: Optional[float] = None
    CMA: Optional[float] = None
    TERM: Optional[float] = None
    CREDIT: Optional[float] = None

class FactorLoading(BaseModel):
    factor: str
    beta: float
    t: float

class FactorRequest(BaseModel):
    portfolio: List[ReturnDataPoint]
    factors: List[FactorDataPoint]

class FactorResponse(BaseModel):
    loadings: List[FactorLoading]
    alpha: float
    r2: float
    corr: List[List[float]]
    factorMeans: Dict[str, float]

@router.post("/model/factors", response_model=FactorResponse)
async def run_factor_analysis(request: FactorRequest):
    try:
        # Convert portfolio returns to series
        portfolio_returns = pd.Series([r.ret for r in request.portfolio])
        
        # Convert factors to DataFrame
        factor_data = {}
        for factor_point in request.factors:
            for factor_name in ['MKT_RF', 'SMB', 'HML', 'MOM', 'RMW', 'CMA', 'TERM', 'CREDIT']:
                value = getattr(factor_point, factor_name)
                if value is not None:
                    if factor_name not in factor_data:
                        factor_data[factor_name] = []
                    factor_data[factor_name].append(value)
        
        factors_df = pd.DataFrame(factor_data)
        
        # Align lengths
        min_len = min(len(portfolio_returns), len(factors_df))
        portfolio_returns = portfolio_returns[:min_len]
        factors_df = factors_df[:min_len]
        
        # Run multi-factor regression
        X = sm.add_constant(factors_df)
        y = portfolio_returns
        
        model = sm.OLS(y, X).fit()
        
        # Extract loadings
        loadings = []
        for i, factor in enumerate(factors_df.columns):
            loadings.append(FactorLoading(
                factor=factor,
                beta=float(model.params[i + 1]),
                t=float(model.tvalues[i + 1])
            ))
        
        alpha = float(model.params[0])
        r2 = float(model.rsquared)
        
        # Calculate correlation matrix
        corr_matrix = factors_df.corr().values.tolist()
        
        # Calculate factor means
        factor_means = {col: float(factors_df[col].mean()) for col in factors_df.columns}
        
        return FactorResponse(
            loadings=loadings,
            alpha=alpha,
            r2=r2,
            corr=corr_matrix,
            factorMeans=factor_means
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running factor analysis: {str(e)}")
