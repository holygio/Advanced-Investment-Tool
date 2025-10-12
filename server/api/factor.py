import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import statsmodels.api as sm

router = APIRouter()

class ReturnDataPoint(BaseModel):
    date: str
    ret: float

class FactorModelRequest(BaseModel):
    asset_returns: List[ReturnDataPoint]
    factors: Dict[str, List[float]]  # factor_name -> factor returns
    include_intercept: bool = True

class FactorLoadingResult(BaseModel):
    factor: str
    beta: float
    t_stat: float
    p_value: float
    mean_return: float

class FactorModelResponse(BaseModel):
    loadings: List[FactorLoadingResult]
    alpha: float
    alpha_t_stat: float
    alpha_p_value: float
    r_squared: float
    adj_r_squared: float
    residual_std: float

@router.post("/factor/model", response_model=FactorModelResponse)
async def run_factor_model(request: FactorModelRequest):
    try:
        # Extract asset returns
        asset_returns = np.array([r.ret for r in request.asset_returns])
        
        # Build factor matrix
        factor_names = list(request.factors.keys())
        factor_matrix = np.column_stack([request.factors[name] for name in factor_names])
        
        # Align lengths
        min_len = min(len(asset_returns), len(factor_matrix))
        y = asset_returns[:min_len]
        X = factor_matrix[:min_len]
        
        # Add intercept if requested
        if request.include_intercept:
            X = sm.add_constant(X)
        
        # Run OLS regression
        model = sm.OLS(y, X)
        results = model.fit()
        
        # Extract coefficients
        if request.include_intercept:
            alpha = float(results.params[0])
            alpha_t_stat = float(results.tvalues[0])
            alpha_p_value = float(results.pvalues[0])
            betas = results.params[1:]
            t_stats = results.tvalues[1:]
            p_values = results.pvalues[1:]
        else:
            alpha = 0.0
            alpha_t_stat = 0.0
            alpha_p_value = 1.0
            betas = results.params
            t_stats = results.tvalues
            p_values = results.pvalues
        
        # Calculate mean returns for each factor
        mean_returns = [float(np.mean(request.factors[name])) for name in factor_names]
        
        # Build loadings results
        loadings = []
        for i, factor_name in enumerate(factor_names):
            loadings.append(FactorLoadingResult(
                factor=factor_name,
                beta=float(betas[i]),
                t_stat=float(t_stats[i]),
                p_value=float(p_values[i]),
                mean_return=mean_returns[i]
            ))
        
        return FactorModelResponse(
            loadings=loadings,
            alpha=alpha,
            alpha_t_stat=alpha_t_stat,
            alpha_p_value=alpha_p_value,
            r_squared=float(results.rsquared),
            adj_r_squared=float(results.rsquared_adj),
            residual_std=float(np.std(results.resid))
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running factor model: {str(e)}")
