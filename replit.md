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
- **Information & Global Markets Lab:** Interactive exploration of international diversification, home bias puzzle, Grossman (1976) information aggregation model, rational expectations, and Black-Litterman framework using synthetic data simulators.
- **Study Flashcards:** Interactive exam preparation module with 18 Q&A pairs from past exams (2016-2020), featuring professor's 5-step framework answers, topic/difficulty filtering, progress tracking, and keyboard shortcuts.

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
-   **Performance Optimization (October 2025):** Implemented in-memory caching for Yahoo Finance data fetches, reducing subsequent requests by 9.3x (from ~500ms to ~50ms). Cache uses MD5 hash keys based on tickers, date ranges, and parameters. Solves slow data loading in published deployments by storing frequently accessed market data.

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

## Recent Theory Content Additions (October 2025)

### Utility & SDF Explorer - Comprehensive Theory

The Utility & SDF Explorer theory tab has been completely rebuilt with 9 comprehensive cards covering first-principles utility theory and SDF pricing:

1. **Why Utility Matters for Pricing:** U' shapes SDF m used in 1 = E[m·R]; risk aversion → high m in bad states
2. **Traditional Utility Classes:** CRRA, CARA, DARA formulas and curvature implications
3. **Marginal Utility → SDF:** Utility-based m_t = β·U'(C_t+1)/U'(C_t) vs CAPM affine SDF m = a + b·R_M
4. **Stochastic Dominance:** FSD (non-satiation), SSD (risk aversion), TSD (skewness pref) constraints on m
5. **CAPM vs SD:** Linear limits, violations, quadratic U fragility in tails
6. **Why/When MV Still Useful:** Normal returns or quadratic U, Taylor approximation validity
7. **SD-Based SDFs:** Non-parametric estimation enforcing m > 0, decreasing, empirical loss aversion
8. **LPM & M-LPM Equilibrium:** Downside risk focus, equilibrium SDF m = a + b·min(R_M - r_f, 0)
9. **ESG Optional Note:** Factorizable if affects returns, flow-driven vs fundamental pricing

**Pedagogical Design:** Color-coded highlights (blue-50/green-50/purple-50/amber-50), monospace formulas with HTML notation, every card concludes with "So what?" summary. Aligns with Lecture 5 (Sept 26, 2025).

### Fixed Income & Derivatives - Comprehensive Theory

The Fixed Income theory tab has been completely rebuilt with 10 comprehensive cards covering bonds, interest-rate risk, credit risk, and derivatives:

1. **Why "Asset Pricing ≠ Only Stocks":** Interest-rate and default risks beyond R_M
2. **Bonds: Payoffs, Asymmetry:** Limited upside, downside to −100%, non-linear price-yield
3. **Interest-Rate Risk (Term Structure > YTM):** P = Σ coupon_t/(1+r_t)^t + principal/(1+r_T)^T, maturity/coupon sensitivity
4. **Duration-Convexity:** ΔP/P ≈ −D·Δy + (1/2)·C·(Δy)², asymmetry in rate shocks
5. **Default (Credit) Risk:** Ratings (AAA…D) proxy PD, prices reflect PD × LGD + risk premium
6. **Structured Credit (CDO Tranching):** Equity/mezz/senior/super-senior, systemic correlation risk
7. **Unified 5-Factor SDF:** m_t = a + b_M·R_t^M + b_SMB·SMB + b_HML·HML + b_TERM·TERM + b_CRED·CRED
8. **Derivatives: Why SDF Pricing Limited:** Time-varying β, non-linear hedge ratios, use SDF for intuition
9. **Risk-Neutral Probabilities:** Binomial p^Q = [(1+r_f) − d]/(u − d), regime change detection
10. **Performance & Portfolio Construction:** Hierarchical optimization, cross-asset correlations

**Pedagogical Design:** Same color-coded pattern as Utility module, formulas with proper mathematical notation, every card with "So what?" summary. Aligns with Lecture 6 (Oct 6, 2025).

### Information & Global Markets Lab - Comprehensive Theory & Simulators (October 2025)

The Information & Global Markets Lab module provides an interactive platform for exploring international diversification, home bias, and information asymmetry through comprehensive theory and three fully interactive simulators:

**Theory Section - 6 Comprehensive Cards:**

1. **Global Diversification & FX Risk:** Why diversify globally (imperfect correlations), FX risk measurement (Var[R_total] = Var[R_local] + Var[R_FX] + 2·Cov[R_local, R_FX])
2. **Home Bias Puzzle:** Empirical evidence (investors hold 70-90% domestic), efficiency loss from under-diversification
3. **Grossman (1976) Model:** Information aggregation in prices, costly information acquisition, equilibrium price informativeness
4. **Rational Expectations Equilibrium:** Agents learn from prices, market efficiency limits, impossibility of informationally efficient markets
5. **Black-Litterman Connection:** Views as private signals, Bayesian posterior combining market equilibrium + investor views
6. **Summary & Applications:** Unified framework connecting global diversification, information aggregation, and portfolio optimization

**Practice Section - 3 Interactive Simulators:**

1. **Foreign Assets Simulator:** 
   - Controls: Correlation (-1 to 1), FX volatility (0-30%), domestic/foreign allocation (0-100%)
   - Visualizations: Risk decomposition chart, portfolio metrics display
   - Mathematical stability: Corrected FX variance formula using proper variance-space arithmetic

2. **Home Bias Simulator:**
   - Controls: Home bias level (0-100%), correlation (-1 to 1)
   - Visualizations: Efficient frontier with current vs optimal allocation, Sharpe ratio comparison
   - Metrics: Efficiency loss percentage, optimal bias level detection

3. **Grossman Model Simulator:**
   - Controls: Signal precision (0-100%), risk aversion (0.5-5), information cost (0-30%), number of investors (10-1000)
   - Visualizations: Equilibrium price vs true value, information index metric
   - Mathematical stability: useMemo isolation for random signal generation to prevent stochastic jumps

**Technical Implementation:**
- All simulators use synthetic/offline data (no API calls)
- Mathematical stability via useMemo for random draws dependent on relevant controls
- Corrected formulas for FX risk using consistent variance units
- Real-time parameter adjustment with immediate visual feedback

**Pedagogical Design:** Same color-coded highlights as other theory modules, monospace formulas with HTML notation, "So what?" summaries. Simulators provide hands-on exploration of theoretical concepts with parameter sensitivity analysis.

**Integration:**
- Route: `/information`
- Navigation: Added to module tabs (next to Fixed Income) with Globe icon
- No landing page section (pure navigation module)

### Study Flashcards Module - Exam Preparation Tool (October 2025)

The Study Flashcards module provides an interactive exam preparation experience using real questions from past exams (July 2016, October 2017, July 2020):

**Core Features:**
- **18 Q&A Pairs:** Extracted from 7 past exam PDFs with complete professor's 5-step framework
- **5-Step Framework Structure:** Every answer follows the structured approach:
  1. Problem & Topic: Identify core question and classify topic
  2. Single/Combined: Determine if question requires single or multiple concepts
  3. Variables & Effects: List relevant formulas, variables, and effects
  4. Required Action: Specify what methodology/test is needed
  5. Method/Truth Test & Result: Apply method and derive key takeaway
- **Topic Coverage:** CAPM, Risk Analysis, Anomalies, Utility/SDF, Factor Models, Portfolio Theory, Fixed Income
- **Difficulty Levels:** Easy, Medium, Hard classification for progressive learning
- **Interactive Features:**
  - 3D flip animation (question front, framework back)
  - Topic and difficulty filtering
  - Shuffle mode for randomized study
  - Progress tracking with localStorage (known/review workflow)
  - Progress bar showing mastery percentage
  - Keyboard shortcuts: F (flip), N/→ (next), P/← (previous)
  - Study/Quiz mode tabs (quiz mode ready for future expansion)

**Data Structure (flashcards.json):**
- Each card includes: id, source, year, question, hint, topics (primary + secondary[]), difficulty
- Full 5-step framework fields populated for all 18 cards
- Quick answer summary for rapid review
- Source attribution (exam date and question number)

**Integration:**
- Route: `/study/flashcards`
- Landing page: Dedicated Study Flashcards section with Brain icon
- Offline-ready: Uses local JSON, no API dependencies