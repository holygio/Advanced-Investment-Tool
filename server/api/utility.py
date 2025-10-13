import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Literal

router = APIRouter()

# Request/Response Models
class UtilityRequest(BaseModel):
    utility_type: Literal["CRRA", "CARA", "DARA"]
    gamma: float = 3.0  # Risk aversion for CRRA
    b: float = 0.001    # Risk aversion for CARA
    x_min: float = 0.1
    x_max: float = 10.0
    n_points: int = 100

class UtilityCurvePoint(BaseModel):
    x: float
    U: float
    U_prime: float
    A: float  # Absolute risk aversion
    R: float  # Relative risk aversion

class UtilityResponse(BaseModel):
    utility_type: str
    gamma: float
    b: float
    curves: List[UtilityCurvePoint]

class SDFRequest(BaseModel):
    utility_type: Literal["CRRA", "CARA", "CAPM"]
    gamma: float = 3.0
    b: float = 0.001
    beta: float = 0.99
    n_points: int = 100

class SDFPoint(BaseModel):
    delta_c: float  # Consumption growth
    m: float        # SDF value

class SDFResponse(BaseModel):
    utility_type: str
    sdf_points: List[SDFPoint]
    interpretation: str

@router.post("/utility/curves", response_model=UtilityResponse)
async def calculate_utility_curves(request: UtilityRequest):
    """Calculate utility function, marginal utility, and risk aversion measures"""
    try:
        x = np.linspace(request.x_min, request.x_max, request.n_points)
        x = x[x > 0]  # Ensure positive values
        
        curves = []
        U = np.zeros_like(x)
        U_prime = np.zeros_like(x)
        A = np.zeros_like(x)
        R = np.zeros_like(x)
        
        if request.utility_type == "CRRA":
            # CRRA: U(x) = (x^(1-γ) - 1) / (1 - γ) for γ ≠ 1, log(x) for γ = 1
            if abs(request.gamma - 1.0) < 1e-6:
                U = np.log(x)
                U_prime = 1 / x
            else:
                U = (x**(1 - request.gamma) - 1) / (1 - request.gamma)
                U_prime = x**(-request.gamma)
            
            A = request.gamma / x  # Absolute risk aversion: -U''/U' = γ/x
            R = np.full_like(x, request.gamma)  # Constant relative risk aversion
            
        elif request.utility_type == "CARA":
            # CARA: U(x) = -exp(-bx)
            U = -np.exp(-request.b * x)
            U_prime = request.b * np.exp(-request.b * x)
            A = np.full_like(x, request.b)  # Constant absolute risk aversion
            R = request.b * x  # Relative risk aversion increases with x
            
        elif request.utility_type == "DARA":
            # DARA: Custom logarithmic form with decreasing absolute risk aversion
            # U(x) = log(x) - 0.5*log(1 + log(x)^2)
            log_x = np.log(x)
            U = log_x - 0.5 * np.log(1 + log_x**2)
            U_prime = 1 / (x * (1 + log_x**2))
            # Absolute risk aversion decreases with x
            A = 1 / (x * (1 + log_x))
            # Relative risk aversion also decreases
            R = 1 / (1 + log_x)
        
        for i in range(len(x)):
            curves.append(UtilityCurvePoint(
                x=float(x[i]),
                U=float(U[i]),
                U_prime=float(U_prime[i]),
                A=float(A[i]),
                R=float(R[i])
            ))
        
        return UtilityResponse(
            utility_type=request.utility_type,
            gamma=request.gamma,
            b=request.b,
            curves=curves
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating utility curves: {str(e)}")

@router.post("/utility/sdf", response_model=SDFResponse)
async def calculate_sdf(request: SDFRequest):
    """Calculate Stochastic Discount Factor for different utility specifications"""
    try:
        # Consumption growth grid: -10% to +10%
        delta_c = np.linspace(-0.10, 0.10, request.n_points)
        g = 1 + delta_c  # Gross growth rate
        
        sdf_points = []
        m = np.zeros_like(delta_c)
        interpretation = ""
        
        if request.utility_type == "CRRA":
            # SDF = β * (C_{t+1}/C_t)^(-γ) = β * g^(-γ)
            m = request.beta * g**(-request.gamma)
            interpretation = (
                f"CRRA SDF with γ={request.gamma:.2f}: Higher consumption growth reduces SDF (states with high "
                f"consumption are less valuable). The convex shape shows risk aversion - downside states get "
                f"exponentially higher weights."
            )
            
        elif request.utility_type == "CARA":
            # SDF ≈ β * exp(-b * ΔC) for CARA utility
            m = request.beta * np.exp(-request.b * delta_c * 100)  # Scale for visibility
            interpretation = (
                f"CARA SDF with b={request.b:.4f}: Exponentially declining with consumption growth. "
                f"Constant absolute risk aversion means SDF slope is independent of wealth level."
            )
            
        elif request.utility_type == "CAPM":
            # Linear CAPM SDF: m = a + b*R_m (affine in market return)
            # Approximation: m ≈ 1 - γ*delta_c
            m = 1 - 3 * delta_c  # Using γ=3 as typical
            interpretation = (
                "CAPM linear SDF: Simplified affine form m = a + b*R_m. This is a first-order "
                "approximation to CRRA. The linear relationship makes asset pricing tractable but "
                "misses higher-order risk aversion effects."
            )
        
        for i in range(len(delta_c)):
            sdf_points.append(SDFPoint(
                delta_c=float(delta_c[i]),
                m=float(m[i])
            ))
        
        return SDFResponse(
            utility_type=request.utility_type,
            sdf_points=sdf_points,
            interpretation=interpretation
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating SDF: {str(e)}")
