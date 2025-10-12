import numpy as np
import pandas as pd
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional

router = APIRouter()

class CAPMWorldRequest(BaseModel):
    num_assets: int = 25
    sample_length: int = 120
    rf: float = 0.02
    mu_market: float = 0.06
    sigma_market: float = 0.16
    beta_dispersion: float = 0.4
    idio_vol_min: float = 0.10
    idio_vol_max: float = 0.25
    seed: int = 42

class AssetReturn(BaseModel):
    ticker: str
    returns: List[float]
    true_beta: float
    
class MarketReturn(BaseModel):
    returns: List[float]

class CAPMWorldResponse(BaseModel):
    assets: List[AssetReturn]
    market: MarketReturn
    rf_monthly: float
    dates: List[str]

@router.post("/theory/capm-world", response_model=CAPMWorldResponse)
async def generate_capm_world(request: CAPMWorldRequest):
    """
    Generate a CAPM world with known betas and market factor.
    Returns synthetic asset returns that follow CAPM perfectly.
    """
    np.random.seed(request.seed)
    T = request.sample_length
    K = request.num_assets
    
    # Monthly parameters
    rf_monthly = request.rf / 12
    mu_market_monthly = request.mu_market / 12
    sigma_market_monthly = request.sigma_market / np.sqrt(12)
    
    # Generate market factor
    market_returns = np.random.normal(mu_market_monthly, sigma_market_monthly, T)
    
    # Generate true betas
    true_betas = np.random.normal(1.0, request.beta_dispersion, K)
    
    # Generate idiosyncratic volatilities
    idio_vols = np.random.uniform(
        request.idio_vol_min / np.sqrt(12),
        request.idio_vol_max / np.sqrt(12),
        K
    )
    
    # Generate asset returns following CAPM
    assets = []
    for i in range(K):
        # r_i,t = rf + beta_i * f_M,t + epsilon_i,t
        epsilon = np.random.normal(0, idio_vols[i], T)
        returns = rf_monthly + true_betas[i] * market_returns + epsilon
        
        assets.append(AssetReturn(
            ticker=f"Asset_{i+1}",
            returns=returns.tolist(),
            true_beta=float(true_betas[i])
        ))
    
    # Generate dates (monthly)
    dates = pd.date_range(start='2020-01-01', periods=T, freq='M').strftime('%Y-%m-%d').tolist()
    
    return CAPMWorldResponse(
        assets=assets,
        market=MarketReturn(returns=market_returns.tolist()),
        rf_monthly=rf_monthly,
        dates=dates
    )


class FFWorldRequest(BaseModel):
    num_assets: int = 25
    sample_length: int = 240
    rf: float = 0.02
    factor_means: Dict[str, float] = {
        "MKT": 0.06,
        "SMB": 0.02,
        "HML": 0.03,
        "RMW": 0.02,
        "CMA": 0.02
    }
    include_factors: List[str] = ["MKT", "SMB", "HML"]
    seed: int = 43

class FactorData(BaseModel):
    name: str
    returns: List[float]

class FFAssetReturn(BaseModel):
    ticker: str
    returns: List[float]
    true_betas: Dict[str, float]

class FFWorldResponse(BaseModel):
    assets: List[FFAssetReturn]
    factors: List[FactorData]
    rf_monthly: float
    dates: List[str]

@router.post("/theory/ff-world", response_model=FFWorldResponse)
async def generate_ff_world(request: FFWorldRequest):
    """
    Generate a Fama-French multi-factor world.
    """
    np.random.seed(request.seed)
    T = request.sample_length
    K = request.num_assets
    
    rf_monthly = request.rf / 12
    
    # Generate factor returns
    num_factors = len(request.include_factors)
    
    # Create correlation matrix for factors (moderate correlation)
    factor_corr = np.eye(num_factors)
    for i in range(num_factors):
        for j in range(i+1, num_factors):
            factor_corr[i,j] = factor_corr[j,i] = 0.3
    
    # Convert to covariance
    factor_means = np.array([request.factor_means[f] / 12 for f in request.include_factors])
    factor_vols = np.array([0.16 / np.sqrt(12) if f == "MKT" else 0.10 / np.sqrt(12) for f in request.include_factors])
    factor_cov = np.outer(factor_vols, factor_vols) * factor_corr
    
    # Generate factor returns
    factor_returns = np.random.multivariate_normal(factor_means, factor_cov, T)
    
    factors = []
    for idx, name in enumerate(request.include_factors):
        factors.append(FactorData(
            name=name,
            returns=factor_returns[:, idx].tolist()
        ))
    
    # Generate asset betas
    assets = []
    for i in range(K):
        # Create realistic beta patterns
        if "MKT" in request.include_factors:
            market_beta = np.random.normal(1.0, 0.4)
        else:
            market_beta = 0
            
        if "SMB" in request.include_factors:
            smb_beta = np.random.normal(0, 0.5)
        else:
            smb_beta = 0
            
        if "HML" in request.include_factors:
            hml_beta = np.random.normal(0, 0.5)
        else:
            hml_beta = 0
        
        betas = []
        beta_dict = {}
        for idx, name in enumerate(request.include_factors):
            if name == "MKT":
                betas.append(market_beta)
                beta_dict["MKT"] = float(market_beta)
            elif name == "SMB":
                betas.append(smb_beta)
                beta_dict["SMB"] = float(smb_beta)
            elif name == "HML":
                betas.append(hml_beta)
                beta_dict["HML"] = float(hml_beta)
            else:
                b = np.random.normal(0, 0.3)
                betas.append(b)
                beta_dict[name] = float(b)
        
        # Generate returns
        epsilon = np.random.normal(0, 0.05 / np.sqrt(12), T)
        returns = rf_monthly + factor_returns @ np.array(betas) + epsilon
        
        assets.append(FFAssetReturn(
            ticker=f"Asset_{i+1}",
            returns=returns.tolist(),
            true_betas=beta_dict
        ))
    
    dates = pd.date_range(start='2020-01-01', periods=T, freq='M').strftime('%Y-%m-%d').tolist()
    
    return FFWorldResponse(
        assets=assets,
        factors=factors,
        rf_monthly=rf_monthly,
        dates=dates
    )
