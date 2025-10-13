import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Literal

router = APIRouter()

# Theory Mode Request/Response Models
class TheoryUtilityRequest(BaseModel):
    utility: Literal["CRRA", "CARA", "DARA"]
    gamma: float = 3.0
    beta: float = 0.99
    wealth_min: float = 1.0
    wealth_max: float = 100.0
    sigma_c: float = 0.02
    rho: float = -0.3
    seed: int = 42

class TheoryUtilityResponse(BaseModel):
    wealth: List[float]
    U: List[float]
    Uprime: List[float]
    A: List[float]
    R: List[float]
    SDF_utility: List[float]
    SDF_capm: List[float]
    consumption_growth: List[float]
    market_returns: List[float]
    pricing_errors: List[float]
    mean_sdf: float
    std_sdf: float
    mean_pricing_error: float

@router.post("/theory/utility/generate", response_model=TheoryUtilityResponse)
async def generate_theory_utility(request: TheoryUtilityRequest):
    """
    Generate synthetic utility and SDF data for pedagogical exploration.
    Uses corrected formulas and simulates consumption paths.
    """
    try:
        np.random.seed(request.seed)
        
        # Wealth grid for utility curves
        wealth = np.linspace(request.wealth_min, request.wealth_max, 100)
        
        # CARA parameter (if needed)
        b = request.gamma / 50  # Scale for CARA
        # DARA parameter
        a = 10.0  # Shift parameter for DARA
        
        # Calculate utility functions
        if request.utility == "CARA":
            # CARA: U(x) = -e^(-bx) / b
            U = -np.exp(-b * wealth) / b
            Uprime = np.exp(-b * wealth)
            # A(x) = b (constant)
            A = np.full_like(wealth, b)
            # R(x) = b*x (increasing)
            R = b * wealth
            
        elif request.utility == "CRRA":
            # CRRA: U(x) = x^(1-γ) / (1-γ)
            if abs(request.gamma - 1.0) < 1e-6:
                U = np.log(wealth)
                Uprime = 1 / wealth
            else:
                U = wealth**(1 - request.gamma) / (1 - request.gamma)
                Uprime = wealth**(-request.gamma)
            # A(x) = γ / x (decreasing)
            A = request.gamma / wealth
            # R(x) = γ (constant)
            R = np.full_like(wealth, request.gamma)
            
        elif request.utility == "DARA":
            # DARA: U(x) = (a+x)^(1-γ) / (1-γ)
            if abs(request.gamma - 1.0) < 1e-6:
                U = np.log(a + wealth)
                Uprime = 1 / (a + wealth)
            else:
                U = (a + wealth)**(1 - request.gamma) / (1 - request.gamma)
                Uprime = (a + wealth)**(-request.gamma)
            # A(x) = γ / (a+x) (decreasing)
            A = request.gamma / (a + wealth)
            # R(x) = γ*x / (a+x) (increasing but bounded)
            R = request.gamma * wealth / (a + wealth)
        
        # Simulate 240 months of consumption growth
        n_months = 240
        
        # Generate correlated consumption growth and market returns
        mean_c = 0.002
        mean_rm = 0.005
        std_rm = 0.04
        
        # Create correlation matrix
        cov_matrix = np.array([
            [request.sigma_c**2, request.rho * request.sigma_c * std_rm],
            [request.rho * request.sigma_c * std_rm, std_rm**2]
        ])
        
        # Generate correlated random variables
        samples = np.random.multivariate_normal(
            [mean_c, mean_rm], 
            cov_matrix, 
            n_months
        )
        
        consumption_growth = samples[:, 0]
        market_returns = samples[:, 1]
        
        # Initialize consumption level (start at 1)
        c = np.zeros(n_months + 1)
        c[0] = 1.0
        for t in range(n_months):
            c[t + 1] = c[t] * (1 + consumption_growth[t])
        
        # Calculate SDF from utility theory
        SDF_utility = np.zeros(n_months)
        for t in range(n_months):
            if request.utility == "CARA":
                SDF_utility[t] = request.beta * np.exp(-b * c[t + 1]) / np.exp(-b * c[t])
            elif request.utility == "CRRA":
                if abs(request.gamma - 1.0) < 1e-6:
                    SDF_utility[t] = request.beta * (c[t] / c[t + 1])
                else:
                    SDF_utility[t] = request.beta * (c[t + 1] / c[t])**(-request.gamma)
            elif request.utility == "DARA":
                if abs(request.gamma - 1.0) < 1e-6:
                    SDF_utility[t] = request.beta * ((a + c[t]) / (a + c[t + 1]))
                else:
                    SDF_utility[t] = request.beta * ((a + c[t + 1]) / (a + c[t]))**(-request.gamma)
        
        # Normalize E[m] = 1
        SDF_utility = SDF_utility / np.mean(SDF_utility)
        
        # CAPM linear SDF: m = a - b*R_m
        # Calibrate to match E[m] = 1 and approximate variance
        # m = a - b*R_m, E[m] = 1 => a - b*E[R_m] = 1
        # Choose b to match some risk price
        b_capm = request.gamma * request.rho * request.sigma_c / std_rm
        a_capm = 1 + b_capm * mean_rm
        
        SDF_capm = a_capm - b_capm * market_returns
        
        # Calculate pricing errors: 1 - E[m*R]
        pricing_errors = np.zeros(n_months)
        for t in range(n_months):
            pricing_errors[t] = 1 - SDF_utility[t] * (1 + market_returns[t])
        
        # Calculate statistics
        mean_sdf = float(np.mean(SDF_utility))
        std_sdf = float(np.std(SDF_utility))
        mean_pricing_error = float(np.mean(np.abs(pricing_errors)))
        
        return TheoryUtilityResponse(
            wealth=wealth.tolist(),
            U=U.tolist(),
            Uprime=Uprime.tolist(),
            A=A.tolist(),
            R=R.tolist(),
            SDF_utility=SDF_utility.tolist(),
            SDF_capm=SDF_capm.tolist(),
            consumption_growth=consumption_growth.tolist(),
            market_returns=market_returns.tolist(),
            pricing_errors=pricing_errors.tolist(),
            mean_sdf=mean_sdf,
            std_sdf=std_sdf,
            mean_pricing_error=mean_pricing_error
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating utility theory data: {str(e)}")
