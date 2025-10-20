# Advanced Investments Interactive Lab

## Overview
This project is an interactive web platform designed for exploring advanced investment concepts, offering hands-on tools for visualizing and testing financial models using real market data. It serves as a comprehensive learning environment for theoretical exploration and practical application in areas like portfolio theory, CAPM, factor models, risk metrics, utility functions, and fixed income analysis. The platform operates in a "Practice Mode" using real market data and has a "Theory Mode" under development for synthetic data. Key capabilities include portfolio optimization, CAPM regression, factor analysis (Fama-French), risk analysis, utility and Stochastic Discount Factor exploration, fixed income analysis, global markets exploration, and an interactive study flashcards module.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18 and TypeScript with Vite for tooling. Wouter handles routing, and TanStack Query manages server state. The UI is built with Shadcn UI components (Radix UI-based) and Tailwind CSS, featuring a clean, light financial dashboard-inspired design with a custom color palette and specific fonts (Inter for UI, IBM Plex Mono for numerical data). Global state for shared parameters is managed via `GlobalStateContext`.

### Backend
A hybrid Node.js (Express.js) and Python (FastAPI) architecture is employed. Express.js serves the frontend and proxies API requests to the FastAPI backend. FastAPI, running on port 8000, handles computational APIs using Python's numerical libraries (NumPy, Pandas, SciPy, Cvxpy) for complex financial calculations, data fetching (yfinance), portfolio optimization, CAPM regression, risk metrics, and fixed income calculations. Pydantic and Zod schemas ensure type safety.

### Data Processing
Market data is fetched from Twelve Data API in production (with automatic fallback to yfinance in development). Financial computations leverage cvxpy for optimization, numpy and scipy for statistical operations, statsmodels for regression, and pandas for data manipulation. An in-memory MD5-based cache significantly reduces API calls for frequently accessed market data.

### Database & Persistence
The application is currently stateless. Drizzle ORM is configured for potential future PostgreSQL integration, and an in-memory storage (`MemStorage`) is used during development.

### Core Features and Design Decisions
-   **Risk Analysis Module:** Provides comprehensive theory and computes statistical metrics and histogram data for frontend visualization.
-   **Utility & SDF Explorer:** A pedagogical simulator generating synthetic data for utility curves, risk aversion, and SDF paths.
-   **Theory Tabs:** Portfolio Builder and CAPM Model Tester modules include extensive theoretical content.
-   **Factor Analyzer Theory:** Unified theory covering anomaly definition, factor construction, regression forms, and testing methodologies.
-   **Performance Optimization:** Implemented in-memory caching for market data fetches, improving response times.
-   **Production Data Source Migration:** Transitioned to Twelve Data API for production data fetching to ensure reliability.
-   **Information & Global Markets Lab:** Interactive exploration of international diversification, home bias, and information asymmetry through theory and three interactive simulators (Foreign Assets, Home Bias, Grossman Model).
-   **Study Flashcards Module:** An interactive exam preparation tool with 18 Q&A pairs from past exams, featuring a 5-step framework for answers, topic/difficulty filtering, progress tracking, and keyboard shortcuts.

## External Dependencies

### Third-Party APIs
-   **Twelve Data API**: Primary financial data API for production.
-   **Yahoo Finance (yfinance)**: Development fallback for market data.

### Python Libraries
-   **twelvedata**: Twelve Data API client.
-   **yfinance**: Yahoo Finance API wrapper.
-   **pandas**: Data manipulation.
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