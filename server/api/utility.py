import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Tuple

router = APIRouter()

class UtilityPoint(BaseModel):
    x: float
    U: float

class UtilityPrimePoint(BaseModel):
    x: float
    Uprime: float

class UtilityRequest(BaseModel):
    type: str  # "CRRA", "CARA", or "DARA"
    gamma: float
    x_range: Optional[Tuple[float, float]] = None

class UtilityResponse(BaseModel):
    pointsU: List[UtilityPoint]
    pointsUPrime: List[UtilityPrimePoint]
    notes: str

def crra_utility(x: float, gamma: float) -> float:
    """CRRA utility: U(x) = x^(1-γ) / (1-γ)"""
    if gamma == 1:
        return np.log(x)
    return (x ** (1 - gamma)) / (1 - gamma)

def crra_marginal(x: float, gamma: float) -> float:
    """CRRA marginal utility: U'(x) = x^(-γ)"""
    return x ** (-gamma)

def cara_utility(x: float, gamma: float) -> float:
    """CARA utility: U(x) = -exp(-γx)"""
    return -np.exp(-gamma * x)

def cara_marginal(x: float, gamma: float) -> float:
    """CARA marginal utility: U'(x) = γ * exp(-γx)"""
    return gamma * np.exp(-gamma * x)

def dara_utility(x: float, gamma: float = None) -> float:
    """DARA utility: U(x) = ln(x)"""
    return np.log(x)

def dara_marginal(x: float, gamma: float = None) -> float:
    """DARA marginal utility: U'(x) = 1/x"""
    return 1 / x

@router.post("/utility/sdf", response_model=UtilityResponse)
async def calculate_utility(request: UtilityRequest):
    try:
        # Determine x range
        if request.x_range:
            x_min, x_max = request.x_range
        else:
            if request.type in ["CRRA", "DARA"]:
                x_min, x_max = 0.1, 10
            else:  # CARA
                x_min, x_max = -5, 5
        
        # Generate x values
        x_values = np.linspace(x_min, x_max, 100)
        
        # Calculate utility and marginal utility based on type
        points_u = []
        points_uprime = []
        
        if request.type == "CRRA":
            for x in x_values:
                if x > 0:
                    u = crra_utility(x, request.gamma)
                    uprime = crra_marginal(x, request.gamma)
                    points_u.append(UtilityPoint(x=float(x), U=float(u)))
                    points_uprime.append(UtilityPrimePoint(x=float(x), Uprime=float(uprime)))
            
            notes = f"CRRA utility with γ={request.gamma:.2f}. Constant relative risk aversion. "
            notes += "Higher γ indicates greater risk aversion. "
            notes += f"Risk aversion: RRA = {request.gamma:.2f}"
        
        elif request.type == "CARA":
            for x in x_values:
                u = cara_utility(x, request.gamma)
                uprime = cara_marginal(x, request.gamma)
                points_u.append(UtilityPoint(x=float(x), U=float(u)))
                points_uprime.append(UtilityPrimePoint(x=float(x), Uprime=float(uprime)))
            
            notes = f"CARA utility with γ={request.gamma:.2f}. Constant absolute risk aversion. "
            notes += "Risk aversion constant regardless of wealth level. "
            notes += f"Absolute risk aversion: ARA = {request.gamma:.2f}"
        
        elif request.type == "DARA":
            for x in x_values:
                if x > 0:
                    u = dara_utility(x)
                    uprime = dara_marginal(x)
                    points_u.append(UtilityPoint(x=float(x), U=float(u)))
                    points_uprime.append(UtilityPrimePoint(x=float(x), Uprime=float(uprime)))
            
            notes = "DARA utility: U(x) = ln(x). Decreasing absolute risk aversion. "
            notes += "Wealthier individuals are less risk-averse in absolute terms. "
            notes += "Common assumption in asset pricing models."
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown utility type: {request.type}")
        
        # Add SDF interpretation
        notes += " SDF: m_{t+1} = U'(c_{t+1}) / U'(c_t). "
        notes += "Prices assets based on marginal utility of future consumption."
        
        return UtilityResponse(
            pointsU=points_u,
            pointsUPrime=points_uprime,
            notes=notes
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating utility: {str(e)}")
