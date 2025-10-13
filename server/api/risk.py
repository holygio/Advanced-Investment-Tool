import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from scipy import stats
from scipy.optimize import minimize
import statsmodels.api as sm

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


# === NEW ENDPOINTS FOR ENHANCED RISK MODULE ===

class AssetReturns(BaseModel):
    ticker: str
    returns: List[float]

class MultiAssetRequest(BaseModel):
    assets: List[AssetReturns]
    market_ticker: str = "SPY"
    rf: float = Field(default=0.02, description="Annual risk-free rate")
    interval: str = Field(default="1mo", description="Data frequency")

class AssetMetrics(BaseModel):
    ticker: str
    mean: float
    std: float
    sharpe: float
    treynor: Optional[float] = None
    info_ratio: Optional[float] = None
    jensen_alpha: Optional[float] = None
    m2: Optional[float] = None
    beta: Optional[float] = None

class MultiAssetMetricsResponse(BaseModel):
    metrics: List[AssetMetrics]

@router.post("/risk/multi-asset-metrics", response_model=MultiAssetMetricsResponse)
async def calculate_multi_asset_metrics(request: MultiAssetRequest):
    """Calculate performance metrics for multiple assets using CAPM regressions"""
    try:
        # Annualization factor
        periods_per_year = {"1d": 252, "1wk": 52, "1mo": 12}.get(request.interval, 12)
        rf_period = request.rf / periods_per_year
        
        # Build returns DataFrame and drop any rows with NaN values
        returns_dict = {asset.ticker: asset.returns for asset in request.assets}
        returns_df = pd.DataFrame(returns_dict)
        
        # Drop rows with any NaN values to ensure clean data
        returns_df = returns_df.dropna()
        
        if len(returns_df) < 2:
            raise HTTPException(status_code=400, detail="Insufficient data points after cleaning (need at least 2)")
        
        # Get market returns
        if request.market_ticker not in returns_df.columns:
            raise HTTPException(status_code=400, detail=f"Market ticker {request.market_ticker} not found in assets")
        
        market_returns = returns_df[request.market_ticker].values
        excess_market = market_returns - rf_period
        
        metrics_list = []
        
        for ticker in returns_df.columns:
            try:
                asset_returns = returns_df[ticker].values
                mean_return = float(np.mean(asset_returns)) * periods_per_year
                std_return = float(np.std(asset_returns)) * np.sqrt(periods_per_year)
                sharpe = (mean_return - request.rf) / std_return if std_return > 0 else 0
                
                # CAPM regression for non-market assets
                beta = None
                treynor = None
                info_ratio = None
                jensen_alpha = None
                m2 = None
                
                if ticker != request.market_ticker:
                    excess_returns = asset_returns - rf_period
                    X = sm.add_constant(excess_market)
                    model = sm.OLS(excess_returns, X).fit()
                    
                    # Access params using array indexing (model.params is numpy array)
                    alpha_period = float(model.params[0])
                    beta = float(model.params[1])
                    alpha_annual = alpha_period * periods_per_year
                    residual_std = float(model.resid.std()) * np.sqrt(periods_per_year)
                    
                    treynor = (mean_return - request.rf) / beta if beta != 0 else None
                    info_ratio = alpha_annual / residual_std if residual_std > 0 else None
                    jensen_alpha = alpha_annual
                    
                    # M² calculation
                    market_std = float(np.std(market_returns)) * np.sqrt(periods_per_year)
                    if std_return > 0:
                        market_mean = float(np.mean(market_returns)) * periods_per_year
                        adjusted_return = request.rf + sharpe * market_std
                        m2 = adjusted_return - market_mean
                else:
                    # Market asset has beta = 1
                    beta = 1.0
                    treynor = mean_return - request.rf
                    jensen_alpha = 0.0
                    m2 = 0.0
                
                metrics_list.append(AssetMetrics(
                    ticker=ticker,
                    mean=round(mean_return, 4),
                    std=round(std_return, 4),
                    sharpe=round(sharpe, 4),
                    treynor=round(treynor, 4) if treynor is not None else None,
                    info_ratio=round(info_ratio, 4) if info_ratio is not None else None,
                    jensen_alpha=round(jensen_alpha, 4) if jensen_alpha is not None else None,
                    m2=round(m2, 4) if m2 is not None else None,
                    beta=round(beta, 4) if beta is not None else None
                ))
            except Exception as ticker_error:
                print(f"Error processing ticker {ticker}: {str(ticker_error)}")
                import traceback
                traceback.print_exc()
                # Continue with other tickers
                continue
        
        if not metrics_list:
            raise HTTPException(status_code=500, detail="No metrics could be calculated for any asset")
        
        return MultiAssetMetricsResponse(metrics=metrics_list)
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error calculating multi-asset metrics: {str(e)}")


class LPMFrontierRequest(BaseModel):
    assets: List[AssetReturns]
    tau: float = Field(default=0.0, description="Threshold return for LPM")
    n: float = Field(default=2.0, description="LPM power parameter")
    num_points: int = Field(default=25, description="Number of frontier points")

class FrontierPoint(BaseModel):
    target_return: float
    lpm: float
    weights: Dict[str, float]

class LPMFrontierResponse(BaseModel):
    frontier: List[FrontierPoint]
    tau: float
    n: float

@router.post("/risk/lpm-frontier", response_model=LPMFrontierResponse)
async def calculate_lpm_frontier(request: LPMFrontierRequest):
    """Calculate Return-LPM efficient frontier"""
    try:
        # Build returns matrix and clean NaN values
        returns_dict = {asset.ticker: asset.returns for asset in request.assets}
        returns_df = pd.DataFrame(returns_dict)
        returns_df = returns_df.dropna()
        
        if len(returns_df) < 2:
            raise HTTPException(status_code=400, detail="Insufficient data points for LPM frontier (need at least 2)")
        
        returns_matrix = returns_df.values
        mu = returns_df.mean().values
        tickers = returns_df.columns.tolist()
        N = len(tickers)
        
        def lpm_objective(weights):
            """Calculate LPM for given weights"""
            portfolio_returns = returns_matrix @ weights
            shortfalls = np.minimum(portfolio_returns - request.tau, 0)
            return np.mean(np.abs(shortfalls) ** request.n)
        
        # Generate frontier
        target_returns = np.linspace(mu.min(), mu.max(), request.num_points)
        frontier_points = []
        
        for mu_target in target_returns:
            constraints = [
                {'type': 'eq', 'fun': lambda w: np.sum(w) - 1},
                {'type': 'eq', 'fun': lambda w: w @ mu - mu_target}
            ]
            bounds = [(0, 1)] * N
            w0 = np.ones(N) / N
            
            result = minimize(lpm_objective, w0, method='SLSQP', 
                            constraints=constraints, bounds=bounds, 
                            options={'maxiter': 1000})
            
            if result.success:
                weights_dict = {ticker: round(float(w), 4) for ticker, w in zip(tickers, result.x)}
                frontier_points.append(FrontierPoint(
                    target_return=round(float(mu_target), 6),
                    lpm=round(float(lpm_objective(result.x)), 6),
                    weights=weights_dict
                ))
        
        return LPMFrontierResponse(
            frontier=frontier_points,
            tau=request.tau,
            n=request.n
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating LPM frontier: {str(e)}")


class LPMSurfaceRequest(BaseModel):
    returns: List[float]
    tau_range: List[float] = Field(default=[-0.02, 0.02], description="Range for tau")
    n_range: List[float] = Field(default=[1.0, 3.0], description="Range for n")
    grid_size: int = Field(default=10, description="Grid resolution")

class LPMSurfacePoint(BaseModel):
    tau: float
    n: float
    lpm: float

class LPMSurfaceResponse(BaseModel):
    surface: List[LPMSurfacePoint]

@router.post("/risk/lpm-surface", response_model=LPMSurfaceResponse)
async def calculate_lpm_surface(request: LPMSurfaceRequest):
    """Calculate LPM surface over tau and n parameter space"""
    try:
        returns_array = np.array(request.returns)
        tau_grid = np.linspace(request.tau_range[0], request.tau_range[1], request.grid_size)
        n_grid = np.linspace(request.n_range[0], request.n_range[1], request.grid_size)
        
        surface_points = []
        for tau in tau_grid:
            for n in n_grid:
                shortfalls = np.minimum(returns_array - tau, 0)
                lpm_value = float(np.mean(np.abs(shortfalls) ** n))
                surface_points.append(LPMSurfacePoint(
                    tau=round(float(tau), 4),
                    n=round(float(n), 4),
                    lpm=round(lpm_value, 6)
                ))
        
        return LPMSurfaceResponse(surface=surface_points)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating LPM surface: {str(e)}")


# === DISTRIBUTION METRICS & VISUALIZATION ===

class DistributionRequest(BaseModel):
    returns: List[float]
    num_bins: int = Field(default=30, description="Number of histogram bins")

class HistogramBin(BaseModel):
    bin_center: float
    count: int
    density: float

class DistributionMetrics(BaseModel):
    mean: float
    std: float
    skew: float
    kurt: float
    jb_stat: float
    jb_pvalue: float
    
class DistributionResponse(BaseModel):
    metrics: DistributionMetrics
    histogram: List[HistogramBin]
    normal_curve_x: List[float]
    normal_curve_y: List[float]
    qq_theoretical: List[float]
    qq_sample: List[float]

@router.post("/risk/distribution", response_model=DistributionResponse)
async def calculate_distribution(request: DistributionRequest):
    """Calculate distribution metrics, histogram, normal overlay, and QQ plot data"""
    try:
        returns_array = np.array(request.returns)
        
        # Basic statistics
        mean = float(np.mean(returns_array))
        std = float(np.std(returns_array))
        skew_val = float(stats.skew(returns_array))
        kurt_val = float(stats.kurtosis(returns_array, fisher=True))  # Excess kurtosis
        jb_stat, jb_pval = stats.jarque_bera(returns_array)
        
        # Histogram
        counts, bin_edges = np.histogram(returns_array, bins=request.num_bins, density=False)
        bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
        
        # Density for normal overlay
        total_count = len(returns_array)
        bin_width = bin_edges[1] - bin_edges[0]
        densities = counts / (total_count * bin_width)
        
        histogram_bins = [
            HistogramBin(
                bin_center=round(float(center), 6),
                count=int(count),
                density=round(float(density), 6)
            )
            for center, count, density in zip(bin_centers, counts, densities)
        ]
        
        # Normal curve overlay
        x_range = np.linspace(returns_array.min(), returns_array.max(), 200)
        normal_y = stats.norm.pdf(x_range, mean, std)
        
        # QQ plot data
        theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, 100))
        sample_quantiles = np.percentile(returns_array, np.linspace(1, 99, 100))
        
        return DistributionResponse(
            metrics=DistributionMetrics(
                mean=round(mean, 6),
                std=round(std, 6),
                skew=round(skew_val, 4),
                kurt=round(kurt_val, 4),
                jb_stat=round(float(jb_stat), 4),
                jb_pvalue=round(float(jb_pval), 4)
            ),
            histogram=[bin for bin in histogram_bins],
            normal_curve_x=[round(float(x), 6) for x in x_range],
            normal_curve_y=[round(float(y), 6) for y in normal_y],
            qq_theoretical=[round(float(q), 6) for q in theoretical_quantiles],
            qq_sample=[round(float(q), 6) for q in sample_quantiles]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating distribution: {str(e)}")
