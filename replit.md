# Advanced Investments Interactive Lab

## Overview

This project is an interactive web platform designed to explore advanced investment concepts such as portfolio theory, CAPM, factor models, risk metrics, utility functions, and fixed income analysis. It offers hands-on tools for visualizing and testing financial models using real market data from Yahoo Finance. The application aims to provide a comprehensive learning environment for understanding complex financial theories and their practical application, supporting both theoretical exploration and practical analysis with real-world data.

The platform operates in two main modes: "Practice Mode," which uses real market data and allows users to configure and analyze their own portfolios, and "Theory Mode" (currently in development), which will utilize synthetic data to explore financial theories with reproducible "Model Worlds."

Key capabilities include:
- **Portfolio Builder:** Mean-Variance Optimization, Capital Market Line, efficient frontier visualization, and optimal weight calculation.
- **Model Tester:** CAPM regression and Security Market Line analysis.
- **Factor Analyzer:** Fama-French 3-Factor & 5-Factor Models using historical factor data.
- **Risk Analysis:** Performance metrics (Sharpe, Treynor, Jensen's Alpha, LPM) and higher moments analysis.
- **Utility & SDF Explorer:** Comprehensive pedagogical simulator for utility theory (CRRA, CARA, DARA) and Stochastic Discount Factor concepts using synthetic data generation for reproducible model exploration.
- **Fixed Income:** Term structure and credit spread analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18** and **TypeScript**, using **Vite** for tooling. **Wouter** handles client-side routing, and **TanStack Query** manages server state. The UI leverages **Shadcn UI** components, based on Radix UI primitives, and **Tailwind CSS** for styling, adhering to a clean, light theme inspired by professional financial dashboards. The design system features a custom color palette optimized for financial data and uses Inter for UI typography and IBM Plex Mono for numerical data. User workflow involves configuring portfolios in a persistent sidebar, triggering automatic analysis upon data loading, and real-time updates. Global state for shared parameters (tickers, dates, risk-free rate) is managed via `GlobalStateContext`, with server state cached by TanStack Query.

### Backend Architecture

A hybrid **Node.js (Express.js)** and **Python (FastAPI)** architecture is employed. Express.js serves the frontend and proxies `/api/*` requests to the Python FastAPI backend. FastAPI, running on port 8000, provides computational APIs, leveraging Python's strengths in numerical computing with libraries like NumPy, Pandas, SciPy, and Cvxpy. This separation allows Node.js to handle serving and routing efficiently while Python manages complex financial computations, including data fetching (yfinance), portfolio optimization, CAPM regression, risk metrics, and fixed income calculations. Pydantic models in Python are used for defining response schemas, mirrored by Zod schemas in TypeScript for type safety across the frontend/backend boundary.

### Data Processing Layer

Market data is primarily sourced from **yfinance (Yahoo Finance)**, providing adjusted close prices and computed returns. Data fetching is on-demand, making the application stateless. Financial computations utilize **cvxpy** for optimization, **numpy** and **scipy** for statistical operations, **statsmodels** for regression analysis, and **pandas** for data manipulation and alignment.

### Database & Persistence

The application is currently stateless and does not use a persistent database, as all calculations are performed on-demand from fresh market data. However, **Drizzle ORM** is configured for potential future integration with PostgreSQL (via Neon serverless), and a `User` model placeholder exists. An in-memory storage (`MemStorage`) is used during development.

## Recent Changes (October 2025)

### Utility & SDF Explorer Rebuild (Theory Mode Implementation)

The Utility Explorer has been completely rebuilt as a comprehensive pedagogical simulator using synthetic data generation:

**Backend (`/api/theory/utility/generate`):**
- Generates 240 months of correlated consumption growth and market returns (synthetic data with configurable parameters)
- Implements corrected utility formulas:
  - CARA: U(x) = -e^(-bx)/b
  - CRRA: U(x) = x^(1-γ)/(1-γ)
  - DARA: U(x) = (a+x)^(1-γ)/(1-γ) (using shift parameter a for proper implementation)
- Computes SDF paths using utility theory: m_t = β·U'(c_{t+1})/U'(c_t)
- Generates linear CAPM SDF comparison for pedagogical purposes
- Returns wealth grids, utility values, marginal utilities, risk aversion measures (A(x), R(x)), and summary statistics

**Frontend (Three-Tab Interface):**
1. **Utility & Marginal Tab:** Dual-axis Plotly charts showing U(x) and U'(x) with wealth on x-axis
2. **Risk Aversion Tab:** Overlaid plots of absolute (A(x)) and relative (R(x)) risk aversion measures
3. **SDF Explorer Tab:** Time-series SDF paths with recession shading (highlighting negative consumption growth periods), KPI cards for mean SDF, volatility, and pricing error

**Interactive Controls:**
- Risk aversion (γ): 0.5 to 10
- Discount factor (β): 0.9 to 0.999
- Consumption volatility (σ_c): 1% to 5%
- Correlation ρ(Δc, R_m): -0.9 to 0.9
- Wealth range (max): 10 to 500

**Pedagogical Features:**
- Theory cards explaining CARA, CRRA, DARA utility functions
- Risk aversion measure interpretations
- SDF pricing kernel explanations
- Visual recession shading to highlight bad states where SDF spikes

This implementation provides a reproducible, theory-focused learning environment for understanding how investor preferences map to asset pricing through the stochastic discount factor framework.

## External Dependencies

### Third-Party APIs

-   **Yahoo Finance (yfinance)**: For real-time and historical stock price and market data.
-   **FRED API**: (Placeholder) For Federal Reserve economic data.

### Python Libraries

-   **yfinance**: Market data fetching.
-   **pandas**: Data manipulation and time series analysis.
-   **numpy**: Numerical computing.
-   **scipy**: Scientific computing and statistics.
-   **statsmodels**: Statistical models and hypothesis testing (e.g., OLS regression).
-   **cvxpy**: Convex optimization for portfolio construction.
-   **PyPortfolioOpt**: Portfolio optimization utilities.
-   **FastAPI**: Web framework for building Python APIs.
-   **uvicorn**: ASGI server for running FastAPI applications.

### JavaScript/TypeScript Libraries

-   **React**: Frontend UI framework.
-   **Vite**: Build tool and development server.
-   **TanStack Query**: Server state management.
-   **Radix UI**: Headless UI component primitives.
-   **Plotly.js**: Interactive charting library (via `react-plotly.js`).
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Wouter**: Lightweight client-side router.
-   **Zod**: Schema validation library.
-   **React Hook Form**: Form state management.

### Design & Styling

-   **Shadcn UI**: Pre-built component library for React.
-   **class-variance-authority**: For managing component variants.
-   **Inter font**: Primary UI typography.
-   **IBM Plex Mono**: Monospace font for numerical and tabular data.
-   **Custom CSS variables**: For theme management using HSL color space.