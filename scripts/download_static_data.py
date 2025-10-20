#!/usr/bin/env python3
"""
One-time script to download 10 years of historical data for portfolio optimization.
This creates the static dataset that eliminates need for API calls.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime

# Fixed ticker universe
TICKERS = ["SPY", "QQQ", "IWM", "XLF", "TLT", "HYG", "GLD", "SLV", "UUP", "VIXY"]

# 10-year period
START_DATE = "2015-01-01"
END_DATE = "2025-01-01"

print("=" * 60)
print("📊 Downloading Static Dataset for Portfolio Optimization")
print("=" * 60)
print(f"Tickers: {', '.join(TICKERS)}")
print(f"Period: {START_DATE} to {END_DATE} (10 years)")
print("\n⏳ Downloading... This may take 1-2 minutes.\n")

try:
    # Download all data
    raw_data = yf.download(TICKERS, start=START_DATE, end=END_DATE, progress=True, auto_adjust=True)
    
    # Extract Adjusted Close (handle both single and multi-ticker cases)
    if len(TICKERS) == 1:
        data = raw_data[["Close"]].copy()
        data.columns = TICKERS
    else:
        # For multiple tickers, the structure is different
        if "Adj Close" in raw_data.columns.get_level_values(0):
            data = raw_data["Adj Close"].copy()
        elif "Close" in raw_data.columns.get_level_values(0):
            data = raw_data["Close"].copy()
        else:
            # Fallback: just use Close prices
            data = raw_data.xs("Close", level=0, axis=1).copy()
    
    # Clean up
    data = data.dropna(how="all")
    
    # Ensure we have all tickers
    data = data[TICKERS]
    
    # Save to CSV
    output_file = "data/prices_10y.csv"
    data.to_csv(output_file)
    
    print("\n" + "=" * 60)
    print(f"✅ SUCCESS! Saved to {output_file}")
    print(f"   Shape: {data.shape[0]} days × {data.shape[1]} assets")
    print(f"   Date range: {data.index[0]} to {data.index[-1]}")
    print(f"   File size: ~{len(data) * len(TICKERS) * 8 / 1024:.1f} KB")
    print("=" * 60)
    
    # Preview
    print("\n📋 Preview (first 5 rows):")
    print(data.head())
    
    print("\n📊 Summary statistics:")
    print(data.describe())
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure you have internet connection")
    print("2. Ensure yfinance is installed: pip install yfinance")
    print("3. Try running again - sometimes Yahoo Finance has temporary issues")
    exit(1)
