# Advanced Investments Interactive Lab

## Overview

This project is an interactive web platform for exploring advanced investment concepts like portfolio theory, CAPM, factor models, risk metrics, utility functions, and fixed income analysis. It provides hands-on tools for visualizing and testing financial models using real market data from Yahoo Finance, aiming to be a comprehensive learning environment for both theoretical exploration and practical application.

The platform operates in "Practice Mode," using real market data for configurable portfolio analysis, and "Theory Mode" (under development) which will use synthetic data for reproducible "Model Worlds."

Key capabilities include:
- **Portfolio Builder:** Mean-Variance Optimization, Capital Market Line, efficient frontier visualization.
- **Model Tester:** CAPM regression and Security Market Line analysis.
- **Factor Analyzer:** Fama-French 3-Factor & 5-Factor Models.
- **Risk Analysis:** Performance metrics (Sharpe, Treynor, Jensen's Alpha, LPM) and higher moments analysis.
- **Utility & SDF Explorer:** Pedagogical simulator for utility theory (CRRA, CARA, DARA) and Stochastic Discount Factor concepts using synthetic data.
- **Fixed Income:** Term structure and credit spread analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses **React 18** and **TypeScript**, with **Vite** for tooling. **Wouter** handles routing, and **TanStack Query** manages server state. The UI is built with **Shadcn UI** components (based on Radix UI) and **Tailwind CSS**, featuring a clean, light financial dashboard-inspired design with a custom color palette and specific fonts (Inter for UI, IBM Plex Mono for numerical data). Global state for shared parameters (tickers, dates, risk-free rate) is managed via `GlobalStateContext`.

### Backend Architecture

A hybrid architecture combines **Node.js (Express.js)** and **Python (FastAPI)**. Express.js serves the frontend and proxies API requests to the FastAPI backend. FastAPI, running on port 8000, handles computational APIs using Python's numerical libraries (NumPy, Pandas, SciPy, Cvxpy). This setup allows Node.js to manage serving and routing while Python performs complex financial computations like data fetching (yfinance), portfolio optimization, CAPM regression, risk metrics, and fixed income calculations. Pydantic and Zod schemas ensure type safety across the backend and frontend.

### Data Processing Layer

Market data is fetched on-demand from **yfinance (Yahoo Finance)**. Financial computations leverage **cvxpy** for optimization, **numpy** and **scipy** for statistical operations, **statsmodels** for regression, and **pandas** for data manipulation.

### Database & Persistence

The application is currently stateless, performing calculations on-demand without a persistent database. **Drizzle ORM** is configured for potential future PostgreSQL integration, and an in-memory storage (`MemStorage`) is used during development.

### Core Features and Design Decisions

-   **Risk Analysis Module:** Rebuilt with comprehensive theory content covering variance, distribution shape (skewness, kurtosis, Jarque-Bera test), risk-adjusted performance ratios, Lower Partial Moments (LPM), and Stochastic Dominance. Backend computes statistical metrics and histogram data, while the frontend visualizes metrics, provides interpretations, and displays interactive charts (histogram with normal overlay, Q-Q plot).
-   **Utility & SDF Explorer:** Rebuilt as a pedagogical simulator using synthetic data generation. The backend generates correlated consumption growth and market returns, implements corrected utility formulas (CARA, CRRA, DARA), and computes SDF paths. The frontend offers a three-tab interface visualizing utility and marginal utility, absolute and relative risk aversion, and SDF time-series with interactive controls for key parameters.
-   **Theory Tabs:** Portfolio Builder and CAPM Model Tester modules now include comprehensive theory content covering fundamental assumptions, mathematical core, CML/SML comparisons, SDF views, testing methodologies, and empirical challenges.
-   **Factor Analyzer Theory:** Unified theory content covering anomaly definition, core equity anomalies (Size, Value, Momentum, Profitability, Investment), factor construction, regression forms (FF3, FF5, Carhart), SDF view, and testing methodologies (Portfolio Sorts, Fama-MacBeth, GRS Test).

## External Dependencies

### Third-Party APIs

-   **Yahoo Finance (yfinance)**: For real-time and historical stock price and market data.

### Python Libraries

-   **yfinance**: Market data fetching.
-   **pandas**: Data manipulation.
-   **numpy**: Numerical computing.
-   **scipy**: Scientific computing and statistics.
-   **statsmodels**: Statistical models and hypothesis testing.
-   **cvxpy**: Convex optimization.
-   **PyPortfolioOpt**: Portfolio optimization utilities.
-   **FastAPI**: Web framework.
-   **uvicorn**: ASGI server.

### JavaScript/TypeScript Libraries

-   **React**: Frontend UI framework.
-   **Vite**: Build tool.
-   **TanStack Query**: Server state management.
-   **Radix UI**: Headless UI component primitives.
-   **Plotly.js**: Interactive charting.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Wouter**: Client-side router.
-   **Zod**: Schema validation.
-   **React Hook Form**: Form state management.

### Design & Styling

-   **Shadcn UI**: Pre-built component library.
-   **class-variance-authority**: Component variants.
-   **Inter font**: Primary UI typography.
-   **IBM Plex Mono**: Monospace font.
-   **Custom CSS variables**: Theme management.