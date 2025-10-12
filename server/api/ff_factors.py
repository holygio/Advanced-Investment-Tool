import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import statsmodels.api as sm
from scipy import stats
import os

router = APIRouter()

# ============================================================================
# Data Models
# ============================================================================

class FactorDataPoint(BaseModel):
    date: str
    Mkt_RF: float = Field(alias="Mkt-RF")
    SMB: float
    HML: float
    RF: float
    RMW: Optional[float] = None
    CMA: Optional[float] = None

    class Config:
        populate_by_name = True

class DescriptiveStats(BaseModel):
    factor: str
    mean: float
    std: float
    min: float
    max: float

class CorrelationMatrix(BaseModel):
    factors: List[str]
    matrix: List[List[float]]

class FactorDataResponse(BaseModel):
    ff3: List[FactorDataPoint]
    ff5: List[FactorDataPoint]
    descriptive_stats_ff3: List[DescriptiveStats]
    descriptive_stats_ff5: List[DescriptiveStats]
    correlation_ff3: CorrelationMatrix
    correlation_ff5: CorrelationMatrix

class PortfolioReturn(BaseModel):
    date: str
    ret: float

class RegressionResult(BaseModel):
    portfolio_name: str
    alpha: float
    alpha_tstat: float
    alpha_pval: float
    beta_mkt: float
    beta_mkt_tstat: float
    beta_smb: float
    beta_smb_tstat: float
    beta_hml: float
    beta_hml_tstat: float
    beta_rmw: Optional[float] = None
    beta_rmw_tstat: Optional[float] = None
    beta_cma: Optional[float] = None
    beta_cma_tstat: Optional[float] = None
    r_squared: float
    adj_r_squared: float

class FactorAnalysisRequest(BaseModel):
    portfolios: Dict[str, List[PortfolioReturn]]
    model: str  # "FF3" or "FF5"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class FactorAnalysisResponse(BaseModel):
    model: str
    regressions: List[RegressionResult]
    avg_r_squared: float
    avg_adj_r_squared: float
    num_significant_alphas: int

class GRSTestRequest(BaseModel):
    portfolios: Dict[str, List[PortfolioReturn]]
    model: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class GRSTestResponse(BaseModel):
    model: str
    grs_statistic: float
    p_value: float
    num_portfolios: int
    num_observations: int
    interpretation: str

# ============================================================================
# Data Loading Functions
# ============================================================================

def load_ff3_data() -> pd.DataFrame:
    """Load Fama-French 3-factor data from CSV"""
    try:
        file_path = os.path.join(os.path.dirname(__file__), "..", "data", "factors", "ff3_factors.csv")
        
        # Read CSV, skip header rows
        df = pd.read_csv(file_path, skiprows=4)
        
        # First column is date (unnamed)
        df.columns = ['Date', 'Mkt-RF', 'SMB', 'HML', 'RF']
        
        # Filter out non-numeric date rows (like "Annual Factors" separator)
        df = df[df['Date'].astype(str).str.match(r'^\d{6}$', na=False)]
        
        # Convert date to YYYYMM format then to datetime
        df['Date'] = pd.to_datetime(df['Date'].astype(str), format='%Y%m')
        
        # Convert percentages to decimals
        for col in ['Mkt-RF', 'SMB', 'HML', 'RF']:
            df[col] = df[col].astype(float) / 100.0
        
        # Remove any rows with all NaN values
        df = df.dropna(how='all', subset=['Mkt-RF', 'SMB', 'HML', 'RF'])
        
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading FF3 data: {str(e)}")

def load_ff5_data() -> pd.DataFrame:
    """Load Fama-French 5-factor data from CSV"""
    try:
        file_path = os.path.join(os.path.dirname(__file__), "..", "data", "factors", "ff5_factors.csv")
        
        # Read CSV, skip header rows
        df = pd.read_csv(file_path, skiprows=3)
        
        # First column is date (unnamed)
        df.columns = ['Date', 'Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF']
        
        # Filter out non-numeric date rows (like "Annual Factors" separator)
        df = df[df['Date'].astype(str).str.match(r'^\d{6}$', na=False)]
        
        # Convert date to YYYYMM format then to datetime
        df['Date'] = pd.to_datetime(df['Date'].astype(str), format='%Y%m')
        
        # Convert percentages to decimals
        for col in ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF']:
            df[col] = df[col].astype(float) / 100.0
        
        # Remove any rows with all NaN values
        df = df.dropna(how='all', subset=['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF'])
        
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading FF5 data: {str(e)}")

# ============================================================================
# Analysis Functions
# ============================================================================

def compute_descriptive_stats(df: pd.DataFrame, factors: List[str]) -> List[DescriptiveStats]:
    """Compute descriptive statistics for factors"""
    stats_list = []
    for factor in factors:
        if factor in df.columns:
            stats_list.append(DescriptiveStats(
                factor=factor,
                mean=float(df[factor].mean()),
                std=float(df[factor].std()),
                min=float(df[factor].min()),
                max=float(df[factor].max())
            ))
    return stats_list

def compute_correlation_matrix(df: pd.DataFrame, factors: List[str]) -> CorrelationMatrix:
    """Compute correlation matrix for factors"""
    corr_df = df[factors].corr()
    return CorrelationMatrix(
        factors=factors,
        matrix=corr_df.values.tolist()
    )

def run_factor_regression(
    portfolio_returns: pd.Series,
    factor_returns: pd.DataFrame,
    model: str
) -> RegressionResult:
    """Run factor regression for a single portfolio"""
    
    # Select factors based on model
    if model == "FF3":
        factor_cols = ['Mkt-RF', 'SMB', 'HML']
    else:  # FF5
        factor_cols = ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA']
    
    # Normalize portfolio dates to first of month for alignment with FF data
    normalized_index = pd.DatetimeIndex([pd.Timestamp(d.year, d.month, 1) for d in portfolio_returns.index])
    normalized_portfolio = pd.Series(portfolio_returns.values, index=normalized_index)
    
    # Align data including RF
    merged = pd.DataFrame({
        'portfolio': normalized_portfolio,
        'RF': factor_returns['RF'],
        **{col: factor_returns[col] for col in factor_cols}
    }).dropna()
    
    # Compute excess returns by subtracting time-varying RF
    excess_returns = merged['portfolio'] - merged['RF']
    
    # Prepare regression with excess returns
    y = excess_returns.values
    X = merged[factor_cols].values
    X_with_const = sm.add_constant(X)
    
    # Run OLS
    model_ols = sm.OLS(y, X_with_const).fit()
    
    # Extract results
    alpha = float(model_ols.params[0])
    alpha_tstat = float(model_ols.tvalues[0])
    alpha_pval = float(model_ols.pvalues[0])
    
    result = RegressionResult(
        portfolio_name="",  # Will be set by caller
        alpha=alpha,
        alpha_tstat=alpha_tstat,
        alpha_pval=alpha_pval,
        beta_mkt=float(model_ols.params[1]),
        beta_mkt_tstat=float(model_ols.tvalues[1]),
        beta_smb=float(model_ols.params[2]),
        beta_smb_tstat=float(model_ols.tvalues[2]),
        beta_hml=float(model_ols.params[3]),
        beta_hml_tstat=float(model_ols.tvalues[3]),
        r_squared=float(model_ols.rsquared),
        adj_r_squared=float(model_ols.rsquared_adj)
    )
    
    # Add FF5 specific factors
    if model == "FF5":
        result.beta_rmw = float(model_ols.params[4])
        result.beta_rmw_tstat = float(model_ols.tvalues[4])
        result.beta_cma = float(model_ols.params[5])
        result.beta_cma_tstat = float(model_ols.tvalues[5])
    
    return result

def compute_grs_test(
    portfolio_returns_dict: Dict[str, pd.Series],
    factor_returns: pd.DataFrame,
    model: str
) -> tuple:
    """
    Compute GRS test statistic for joint significance of alphas
    
    GRS = (T/N) * ((T-N-K)/(N*(K+1))) * (α'Σ^-1α) / (1 + μ_f'Σ_f^-1μ_f)
    
    Where:
    - T = number of time periods
    - N = number of portfolios
    - K = number of factors
    - α = vector of alphas
    - Σ = covariance matrix of residuals
    - μ_f = mean of factors
    - Σ_f = covariance matrix of factors
    """
    
    # Select factors based on model
    if model == "FF3":
        factor_cols = ['Mkt-RF', 'SMB', 'HML']
    else:  # FF5
        factor_cols = ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA']
    
    K = len(factor_cols)
    N = len(portfolio_returns_dict)
    
    # Normalize all dates to first of month for alignment
    # Portfolio returns might have end-of-month dates, but FF data is always first of month
    normalized_returns = {}
    for name, series in portfolio_returns_dict.items():
        # Create a new series with normalized dates (first of month)
        normalized_index = pd.DatetimeIndex([pd.Timestamp(d.year, d.month, 1) for d in series.index])
        normalized_returns[name] = pd.Series(series.values, index=normalized_index)
    
    # Align all portfolio returns with factors (including RF)
    all_returns = pd.DataFrame(normalized_returns)
    merged = all_returns.join(factor_returns[factor_cols + ['RF']], how='inner').dropna()
    
    T = len(merged)
    
    # Check if we have enough data
    if T == 0:
        raise HTTPException(
            status_code=400, 
            detail="No overlapping dates between portfolio and factor data after alignment"
        )
    
    # Need at least N + K + 1 observations for GRS test
    min_obs = N + K + 1
    if T < min_obs:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data for GRS test. Need at least {min_obs} observations, but have {T}"
        )
    
    # Compute excess returns for all portfolios by subtracting time-varying RF
    portfolio_data = merged[list(portfolio_returns_dict.keys())].subtract(merged['RF'], axis=0)
    factor_data = merged[factor_cols]
    
    # Run regressions and collect alphas and residuals
    alphas = []
    residuals = []
    
    for portfolio in portfolio_data.columns:
        y = portfolio_data[portfolio].values
        X = sm.add_constant(factor_data.values)
        model_ols = sm.OLS(y, X).fit()
        
        alphas.append(model_ols.params[0])
        residuals.append(model_ols.resid)
    
    alphas = np.array(alphas)
    residuals = np.array(residuals).T
    
    # Compute covariance matrix of residuals
    Sigma = np.cov(residuals.T)
    
    # Compute factor statistics
    mu_f = factor_data.mean().values
    Sigma_f = factor_data.cov().values
    
    # GRS statistic
    try:
        Sigma_inv = np.linalg.inv(Sigma)
        Sigma_f_inv = np.linalg.inv(Sigma_f)
        
        numerator = alphas @ Sigma_inv @ alphas
        denominator = 1 + mu_f @ Sigma_f_inv @ mu_f
        
        grs_stat = (T / N) * ((T - N - K) / (N * (K + 1))) * (numerator / denominator)
        
        # Compute p-value from F-distribution
        # GRS ~ F(N, T-N-K)
        p_value = 1 - stats.f.cdf(grs_stat, N, T - N - K)
        
        return grs_stat, p_value, T
        
    except np.linalg.LinAlgError:
        raise HTTPException(status_code=500, detail="Singular matrix in GRS computation")

# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/ff/data", response_model=FactorDataResponse)
async def get_factor_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get Fama-French factor data with descriptive statistics"""
    try:
        # Load data
        ff3_df = load_ff3_data()
        ff5_df = load_ff5_data()
        
        # Filter by date if provided
        if start_date:
            start = pd.to_datetime(start_date)
            ff3_df = ff3_df[ff3_df['Date'] >= start]
            ff5_df = ff5_df[ff5_df['Date'] >= start]
        
        if end_date:
            end = pd.to_datetime(end_date)
            ff3_df = ff3_df[ff3_df['Date'] <= end]
            ff5_df = ff5_df[ff5_df['Date'] <= end]
        
        # Convert to response format
        ff3_data = []
        for _, row in ff3_df.iterrows():
            ff3_data.append(FactorDataPoint(
                date=row['Date'].strftime('%Y-%m-%d'),
                **{'Mkt-RF': row['Mkt-RF'], 'SMB': row['SMB'], 'HML': row['HML'], 'RF': row['RF']}
            ))
        
        ff5_data = []
        for _, row in ff5_df.iterrows():
            ff5_data.append(FactorDataPoint(
                date=row['Date'].strftime('%Y-%m-%d'),
                **{
                    'Mkt-RF': row['Mkt-RF'],
                    'SMB': row['SMB'],
                    'HML': row['HML'],
                    'RMW': row['RMW'],
                    'CMA': row['CMA'],
                    'RF': row['RF']
                }
            ))
        
        # Compute statistics
        ff3_stats = compute_descriptive_stats(ff3_df, ['Mkt-RF', 'SMB', 'HML'])
        ff5_stats = compute_descriptive_stats(ff5_df, ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA'])
        
        # Compute correlations
        ff3_corr = compute_correlation_matrix(ff3_df, ['Mkt-RF', 'SMB', 'HML'])
        ff5_corr = compute_correlation_matrix(ff5_df, ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA'])
        
        return FactorDataResponse(
            ff3=ff3_data,
            ff5=ff5_data,
            descriptive_stats_ff3=ff3_stats,
            descriptive_stats_ff5=ff5_stats,
            correlation_ff3=ff3_corr,
            correlation_ff5=ff5_corr
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting factor data: {str(e)}")

@router.post("/ff/analyze", response_model=FactorAnalysisResponse)
async def analyze_portfolios(request: FactorAnalysisRequest):
    """Run FF3 or FF5 regression analysis on portfolios"""
    try:
        # Load appropriate factor data
        if request.model == "FF3":
            factor_df = load_ff3_data()
        else:
            factor_df = load_ff5_data()
        
        # Filter by date if provided
        if request.start_date:
            start = pd.to_datetime(request.start_date)
            factor_df = factor_df[factor_df['Date'] >= start]
        
        if request.end_date:
            end = pd.to_datetime(request.end_date)
            factor_df = factor_df[factor_df['Date'] <= end]
        
        # Set date as index
        factor_df = factor_df.set_index('Date')
        
        # Run regressions for each portfolio
        results = []
        total_r2 = 0
        total_adj_r2 = 0
        num_sig_alphas = 0
        
        for portfolio_name, returns_list in request.portfolios.items():
            # Convert to series
            returns_df = pd.DataFrame([{
                'date': pd.to_datetime(r.date),
                'ret': r.ret
            } for r in returns_list])
            returns_df = returns_df.set_index('date')
            portfolio_series = returns_df['ret']
            
            # Run regression
            result = run_factor_regression(portfolio_series, factor_df, request.model)
            result.portfolio_name = portfolio_name
            
            results.append(result)
            total_r2 += result.r_squared
            total_adj_r2 += result.adj_r_squared
            
            # Check if alpha is significant at 5% level
            if result.alpha_pval < 0.05:
                num_sig_alphas += 1
        
        avg_r2 = total_r2 / len(results) if results else 0
        avg_adj_r2 = total_adj_r2 / len(results) if results else 0
        
        return FactorAnalysisResponse(
            model=request.model,
            regressions=results,
            avg_r_squared=avg_r2,
            avg_adj_r_squared=avg_adj_r2,
            num_significant_alphas=num_sig_alphas
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing portfolios: {str(e)}")

@router.post("/ff/grs", response_model=GRSTestResponse)
async def grs_test(request: GRSTestRequest):
    """Perform GRS test for joint significance of alphas"""
    try:
        # Load appropriate factor data
        if request.model == "FF3":
            factor_df = load_ff3_data()
        else:
            factor_df = load_ff5_data()
        
        # Filter by date if provided
        if request.start_date:
            start = pd.to_datetime(request.start_date)
            factor_df = factor_df[factor_df['Date'] >= start]
        
        if request.end_date:
            end = pd.to_datetime(request.end_date)
            factor_df = factor_df[factor_df['Date'] <= end]
        
        # Set date as index
        factor_df = factor_df.set_index('Date')
        
        # Convert portfolios to series dict
        portfolio_series_dict = {}
        for portfolio_name, returns_list in request.portfolios.items():
            returns_df = pd.DataFrame([{
                'date': pd.to_datetime(r.date),
                'ret': r.ret
            } for r in returns_list])
            returns_df = returns_df.set_index('date')
            portfolio_series_dict[portfolio_name] = returns_df['ret']
        
        # Compute GRS test
        grs_stat, p_value, num_obs = compute_grs_test(
            portfolio_series_dict,
            factor_df,
            request.model
        )
        
        # Interpretation
        if p_value < 0.01:
            interpretation = "Strong evidence against the model (p < 0.01). The model fails to explain asset returns."
        elif p_value < 0.05:
            interpretation = "Moderate evidence against the model (p < 0.05). The model has some pricing errors."
        elif p_value < 0.10:
            interpretation = "Weak evidence against the model (p < 0.10). The model explains returns reasonably well."
        else:
            interpretation = "Model cannot be rejected (p ≥ 0.10). The model prices assets well."
        
        return GRSTestResponse(
            model=request.model,
            grs_statistic=float(grs_stat),
            p_value=float(p_value),
            num_portfolios=len(portfolio_series_dict),
            num_observations=num_obs,
            interpretation=interpretation
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error performing GRS test: {str(e)}")
