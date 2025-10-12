import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
import cvxpy as cp

router = APIRouter()

class ReturnDataPoint(BaseModel):
    date: str
    ret: float

class EfficientFrontierPoint(BaseModel):
    risk: float
    return_: float = Field(..., serialization_alias='return')
    weights: Dict[str, float]
    
    class Config:
        populate_by_name = True

class TangencyPortfolio(BaseModel):
    risk: float
    return_: float = Field(..., serialization_alias='return')
    sharpe: float
    weights: Dict[str, float]
    
    class Config:
        populate_by_name = True

class CMLPoint(BaseModel):
    risk: float
    return_: float = Field(..., serialization_alias='return')
    
    class Config:
        populate_by_name = True

class EfficientFrontierRequest(BaseModel):
    returns: Dict[str, List[ReturnDataPoint]]
    rf: float
    allow_short: bool
    max_weight: float = 1.0
    interval: str = "1d"

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
        
        # Determine annualization factor
        annualization_factors = {
            "1d": 252,
            "1wk": 52,
            "1mo": 12,
        }
        annualization = annualization_factors.get(request.interval, 252)
        
        # Calculate expected returns and covariance matrix
        mu = returns_df.mean().values * annualization  # Annualized returns
        cov = returns_df.cov().values * annualization  # Annualized covariance
        
        n_assets = len(mu)
        tickers = list(returns_df.columns)
        
        # First, find the tangency portfolio (maximum Sharpe ratio)
        # This is the portfolio that maximizes (mu - rf) / sigma
        # We solve this by minimizing variance subject to a target Sharpe ratio
        
        # Method: Maximize quadratic utility with risk aversion parameter
        # This gives us the tangency portfolio
        w_tangency = cp.Variable(n_assets)
        
        # Objective: Maximize Sharpe ratio = maximize (w'mu - rf) / sqrt(w'Σw)
        # Equivalent to: minimize w'Σw subject to w'mu - rf = 1, sum(w) unconstrained initially
        # Then normalize
        
        # Alternative: Just maximize w'mu - lambda * w'Σ w with proper lambda
        # For tangency: maximize (w'mu - rf) subject to w'1 = 1
        
        # Simple approach: Use mean-variance optimization for tangency
        risk_aversion = 1.0  # We'll find optimal
        
        # For tangency portfolio: solve for weights that maximize Sharpe ratio
        # Method: Set target return constraint and minimize variance
        
        # Let's use a different approach: Calculate tangency portfolio directly
        # w_tangency = Σ^(-1) * (μ - rf*1) / 1'Σ^(-1)(μ - rf*1)
        
        try:
            cov_inv = np.linalg.inv(cov)
            excess_return = mu - request.rf
            
            # Tangency weights (with shorting allowed initially)
            w_tangency_raw = cov_inv @ excess_return
            
            # Now apply constraints
            w = cp.Variable(n_assets)
            
            # If we need to match the tangency direction but apply constraints
            # Let's just optimize with constraints
            
            # Objective: Maximize Sharpe = max (w'mu - rf) / sqrt(w'Σw)
            # Equivalent: max w'mu subject to w'Σw <= 1, w'1 = 1 (or other constraints)
            
            # Better: Minimize variance for a target return, then find best Sharpe
            # Let's generate frontier by varying target returns
            
            # First, find the min and max possible returns with constraints
            # Min variance portfolio
            w_min = cp.Variable(n_assets)
            objective_min = cp.Minimize(cp.quad_form(w_min, cov))
            constraints_min = [cp.sum(w_min) == 1]
            if not request.allow_short:
                constraints_min.append(w_min >= 0)
            if request.max_weight < 1.0:
                constraints_min.append(w_min <= request.max_weight)
            
            prob_min = cp.Problem(objective_min, constraints_min)
            prob_min.solve(solver=cp.OSQP)
            
            if prob_min.status != 'optimal':
                raise Exception(f"Min variance optimization failed: {prob_min.status}")
            
            min_return = float(mu @ w_min.value)
            min_risk = float(np.sqrt(w_min.value @ cov @ w_min.value))
            
            # Max return portfolio (put all in highest return asset, respecting constraints)
            w_max = cp.Variable(n_assets)
            objective_max = cp.Maximize(mu @ w_max)
            constraints_max = [cp.sum(w_max) == 1]
            if not request.allow_short:
                constraints_max.append(w_max >= 0)
            if request.max_weight < 1.0:
                constraints_max.append(w_max <= request.max_weight)
            
            prob_max = cp.Problem(objective_max, constraints_max)
            prob_max.solve(solver=cp.OSQP)
            
            if prob_max.status != 'optimal':
                raise Exception(f"Max return optimization failed: {prob_max.status}")
            
            max_return = float(mu @ w_max.value)
            
            # Generate frontier points
            frontier_points = []
            num_points = 50
            
            # Make sure we have a reasonable range
            if min_return >= max_return:
                max_return = min_return * 1.5
            
            target_returns = np.linspace(min_return * 0.95, max_return * 1.05, num_points)
            
            for target_return in target_returns:
                w = cp.Variable(n_assets)
                objective = cp.Minimize(cp.quad_form(w, cov))
                constraints = [
                    cp.sum(w) == 1,
                    mu @ w >= target_return  # Use >= instead of == for stability
                ]
                
                if not request.allow_short:
                    constraints.append(w >= 0)
                
                if request.max_weight < 1.0:
                    constraints.append(w <= request.max_weight)
                
                problem = cp.Problem(objective, constraints)
                problem.solve(solver=cp.OSQP)
                
                if problem.status == 'optimal' and w.value is not None:
                    weights_dict = {ticker: float(w.value[i]) for i, ticker in enumerate(tickers)}
                    actual_return = float(mu @ w.value)
                    actual_risk = float(np.sqrt(w.value @ cov @ w.value))
                    
                    if actual_risk > 0:  # Only add valid points
                        frontier_points.append(EfficientFrontierPoint(
                            risk=actual_risk,
                            return_=actual_return,
                            weights=weights_dict
                        ))
            
            # Find tangency portfolio (max Sharpe ratio)
            tangency = None
            max_sharpe = -np.inf
            
            for point in frontier_points:
                if point.risk > 0:
                    sharpe = (point.return_ - request.rf) / point.risk
                    if sharpe > max_sharpe:
                        max_sharpe = sharpe
                        tangency = TangencyPortfolio(
                            risk=point.risk,
                            return_=point.return_,
                            sharpe=sharpe,
                            weights=point.weights
                        )
            
            # If no tangency found, use min variance portfolio
            if tangency is None:
                min_var_return = float(mu @ w_min.value)
                min_var_risk = float(np.sqrt(w_min.value @ cov @ w_min.value))
                min_var_sharpe = (min_var_return - request.rf) / min_var_risk if min_var_risk > 0 else 0
                
                tangency = TangencyPortfolio(
                    risk=min_var_risk,
                    return_=min_var_return,
                    sharpe=min_var_sharpe,
                    weights={ticker: float(w_min.value[i]) for i, ticker in enumerate(tickers)}
                )
            
            # Calculate Capital Market Line
            cml_points = []
            if tangency and tangency.risk > 0:
                max_risk = max([p.risk for p in frontier_points]) * 1.5 if frontier_points else tangency.risk * 2
                for risk in np.linspace(0, max_risk, 50):
                    cml_return = request.rf + (tangency.return_ - request.rf) / tangency.risk * risk
                    cml_points.append(CMLPoint(risk=float(risk), return_=float(cml_return)))
            
            return EfficientFrontierResponse(
                frontier=frontier_points,
                tangency=tangency,
                cml=cml_points
            )
        
        except np.linalg.LinAlgError:
            # If matrix inversion fails, use simpler equal-weight portfolio
            weights = np.ones(n_assets) / n_assets
            port_return = float(mu @ weights)
            port_risk = float(np.sqrt(weights @ cov @ weights))
            port_sharpe = (port_return - request.rf) / port_risk if port_risk > 0 else 0
            
            tangency = TangencyPortfolio(
                risk=port_risk,
                return_=port_return,
                sharpe=port_sharpe,
                weights={ticker: float(weights[i]) for i, ticker in enumerate(tickers)}
            )
            
            return EfficientFrontierResponse(
                frontier=[],
                tangency=tangency,
                cml=[]
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating efficient frontier: {str(e)}")
