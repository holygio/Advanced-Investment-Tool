import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from pathlib import Path

router = APIRouter()

# Load data files
DATA_DIR = Path(__file__).parent.parent / "data" / "fixedincome"

def load_yield_curves():
    """Load historical yield curve data from CSV"""
    filepath = DATA_DIR / "yield_curves.csv"
    df = pd.read_csv(filepath, parse_dates=['Date'])
    return df

def load_credit_spreads():
    """Load historical credit spread data from CSV"""
    filepath = DATA_DIR / "credit_spreads.csv"
    df = pd.read_csv(filepath, parse_dates=['Date'])
    return df

def load_bonds():
    """Load bond characteristics data from CSV"""
    filepath = DATA_DIR / "bonds.csv"
    df = pd.read_csv(filepath)
    return df

# Response Models
class YieldCurvePoint(BaseModel):
    maturity: str
    yield_: float = Field(..., serialization_alias='yield')
    
    class Config:
        populate_by_name = True

class YieldCurveData(BaseModel):
    date: str
    points: List[YieldCurvePoint]

class TermSpreadPoint(BaseModel):
    date: str
    term_spread: float
    credit_spread_ig: float
    credit_spread_hy: float

class BondSensitivity(BaseModel):
    bond: str
    maturity: float
    coupon: float
    yield_: float = Field(..., serialization_alias='yield')
    duration: float
    convexity: float
    price_change_neg100: float  # -100 bps
    price_change_pos100: float  # +100 bps
    
    class Config:
        populate_by_name = True

class RiskNeutralCalc(BaseModel):
    s: float  # Current price
    u: float  # Up factor
    d: float  # Down factor
    r: float  # Risk-free rate
    p_q: float  # Risk-neutral probability
    call_price: float  # Call option value
    
class FixedIncomeDataResponse(BaseModel):
    yield_curves: List[YieldCurveData]
    term_spreads: List[TermSpreadPoint]
    bonds: List[BondSensitivity]
    latest_term_spread: float
    latest_credit_ig: float
    latest_credit_hy: float

# Endpoints
@router.get("/fixedincome/data", response_model=FixedIncomeDataResponse)
async def get_fixedincome_data():
    """Get comprehensive fixed income data including yield curves, spreads, and bond sensitivities"""
    try:
        # Load data
        yield_df = load_yield_curves()
        credit_df = load_credit_spreads()
        bonds_df = load_bonds()
        
        # Process yield curves - get select dates for visualization
        # Get data from: 2015, 2018, 2020, 2023, 2024 (latest)
        select_dates = ['2015-01-31', '2018-01-31', '2020-03-31', '2023-01-31', '2024-12-31']
        yield_curves = []
        
        for date_str in select_dates:
            row = yield_df[yield_df['Date'] == date_str]
            if not row.empty:
                points = []
                for col in ['3M', '2Y', '5Y', '10Y', '30Y']:
                    points.append(YieldCurvePoint(
                        maturity=col,
                        yield_=float(row[col].values[0])
                    ))
                yield_curves.append(YieldCurveData(
                    date=date_str,
                    points=points
                ))
        
        # Compute term and credit spreads over time
        term_spreads = []
        for _, row in pd.concat([yield_df, credit_df], axis=1).iterrows():
            if pd.notna(row['10Y']) and pd.notna(row['3M']):
                term_spreads.append(TermSpreadPoint(
                    date=row['Date'].strftime('%Y-%m-%d'),
                    term_spread=float(row['10Y'] - row['3M']),
                    credit_spread_ig=float(row['IG_Spread']) if pd.notna(row['IG_Spread']) else 0.0,
                    credit_spread_hy=float(row['HY_Spread']) if pd.notna(row['HY_Spread']) else 0.0
                ))
        
        # Calculate bond price sensitivities (duration-convexity approximation)
        bonds_sensitivity = []
        for _, bond in bonds_df.iterrows():
            duration = float(bond['Duration'])
            convexity = float(bond['Convexity'])
            
            # Price change for -100 bps (rates decrease)
            delta_y_neg = -0.01
            price_change_neg = -duration * delta_y_neg + 0.5 * convexity * (delta_y_neg ** 2)
            
            # Price change for +100 bps (rates increase)
            delta_y_pos = 0.01
            price_change_pos = -duration * delta_y_pos + 0.5 * convexity * (delta_y_pos ** 2)
            
            bonds_sensitivity.append(BondSensitivity(
                bond=bond['Bond'],
                maturity=float(bond['Maturity']),
                coupon=float(bond['Coupon']),
                yield_=float(bond['Yield']),
                duration=duration,
                convexity=convexity,
                price_change_neg100=round(price_change_neg * 100, 2),  # Convert to percentage
                price_change_pos100=round(price_change_pos * 100, 2)
            ))
        
        # Get latest values
        latest_yield = yield_df.iloc[-1]
        latest_credit = credit_df.iloc[-1]
        latest_term_spread = float(latest_yield['10Y'] - latest_yield['3M'])
        
        return FixedIncomeDataResponse(
            yield_curves=yield_curves,
            term_spreads=term_spreads,
            bonds=bonds_sensitivity,
            latest_term_spread=round(latest_term_spread, 4),
            latest_credit_ig=round(float(latest_credit['IG_Spread']), 4),
            latest_credit_hy=round(float(latest_credit['HY_Spread']), 4)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading fixed income data: {str(e)}")

# Risk-Neutral Pricing Calculator
class RiskNeutralRequest(BaseModel):
    s: float = 100.0  # Current stock price
    k: float = 100.0  # Strike price
    u: float = 1.1    # Up factor
    d: float = 0.9    # Down factor
    r: float = 0.03   # Risk-free rate

class RiskNeutralResponse(BaseModel):
    s: float
    k: float
    u: float
    d: float
    r: float
    p_q: float  # Risk-neutral probability
    p_up_state: float  # Probability of up state
    s_up: float  # Stock price in up state
    s_down: float  # Stock price in down state
    call_up: float  # Call payoff in up state
    call_down: float  # Call payoff in down state
    call_price: float  # Present value of call option
    interpretation: str

@router.post("/fixedincome/risk-neutral", response_model=RiskNeutralResponse)
async def calculate_risk_neutral(request: RiskNeutralRequest):
    """Calculate risk-neutral probabilities and option price in binomial model"""
    try:
        # Calculate risk-neutral probability: p_Q = (1+r - d) / (u - d)
        p_q = (1 + request.r - request.d) / (request.u - request.d)
        
        # Stock prices in up and down states
        s_up = request.s * request.u
        s_down = request.s * request.d
        
        # Call option payoffs
        call_up = max(s_up - request.k, 0)
        call_down = max(s_down - request.k, 0)
        
        # Present value of call option
        call_price = (p_q * call_up + (1 - p_q) * call_down) / (1 + request.r)
        
        # Interpretation
        interpretation = (
            f"Under risk-neutral measure Q, expected return equals risk-free rate. "
            f"Risk-neutral probability p^Q = {p_q:.4f} differs from real-world probability. "
            f"This adjustment prices the option by discounting risk-neutral expected payoff at r_f. "
            f"The call option is worth ${call_price:.2f}, replicating the payoff structure."
        )
        
        return RiskNeutralResponse(
            s=request.s,
            k=request.k,
            u=request.u,
            d=request.d,
            r=request.r,
            p_q=round(p_q, 4),
            p_up_state=round(p_q, 4),
            s_up=round(s_up, 2),
            s_down=round(s_down, 2),
            call_up=round(call_up, 2),
            call_down=round(call_down, 2),
            call_price=round(call_price, 2),
            interpretation=interpretation
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating risk-neutral probabilities: {str(e)}")
