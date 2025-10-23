# 🎓 Advanced Investments — Portfolio Optimization & Theory Companion Tool  

This project is an **interactive educational platform** built to visualize, simulate, and connect the **quantitative models** studied in the *Advanced Investments* course.  

It’s designed to help students and finance enthusiasts **bridge the gap between theory and real-world data**, providing an intuitive way to **experiment with portfolio optimization, asset pricing, and factor models** — all from a single environment.  

---

## 🌐 Access  

> For approved users only.  

- **App link:** [https://advanced-investment-tool.replit.app](https://advanced-investment-tool.replit.app)  
- **Password:** `advancedlab2025`  
- **Access code:** `INV-LAB-68`  

⚠️ Each access code is **personal and account-linked** — it will **not work if shared** with others.  

---

## 🎯 Purpose  

This tool was built to complement the **Advanced Investments course** and make abstract financial theories **interactive and visually intuitive**.  
It uses real historical market data (10 years, 2015–2025) to allow you to:  

- Construct and optimize portfolios across asset classes  
- Visualize efficient frontiers and risk-return trade-offs  
- Understand the CAPM and multifactor pricing models in action  
- Explore anomalies, information efficiency, and the Grossman-Stiglitz paradox  
- Study bond pricing and fixed-income portfolio theory  
- Review theory with concise summaries and test knowledge via flashcards  

---

## 🧩 Core Features  

| Module | Description |
|---------|--------------|
| **Markowitz Portfolio Theory** | Compute and visualize the efficient frontier, random portfolios, and tangency portfolio. Includes analytical computation of expected return, volatility, and the Sharpe ratio. |
| **CAPM (Capital Asset Pricing Model)** | Plot the Security Market Line (SML) and Capital Market Line (CML). Estimate beta coefficients, market premium, and compare expected vs realized returns. |
| **Fama–French Multifactor Models** | Extend CAPM to include SMB (size) and HML (value) factors. Demonstrates factor regressions, factor loadings, and performance attribution. |
| **Anomalies & Empirical Deviations** | Explore common CAPM deviations such as momentum, low-volatility, and value anomalies. Data-driven visualization of how anomalies affect expected return and Sharpe ratio. |
| **Grossman–Stiglitz Information Model** | Simulates markets with informed vs uninformed investors to illustrate limits of information efficiency. Allows users to adjust noise and information cost parameters. |
| **Factor Investing** | Create custom portfolios based on factor exposures (e.g. value, size, momentum). Examine diversification and alpha contribution by factor weight. |
| **Fixed Income Module** | Focuses on bond pricing, duration, and convexity. Allows users to see how changes in yields affect bond portfolios and total portfolio volatility. |
| **Flashcards** | Interactive Q&A section to review key formulas, definitions, and insights for each lecture. Helps with exam prep and theory reinforcement. |
| **Theory Pages** | Each of the 7 classes has a concise, structured summary explaining key concepts, formulas, and intuition — from Markowitz to fixed income. |

---

## 📊 Dataset  

### Composition  
The tool uses **10 ETFs** representing major global asset classes:  

| Category | Ticker | Description |
|-----------|---------|-------------|
| U.S. Equity (Large Cap) | SPY | S&P 500 ETF |
| U.S. Equity (Tech Growth) | QQQ | Nasdaq 100 ETF |
| U.S. Equity (Small Cap) | IWM | Russell 2000 ETF |
| Sector | XLF | Financials ETF |
| Bonds (Long-term) | TLT | 20+ Year Treasury ETF |
| Bonds (High Yield) | HYG | High Yield Corporate Bond ETF |
| Commodities | GLD | Gold ETF |
| Commodities | SLV | Silver ETF |
| Currencies | UUP | U.S. Dollar Index ETF |
| Volatility | VIXY | Short-term VIX futures ETF |

---

### Time Range  
- Period: **2015-01-01 → 2025-01-01**  
- Frequency: **Daily adjusted close prices**  
- Data source: `yfinance` (downloaded once and stored locally)

---

## 🗂 Project Structure  

```
/ (root)
├── app.py                   # main entry point (web or CLI)
├── data_loader.py           # loads static dataset
├── optimizer.py             # core portfolio math (mean, cov, Sharpe, weights)
├── capm_module.py           # CAPM & SML calculations
├── factors.py               # Fama-French factor models
├── anomalies.py             # empirical CAPM deviations
├── grossman_stiglitz.py     # information efficiency simulation
├── fixed_income.py          # bond pricing, duration, convexity
├── flashcards.py            # quiz and learning logic
├── theory_pages/            # markdown or HTML summaries for each class
├── data/
│   └── prices_10y.csv       # static dataset (2015–2025)
├── static/                  # plots, visuals, cached graphs
├── README.md
└── requirements.txt
```

---

## ⚙️ Installation  

### 1. Clone and install dependencies  
```bash
git clone https://github.com/<yourusername>/advanced-investment-tool.git
cd advanced-investment-tool
pip install -r requirements.txt
```

### 2. Run locally  
```bash
python app.py
```

If deployed on **Replit**, simply click **“Run”** and open the generated web URL.  

---

## 📈 Key Mathematical Concepts Implemented  

- **Expected Portfolio Return:**  
  \[
  E[R_p] = \sum_i w_i E[R_i]
  \]

- **Portfolio Variance:**  
  \[
  \sigma_p^2 = w^T \Sigma w
  \]

- **Sharpe Ratio (risk-adjusted return):**  
  \[
  S = \frac{E[R_p] - R_f}{\sigma_p}
  \]

- **CAPM Expected Return:**  
  \[
  E[R_i] = R_f + \beta_i (E[R_m] - R_f)
  \]

- **Fama–French 3-Factor Model:**  
  \[
  R_i - R_f = \alpha_i + \beta_m (R_m - R_f) + s_i SMB + h_i HML + \epsilon_i
  \]

- **Bond Duration and Convexity:**  
  Used in fixed income section to approximate sensitivity of price to rate changes.

---

## 💾 Offline Dataset Loading  

The app uses a **static local file** instead of APIs for performance and stability.  
This makes it work even in restricted environments like Replit.  

```python
from data_loader import load_static_prices

prices = load_static_prices()
print(prices.head())
```

If the file `data/prices_10y.csv` is missing, regenerate it locally using:

```python
import yfinance as yf, pandas as pd
tickers = ["SPY","QQQ","IWM","XLF","TLT","HYG","GLD","SLV","UUP","VIXY"]
data = yf.download(tickers, start="2015-01-01", end="2025-01-01")["Adj Close"]
data.to_csv("data/prices_10y.csv")
```

---

## 🧮 Portfolio Optimization Logic  

Implemented using **NumPy** and **SciPy**:  

- Covariance matrix estimation (annualized)
- Portfolio standard deviation and expected return
- Sharpe ratio maximization  
- Constraints:  
  - ∑wᵢ = 1  
  - 0 ≤ wᵢ ≤ 0.5 (no short selling, diversification enforced)
- Efficient frontier curve computed by iterative optimization

---

## 🧠 Learning Components  

### Flashcards
Each topic (7 total) includes 10–15 flashcards on:
- Core formulas  
- Theoretical intuition  
- Practical implications  

Example:
> **Q:** What does the slope of the Capital Market Line represent?  
> **A:** The Sharpe ratio of the tangency portfolio.

### Theory Pages
Concise text-based explanations for:
1. Markowitz Mean-Variance Theory  
2. CAPM and SML  
3. Fama–French Multifactor Models  
4. Market Anomalies  
5. Grossman–Stiglitz Model  
6. Factor Investing & Risk Premia  
7. Fixed Income: Duration, Convexity, Term Structure  

---

## 🧱 Technologies Used  

- **Python** — core programming  
- **Pandas / NumPy** — data manipulation  
- **SciPy** — optimization (minimize negative Sharpe)  
- **Matplotlib / Plotly** — plotting & visualization  
- **Replit** — hosting and deployment  
- **yFinance** — one-time data download  

---

## 🚀 Usage Example  

Once inside the app:
1. Choose your subset of available tickers.  
2. Run the optimizer → view efficient frontier and portfolio stats.  
3. Navigate through the theory sections to review the concepts.  
4. Use the flashcards to test understanding.  

---

## 🧩 Educational Philosophy  

This project is built to reflect the **structure of the Advanced Investments course**:  
> “Theory first — simulation second — intuition always.”  

Every model is paired with:
- **Mathematical foundation**
- **Graphical visualization**
- **Empirical demonstration**

So students can see *how theory behaves when exposed to real data.*

---

## ⚠️ Notes & Access  

- Password: `advancedlab2025`  
- Access code: `INV-LAB-68`  
- Works best on PC (Chrome or Edge).  
- Each access code is personal — please do not share.  

---

## 🧰 Future Improvements  

- Add Monte Carlo simulation for portfolio evolution  
- Introduce factor timing and rolling beta visualization  
- Extend fixed income module with yield curve fitting (Nelson-Siegel)  
- Implement ESG or sustainability-adjusted portfolio metrics  
- Optional API-based live data refresh (for premium users)  

---

## 📬 Contact  

For questions, feature requests, or access issues, reach out directly.  

---

## ⚖️ License  

Educational use only.  
Redistribution or resale without authorization is not allowed.  
