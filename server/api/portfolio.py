import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import cvxpy as cp

router = APIRouter()

class ReturnDataPoint(BaseModel):
    date: str
    ret: float

class EfficientFrontierPoint(BaseModel):
    risk: float
    return_: float
    weights: Dict[str, float]
    
    class Config:
        populate_by_name = True
        fields = {'return_': 'return'}

class TangencyPortfolio(BaseModel):
    risk: float
    return_: float
    sharpe: float
    weights: Dict[str, float]
    
    class Config:
        populate_by_name = True
        fields = {'return_': 'return'}

class CMLPoint(BaseModel):
    risk: float
    return_: float
    
    class Config:
        populate_by_name = True
        fields = {'return_': 'return'}

class EfficientFrontierRequest(BaseModel):
    returns: Dict[str, List[ReturnDataPoint]]
    rf: float
    allow_short: bool

class EfficientFrontierResponse(BaseModel):
    frontier: List[EfficientFrontierPoint]
    tangency: TangencyPortfolio
    cml: List[CMLPoint]

@router.post("/portfolio/efficient-frontier", response_model=EfficientFrontierResponse)
async def calculate_efficient_frontier(request: EfficientFrontierRequest):
    try:
        # Convert returns to DataFrame
        returns_df = pd.DataFrame()
        for ticker, returns in request.returns.items():
            returns_df[ticker] = [r.ret for r in returns]
        
        # Calculate expected returns and covariance matrix
        mu = returns_df.mean() * 252  # Annualize
        cov = returns_df.cov() * 252  # Annualize
        
        n_assets = len(mu)
        tickers = list(mu.index)
        
        # Generate efficient frontier
        target_returns = np.linspace(mu.min(), mu.max() * 1.5, 30)
        frontier_points = []
        
        for target_return in target_returns:
            # Define optimization variables
            w = cp.Variable(n_assets)
            
            # Objective: minimize variance
            objective = cp.Minimize(cp.quad_form(w, cov.values))
            
            # Constraints
            constraints = [
                cp.sum(w) == 1,  # weights sum to 1
                w @ mu.values == target_return  # target return
            ]
            
            if not request.allow_short:
                constraints.append(w >= 0)  # no short selling
            
            # Solve
            problem = cp.Problem(objective, constraints)
            problem.solve(solver=cp.OSQP)
            
            if problem.status == 'optimal':
                weights_dict = {ticker: float(w.value[i]) for i, ticker in enumerate(tickers)}
                frontier_points.append(EfficientFrontierPoint(
                    risk=float(np.sqrt(problem.value)),
                    return_=float(target_return),
                    weights=weights_dict
                ))
        
        # Calculate tangency portfolio (max Sharpe ratio)
        w = cp.Variable(n_assets)
        excess_return = mu.values - request.rf
        
        objective = cp.Maximize(w @ excess_return)
        constraints = [
            cp.quad_form(w, cov.values) <= 1,
            cp.sum(w) == 1
        ]
        
        if not request.allow_short:
            constraints.append(w >= 0)
        
        problem = cp.Problem(objective, constraints)
        problem.solve(solver=cp.OSQP)
        
        if problem.status == 'optimal':
            tangency_weights = w.value / np.sum(w.value)
            tangency_return = float(mu.values @ tangency_weights)
            tangency_risk = float(np.sqrt(tangency_weights @ cov.values @ tangency_weights))
            tangency_sharpe = (tangency_return - request.rf) / tangency_risk if tangency_risk > 0 else 0
            
            tangency = TangencyPortfolio(
                risk=tangency_risk,
                return_=tangency_return,
                sharpe=tangency_sharpe,
                weights={ticker: float(tangency_weights[i]) for i, ticker in enumerate(tickers)}
            )
        else:
            # Fallback: use equal weights
            tangency_weights = np.ones(n_assets) / n_assets
            tangency_return = float(mu.values @ tangency_weights)
            tangency_risk = float(np.sqrt(tangency_weights @ cov.values @ tangency_weights))
            tangency_sharpe = (tangency_return - request.rf) / tangency_risk if tangency_risk > 0 else 0
            
            tangency = TangencyPortfolio(
                risk=tangency_risk,
                return_=tangency_return,
                sharpe=tangency_sharpe,
                weights={ticker: float(tangency_weights[i]) for i, ticker in enumerate(tickers)}
            )
        
        # Calculate Capital Market Line
        cml_points = []
        max_risk = max([p.risk for p in frontier_points]) if frontier_points else tangency.risk * 2
        for risk in np.linspace(0, max_risk, 50):
            cml_return = request.rf + (tangency.return_ - request.rf) / tangency.risk * risk if tangency.risk > 0 else request.rf
            cml_points.append(CMLPoint(risk=float(risk), return_=float(cml_return)))
        
        return EfficientFrontierResponse(
            frontier=frontier_points,
            tangency=tangency,
            cml=cml_points
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating efficient frontier: {str(e)}")
