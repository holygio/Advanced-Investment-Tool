# Advanced Investments Interactive Lab

## Overview
This project is an interactive web platform designed for exploring advanced investment concepts, offering hands-on tools for visualizing and testing financial models using a static historical dataset. It serves as a comprehensive learning environment for theoretical exploration and practical application in areas like portfolio theory, CAPM, factor models, risk metrics, utility functions, and fixed income analysis. The platform uses a 10-year static dataset (2015-2025) with pre-selected ETFs, eliminating all API costs while providing instant data loading. Key capabilities include portfolio optimization, CAPM regression, factor analysis (Fama-French), risk analysis, utility and Stochastic Discount Factor exploration, fixed income analysis, global markets exploration, and an interactive study flashcards module.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18 and TypeScript with Vite for tooling. Wouter handles routing, and TanStack Query manages server state. The UI is built with Shadcn UI components (Radix UI-based) and Tailwind CSS, featuring a clean, light financial dashboard-inspired design with a custom color palette and specific fonts (Inter for UI, IBM Plex Mono for numerical data). Global state for shared parameters is managed via `GlobalStateContext`.

### Backend
A hybrid Node.js (Express.js) and Python (FastAPI) architecture is employed. Express.js serves the frontend and proxies API requests to the FastAPI backend. FastAPI, running on port 8000, handles computational APIs using Python's numerical libraries (NumPy, Pandas, SciPy, Cvxpy) for complex financial calculations, portfolio optimization, CAPM regression, risk metrics, and fixed income calculations. Pydantic and Zod schemas ensure type safety.

### Data Processing & Static Dataset
The application uses a **static CSV dataset** (`data/prices_10y.csv`) containing 10 years of historical price data (2015-01-02 to 2024-12-31, 2,516 trading days) for 11 tickers:
- **Equities**: SPY, QQQ, IWM, XLF
- **Fixed Income**: TLT, HYG
- **Commodities**: GLD, SLV
- **FX**: UUP
- **Volatility**: VIXY
- **Market Index**: ^GSPC (S&P 500, for CAPM)

Data is loaded once at server startup and cached in memory, providing instant access with zero API costs. Financial computations leverage cvxpy for portfolio optimization, numpy and scipy for statistical operations, statsmodels for CAPM regression, and pandas for data manipulation. The static dataset approach ensures consistent, reproducible results and eliminates external API dependencies.

### Database & Persistence
The application is currently stateless. Drizzle ORM is configured for potential future PostgreSQL integration, and an in-memory storage (`MemStorage`) is used during development.

### Core Features and Design Decisions
-   **Static Dataset Architecture:** Migrated from API-based to CSV-based data loading, eliminating all external API costs and dependencies. Dataset includes 10 years of historical data (2,516 days) for 10 ETFs plus S&P 500 index.
-   **Access Gateway:** Requires shared password "advancedlab2025" and individual access codes (INV-LAB-1 through INV-LAB-200 format) for controlled access.
-   **Portfolio Constraints:** Default maximum weight per asset set to 50% to ensure feasibility for portfolios with 2+ assets.
-   **Risk Analysis Module:** Provides comprehensive theory and computes statistical metrics and histogram data for frontend visualization.
-   **Utility & SDF Explorer:** A pedagogical simulator generating synthetic data for utility curves, risk aversion, and SDF paths.
-   **Theory Tabs:** Portfolio Builder and CAPM Model Tester modules include extensive theoretical content.
-   **Factor Analyzer Theory:** Unified theory covering anomaly definition, factor construction, regression forms, and testing methodologies.
-   **Information & Global Markets Lab:** Interactive exploration of international diversification, home bias, and information asymmetry through theory and three interactive simulators (Foreign Assets, Home Bias, Grossman Model).
-   **Study Flashcards Module:** An interactive exam preparation tool with 18 Q&A pairs from past exams, featuring a 5-step framework for answers, topic/difficulty filtering, progress tracking, and keyboard shortcuts.

## External Dependencies

### Data Source
-   **Static CSV Dataset**: Self-contained historical data (`data/prices_10y.csv`), no external API dependencies.

### Python Libraries
-   **pandas**: Data manipulation and CSV loading.
-   **numpy**: Numerical computing.
-   **scipy**: Scientific computing and statistics.
-   **statsmodels**: Statistical models.
-   **cvxpy**: Convex optimization.
-   **FastAPI**: Web framework.
-   **uvicorn**: ASGI server.

### JavaScript/TypeScript Libraries
-   **React**: Frontend UI framework.
-   **Vite**: Build tool.
-   **TanStack Query**: Server state management.
-   **Radix UI**: Headless UI components.
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