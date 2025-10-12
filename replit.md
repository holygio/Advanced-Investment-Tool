# Advanced Investments Interactive Lab

## Overview

This is an interactive web platform for exploring advanced investment concepts including portfolio theory, CAPM, factor models, risk metrics, utility functions, and fixed income analysis. The application provides hands-on tools to visualize and test financial models using real market data from Yahoo Finance.

## Two Modes of Operation

### Practice Mode (Your Data)
- Use real market data from Yahoo Finance
- Configure your own portfolio with tickers, dates, and constraints
- Analyze actual historical returns and correlations
- All calculations use weekly data with proper annualization (52 weeks/year)

### Theory Mode (Model Worlds) - IN DEVELOPMENT
- Explore financial theories with synthetic data generators
- Six "Model Worlds" with known parameters:
  - CAPM World - Perfect beta pricing with known betas
  - Fama-French World - Multi-factor models with configurable factors
  - LPM/Higher-Moments World - Non-normal distributions and downside risk
  - Utility & SDF World - Preference-based asset pricing
  - Fixed Income World - Term structure and credit spreads
  - Risk-Neutral World - Options pricing
- Reproducible with fixed random seeds
- No API calls required - works offline

## Six Learning Modules

1. **Portfolio Builder** - Mean-Variance Optimization & Capital Market Line
   - Efficient frontier visualization
   - Pie chart allocation
   - Correlation heatmap
   - Optimal weights table

2. **Model Tester** - CAPM regression and Security Market Line analysis

3. **Factor Analyzer** - Multi-factor models (Fama-French, momentum, etc.)
   - Factor regression with beta loadings
   - R-squared comparison
   - Annualized factor premia

4. **Risk & Performance** - Performance metrics and higher moments analysis
   - Sharpe, Treynor, Information Ratio, Jensen's Alpha
   - Skewness, Kurtosis, Jarque-Bera test
   - Return distribution histogram
   - Lower Partial Moments (LPM) with configurable tau and n

5. **Utility Explorer** - Utility functions (CRRA, CARA, DARA) and SDF concepts

6. **Fixed Income** - Term structure and credit spread analysis

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- Shadcn UI component library based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design System:**
- Clean white/light theme for optimal graph visibility  
- Inspired by professional financial dashboards
- Custom color palette optimized for financial data visualization (trust blue, success green, danger red)
- Typography: Inter for UI, IBM Plex Mono for numerical/tabular data

**User Workflow:**
1. User configures portfolio in left sidebar (tickers, dates, constraints)
2. Clicks "Load Data & Optimize Portfolio" button
3. Navigates to /portfolio route
4. **Both Portfolio Builder AND CAPM automatically run** with configured parameters
5. Results are displayed immediately with graphs and theory tabs
6. Configuration is locked (read-only) after initial load

**State Management:**
- Global state managed via React Context (`GlobalStateContext`) for shared parameters:
  - Ticker symbols
  - Date ranges (start/end)
  - Risk-free rate
  - Market proxy selection
- Server state cached and synchronized using TanStack Query
- Component-local state for UI interactions

**Component Structure:**
- Module layout pattern with Practice/Theory tabs
- Reusable components: MetricCard, DataTable, charts
- Shared GlobalControls bar for cross-module parameters
- AppSidebar for navigation between modules

### Backend Architecture

**Hybrid Node.js + Python Architecture:**
- **Express.js** (Node.js) serves as the main application server
  - Handles static file serving via Vite in development
  - Proxies `/api/*` requests to Python FastAPI backend
  - Session management (placeholder for user storage in `storage.ts`)

- **FastAPI** (Python) provides computational APIs
  - Runs on port 8000, spawned as child process from Express server
  - Organized into domain-specific routers:
    - `data.py` - Price/return data fetching via yfinance
    - `portfolio.py` - Portfolio optimization (efficient frontier, tangency portfolio)
    - `model.py` - CAPM regression and SML calculations
    - `risk.py` - Performance metrics (Sharpe, Treynor, Jensen's alpha, LPM)
    - `utility.py` - Utility function calculations (CRRA, CARA, DARA)
    - `fixedincome.py` - Yield curve and credit spread data

**Why this hybrid approach:**
- Python excels at numerical computation with libraries like numpy, pandas, scipy, cvxpy
- Node.js provides superior frontend development experience and React integration
- Clear separation: Node handles serving/routing, Python handles computation
- No authentication required for educational tool (placeholder storage exists for future expansion)

### Data Processing Layer

**Market Data:**
- Primary source: yfinance (Yahoo Finance) - free, no API key required
- Data types: adjusted close prices, computed returns (simple or log)
- Interval support: daily (1d), weekly (1wk), monthly (1mo)
- All data fetched on-demand, no database persistence (stateless)

**Financial Computations:**
- Portfolio optimization: cvxpy for convex optimization problems
- Statistics: numpy for matrix operations, scipy for statistical functions
- Regression analysis: statsmodels for OLS regression (CAPM, factor models)
- Time series: pandas for data manipulation and alignment

**Response Schemas:**
- Defined using Pydantic models in Python (FastAPI)
- Mirrored using Zod schemas in `shared/schema.ts` for type safety
- Consistent data structures across frontend/backend boundary

### Database & Persistence

**Current State:**
- No persistent database - application is stateless
- Drizzle ORM configured (`drizzle.config.ts`) for PostgreSQL via Neon serverless
- Schema defined in `shared/schema.ts` (currently only User model as placeholder)
- In-memory storage (`MemStorage` class) used for development

**Rationale:**
- Educational tool doesn't require data persistence
- All calculations performed on-demand from fresh market data
- Database scaffolding present for future features (user portfolios, saved analyses)

### Build & Deployment

**Development:**
- Concurrent servers via npm script: Vite dev server + Express + FastAPI
- Hot module replacement for React components
- Python server runs with `--reload` flag for auto-restart

**Production Build:**
- Frontend: Vite bundles React app to `dist/public`
- Backend: esbuild bundles Express server to `dist/index.js`
- Python dependencies: `requirements.txt` (not shown but implied by imports)
- Deployment expects Node.js runtime + Python 3.x environment

## External Dependencies

### Third-Party APIs
- **Yahoo Finance (yfinance)** - Stock price and market data (free, no authentication)
- **FRED API** - Optional Federal Reserve economic data (placeholder for API key in fixed income module)

### Python Libraries
- **yfinance** - Market data fetching
- **pandas** - Data manipulation and time series
- **numpy** - Numerical computing
- **scipy** - Scientific computing and statistics
- **statsmodels** - Statistical models and hypothesis testing
- **cvxpy** - Convex optimization for portfolio construction
- **PyPortfolioOpt** - Portfolio optimization utilities (implied by requirements)
- **FastAPI** - Web framework for Python API
- **uvicorn** - ASGI server for FastAPI

### JavaScript/TypeScript Libraries
- **React** - UI framework
- **Vite** - Build tool and dev server
- **TanStack Query** - Server state management
- **Radix UI** - Headless component primitives
- **Plotly.js** - Interactive charting (via react-plotly.js)
- **Tailwind CSS** - Utility-first CSS framework
- **Wouter** - Lightweight routing
- **Zod** - Schema validation
- **React Hook Form** - Form state management

### Design & Styling
- **Shadcn UI** - Pre-built component library (New York style variant)
- **class-variance-authority** - Component variant styling
- **Inter font** - Primary UI typography
- **IBM Plex Mono** - Monospace font for financial data
- Custom CSS variables for theming (HSL color space)