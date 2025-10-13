import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useGlobalState } from "@/contexts/global-state-context";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Plot from "react-plotly.js";

export default function Performance() {
  const { globalState } = useGlobalState();
  const [tau, setTau] = useState(0);
  const [n, setN] = useState(2);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Simulation mode state
  const [simulationMode, setSimulationMode] = useState(false);
  const [simMean, setSimMean] = useState(0.000);
  const [simVolatility, setSimVolatility] = useState(0.02);
  const [simSkewness, setSimSkewness] = useState(0.0);
  const [simKurtosis, setSimKurtosis] = useState(0.0);
  const [simSampleSize, setSimSampleSize] = useState(1000);

  // Fetch portfolio data
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["/api/data/prices", globalState.tickers, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: globalState.tickers,
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1mo",
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: globalState.tickers.length > 0,
  });

  // Fetch multi-asset metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/risk/multi-asset-metrics", portfolioData, globalState.riskFreeRate, globalState.marketProxy],
    queryFn: async () => {
      if (!portfolioData?.returns) return null;
      
      const assets = Object.keys(portfolioData.returns).map(ticker => ({
        ticker,
        returns: portfolioData.returns[ticker].map((d: any) => d.ret)
      }));

      // Use SPY as market ticker if it's in the portfolio, otherwise use first ticker
      const marketTicker = Object.keys(portfolioData.returns).includes('SPY') 
        ? 'SPY' 
        : Object.keys(portfolioData.returns)[0];

      const response = await apiRequest("/api/risk/multi-asset-metrics", {
        method: "POST",
        body: JSON.stringify({
          assets,
          market_ticker: marketTicker,
          rf: globalState.riskFreeRate,
          interval: "1mo"
        }),
      });
      return response;
    },
    enabled: !!portfolioData?.returns,
  });

  // Fetch LPM frontier
  const { data: frontierData, isLoading: frontierLoading } = useQuery({
    queryKey: ["/api/risk/lpm-frontier", portfolioData, tau, n],
    queryFn: async () => {
      if (!portfolioData?.returns) return null;
      
      const assets = Object.keys(portfolioData.returns).map(ticker => ({
        ticker,
        returns: portfolioData.returns[ticker].map((d: any) => d.ret)
      }));

      const response = await apiRequest("/api/risk/lpm-frontier", {
        method: "POST",
        body: JSON.stringify({
          assets,
          tau,
          n,
          num_points: 30
        }),
      });
      return response;
    },
    enabled: !!portfolioData?.returns,
  });

  // Calculate portfolio distribution for histogram
  const portfolioReturns = portfolioData?.returns && Object.keys(portfolioData.returns).length > 0 ? (() => {
    const tickers = Object.keys(portfolioData.returns);
    const firstTickerReturns = portfolioData.returns[tickers[0]];
    
    if (!firstTickerReturns || !Array.isArray(firstTickerReturns) || firstTickerReturns.length === 0) {
      return [];
    }
    
    return firstTickerReturns.map((_: any, idx: number) => {
      const avgReturn = tickers.reduce((sum, ticker) => {
        return sum + (portfolioData.returns[ticker]?.[idx]?.ret || 0);
      }, 0) / tickers.length;
      return avgReturn;
    });
  })() : [];

  // Fetch distribution metrics (real data)
  const { data: distributionData, isLoading: distributionLoading } = useQuery({
    queryKey: ["/api/risk/distribution", portfolioReturns],
    queryFn: async () => {
      if (portfolioReturns.length < 3) return null;
      
      return await apiRequest("/api/risk/distribution", {
        method: "POST",
        body: JSON.stringify({
          returns: portfolioReturns,
          num_bins: 30
        }),
      });
    },
    enabled: portfolioReturns.length >= 3 && !simulationMode,
  });

  // Fetch simulated distribution
  const { data: simulatedData, isLoading: simulatedLoading } = useQuery({
    queryKey: ["/api/risk/simulate-distribution", simMean, simVolatility, simSkewness, simKurtosis, simSampleSize],
    queryFn: async () => {
      return await apiRequest("/api/risk/simulate-distribution", {
        method: "POST",
        body: JSON.stringify({
          mean: simMean,
          volatility: simVolatility,
          skewness: simSkewness,
          kurtosis: simKurtosis,
          sample_size: simSampleSize,
          num_bins: 50
        }),
      });
    },
    enabled: simulationMode,
  });

  // Use simulated data when in simulation mode, otherwise use real data
  const displayData = simulationMode ? simulatedData : distributionData;
  const displayLoading = simulationMode ? simulatedLoading : distributionLoading;


  const theory = (
    <div className="space-y-6 py-6">
      {/* Introduction */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Risk Analysis: From Variance to Higher Moments</h2>
        <p className="text-muted-foreground leading-relaxed mb-2">
          Classical portfolio theory measures risk as variance, but investors care about the <em>full distribution</em> of returns—not just second moments.
          This module extends risk assessment beyond mean-variance to include downside risk (LPM), distribution shape (skewness & kurtosis), and performance attribution.
        </p>
      </div>

      {/* 1. Variance & Volatility */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">1. Variance & Volatility: Second-Moment Risk</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p className="text-foreground">Var(r) = E[(r − μ)<sup>2</sup>]</p>
          <p className="text-foreground mt-1">σ = √Var(r)</p>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          <strong className="text-foreground">Interpretation:</strong> Variance measures dispersion around the mean; volatility (σ) is its square root in return units.
        </p>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Limitation:</strong> Treats upside and downside deviations symmetrically—investors actually dislike downside more.
        </p>
      </div>

      {/* 2. Distribution Shape: Skewness & Kurtosis */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">2. Distribution Shape: Skewness & Kurtosis (3rd & 4th Moments)</h3>
        
        {/* Skewness */}
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-semibold text-foreground mb-2">Skewness (Asymmetry)</h4>
          <div className="bg-white p-3 rounded font-mono text-sm border border-blue-200 mb-2">
            <p className="text-foreground">Skew = E[(r − μ)<sup>3</sup>] / σ<sup>3</sup></p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong className="text-foreground">Positive skew &gt; 0:</strong> Long right tail → occasional big gains (lottery-like)</li>
            <li>• <strong className="text-foreground">Negative skew &lt; 0:</strong> Long left tail → occasional big losses (crash risk)</li>
            <li>• <strong className="text-foreground">Zero skew:</strong> Symmetric distribution (normal)</li>
          </ul>
        </div>

        {/* Kurtosis */}
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
          <h4 className="font-semibold text-foreground mb-2">Kurtosis (Tail Thickness)</h4>
          <div className="bg-white p-3 rounded font-mono text-sm border border-green-200 mb-2">
            <p className="text-foreground">Kurt = E[(r − μ)<sup>4</sup>] / σ<sup>4</sup></p>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong className="text-foreground">Normal distribution:</strong> Kurt = 3</li>
            <li>• <strong className="text-foreground">Excess kurtosis &gt; 3:</strong> Fat tails → extreme events more likely</li>
            <li>• <strong className="text-foreground">Kurt &lt; 3:</strong> Thin tails → fewer extremes than normal</li>
          </ul>
        </div>

        {/* Jarque-Bera Test */}
        <div className="p-3 bg-purple-50 rounded border border-purple-200">
          <h4 className="font-semibold text-foreground mb-2">Jarque-Bera Normality Test</h4>
          <div className="bg-white p-3 rounded font-mono text-sm border border-purple-200 mb-2">
            <p className="text-foreground">JB = (n/6)[Skew<sup>2</sup> + (Kurt − 3)<sup>2</sup>/4]</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Tests if returns are normally distributed. <strong className="text-foreground">JB &gt; critical value</strong> (or p-value &lt; 0.05) → reject normality → variance alone is insufficient.
          </p>
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> Two portfolios can have identical σ but vastly different risk experiences. Negative skew = crash exposure; high kurtosis = tail risk. Both demand risk premiums.</p>
        </div>
      </div>

      {/* 3. Performance Ratios */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">3. Risk-Adjusted Performance Ratios</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Sharpe Ratio</p>
            <p className="font-mono text-sm mb-1 text-foreground">SR = (R<sub>p</sub> − R<sub>f</sub>) / σ<sub>p</sub></p>
            <p className="text-muted-foreground">Excess return per unit of <em>total</em> volatility</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Treynor Ratio</p>
            <p className="font-mono text-sm mb-1 text-foreground">TR = (R<sub>p</sub> − R<sub>f</sub>) / β<sub>p</sub></p>
            <p className="text-muted-foreground">Excess return per unit of <em>systematic</em> risk (beta)</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Information Ratio</p>
            <p className="font-mono text-sm mb-1 text-foreground">IR = α<sub>p</sub> / σ<sub>ε</sub></p>
            <p className="text-muted-foreground">Alpha per unit of <em>idiosyncratic</em> (tracking) error</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Jensen's Alpha</p>
            <p className="font-mono text-sm mb-1 text-foreground">α = R<sub>p</sub> − [R<sub>f</sub> + β<sub>p</sub>(R<sub>m</sub> − R<sub>f</sub>)]</p>
            <p className="text-muted-foreground">Absolute CAPM outperformance (manager skill)</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Modigliani-Modigliani (M²)</p>
            <p className="font-mono text-sm mb-1 text-foreground">M² = R<sub>p,adj</sub> − R<sub>m</sub></p>
            <p className="text-muted-foreground">Sharpe ratio expressed as percentage return (easier comparison)</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
          <p className="text-sm text-foreground"><strong>When to use which?</strong> Sharpe if portfolio is standalone; Treynor if part of diversified holdings; IR for active management evaluation.</p>
        </div>
      </div>

      {/* 4. Lower Partial Moments (LPM) */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">4. Lower Partial Moments (LPM): Asymmetric Downside Risk</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Variance treats upside and downside volatility equally. LPM focuses only on <em>shortfalls</em> below a threshold τ, aligning with investor loss aversion.
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p className="text-foreground mb-2">LPM<sub>n</sub>(τ) = E[(max(0, τ − r))<sup>n</sup>]</p>
          <p className="text-xs text-muted-foreground">
            • n = 1: Mean shortfall (expected loss below τ)<br/>
            • n = 2: Semivariance (downside volatility squared)<br/>
            • τ: Threshold (often 0, r<sub>f</sub>, or target return)
          </p>
        </div>
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-foreground"><strong>Economic intuition:</strong> Investors dislike downside more than they enjoy upside. LPM<sub>2</sub> penalizes only losses → closer to actual preferences than variance.</p>
        </div>
      </div>

      {/* 5. Return-LPM Frontier */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">5. Return–LPM Efficient Frontier</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Analogous to mean-variance frontier, but optimizes <em>expected return vs. LPM</em> instead of σ.
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p className="text-foreground">min<sub>w</sub> LPM<sub>n</sub>(τ)</p>
          <p className="text-foreground">s.t. E[r<sub>p</sub>] = μ<sub>target</sub>, Σw<sub>i</sub> = 1</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Portfolios on this frontier minimize downside risk for each return level. Can yield different asset allocations than mean-variance, especially when returns are skewed.
        </p>
      </div>

      {/* 6. Stochastic Dominance (SD) */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">6. Stochastic Dominance: Ranking Without Assumptions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-semibold text-foreground">Order</th>
                <th className="text-left p-2 font-semibold text-foreground">Utility Restriction</th>
                <th className="text-left p-2 font-semibold text-foreground">Investor Preference</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="p-2">FSD (1st)</td>
                <td className="p-2 font-mono">U′ &gt; 0</td>
                <td className="p-2">Non-satiation (more is better)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2">SSD (2nd)</td>
                <td className="p-2 font-mono">U′ &gt; 0, U″ &lt; 0</td>
                <td className="p-2">Risk aversion</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2">TSD (3rd)</td>
                <td className="p-2 font-mono">U′ &gt; 0, U″ &lt; 0, U‴ &gt; 0</td>
                <td className="p-2">Skewness preference (dislike negative skew)</td>
              </tr>
              <tr>
                <td className="p-2">4th Order</td>
                <td className="p-2 font-mono">+ U″″ &lt; 0</td>
                <td className="p-2">Kurtosis aversion (dislike fat tails)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> SD provides preference-free rankings. If A dominates B by SSD, <em>all</em> risk-averse investors prefer A. Goes beyond mean-variance without normality.</p>
        </div>
      </div>

      {/* 7. Connecting Everything */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">7. Why Variance Alone Is Not Enough</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Non-normal returns:</strong> If skew ≠ 0 or kurt ≠ 3, variance misses tail risk and asymmetry</li>
          <li><strong className="text-foreground">Loss aversion:</strong> Investors dislike downside more → LPM and downside deviations matter</li>
          <li><strong className="text-foreground">Diversification limits:</strong> Portfolios reduce σ but not necessarily skew or kurtosis</li>
          <li><strong className="text-foreground">Performance evaluation:</strong> Sharpe ratio can rank portfolios incorrectly if distributions differ in shape</li>
        </ul>
        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-foreground"><strong>Practical takeaway:</strong> Always check skewness, kurtosis, and JB test. If non-normal, supplement variance-based metrics with LPM, downside deviation, or SD criteria.</p>
        </div>
      </div>

      {/* Final Summary */}
      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
        <h3 className="text-lg font-semibold mb-2 text-foreground">So What?</h3>
        <p className="text-sm text-foreground">
          Risk is multi-dimensional. Variance captures dispersion; skewness reveals asymmetry; kurtosis shows tail risk. LPM isolates downside; SD ranks without distribution assumptions.
          Together, they provide a complete risk picture—essential for portfolio construction, performance attribution, and understanding when mean-variance theory breaks down.
        </p>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Risk" theory={theory}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-performance">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="lpm-frontier" data-testid="tab-lpm-frontier">LPM & Frontier</TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics">Ratios & Performance</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Simulation Mode Controls */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Interactive Simulation Mode</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate synthetic distributions to explore how skewness and kurtosis affect normality and risk metrics
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="simulation-mode"
                  checked={simulationMode}
                  onCheckedChange={setSimulationMode}
                  data-testid="switch-simulation-mode"
                />
                <Label htmlFor="simulation-mode" className="cursor-pointer">
                  {simulationMode ? "Simulation" : "Real Data"}
                </Label>
              </div>
            </div>

            {simulationMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {/* Mean Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sim-mean-slider" className="text-sm font-medium">
                      Mean (μ)
                    </Label>
                    <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-sim-mean">
                      {(simMean * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Slider
                    id="sim-mean-slider"
                    min={-0.005}
                    max={0.005}
                    step={0.0001}
                    value={[simMean]}
                    onValueChange={(value) => setSimMean(value[0])}
                    data-testid="slider-sim-mean"
                  />
                  <p className="text-xs text-muted-foreground">Center of distribution</p>
                </div>

                {/* Volatility Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sim-vol-slider" className="text-sm font-medium">
                      Volatility (σ)
                    </Label>
                    <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-sim-vol">
                      {(simVolatility * 100).toFixed(2)}%
                    </span>
                  </div>
                  <Slider
                    id="sim-vol-slider"
                    min={0.005}
                    max={0.05}
                    step={0.001}
                    value={[simVolatility]}
                    onValueChange={(value) => setSimVolatility(value[0])}
                    data-testid="slider-sim-vol"
                  />
                  <p className="text-xs text-muted-foreground">Controls spread</p>
                </div>

                {/* Skewness Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sim-skew-slider" className="text-sm font-medium">
                      Skewness
                    </Label>
                    <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-sim-skew">
                      {simSkewness.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    id="sim-skew-slider"
                    min={-1.5}
                    max={1.5}
                    step={0.1}
                    value={[simSkewness]}
                    onValueChange={(value) => setSimSkewness(value[0])}
                    data-testid="slider-sim-skew"
                  />
                  <p className="text-xs text-muted-foreground">Negative = left tail, positive = right tail</p>
                </div>

                {/* Kurtosis Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sim-kurt-slider" className="text-sm font-medium">
                      Kurtosis (Excess)
                    </Label>
                    <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-sim-kurt">
                      {simKurtosis.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    id="sim-kurt-slider"
                    min={-1}
                    max={6}
                    step={0.1}
                    value={[simKurtosis]}
                    onValueChange={(value) => setSimKurtosis(value[0])}
                    data-testid="slider-sim-kurt"
                  />
                  <p className="text-xs text-muted-foreground">Controls fat tails (higher = more extreme events)</p>
                </div>

                {/* Sample Size Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="sim-size-slider" className="text-sm font-medium">
                      Sample Size (n)
                    </Label>
                    <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-sim-size">
                      {simSampleSize}
                    </span>
                  </div>
                  <Slider
                    id="sim-size-slider"
                    min={100}
                    max={5000}
                    step={100}
                    value={[simSampleSize]}
                    onValueChange={(value) => setSimSampleSize(value[0])}
                    data-testid="slider-sim-size"
                  />
                  <p className="text-xs text-muted-foreground">Number of simulated returns</p>
                </div>

                {/* Reset Button */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSimMean(0.000);
                      setSimVolatility(0.02);
                      setSimSkewness(0.0);
                      setSimKurtosis(0.0);
                      setSimSampleSize(1000);
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    data-testid="button-reset-simulation"
                  >
                    Reset to Normal
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Distribution Shape Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard 
              label="Mean" 
              value={displayData?.metrics?.mean || 0} 
              format="percentage"
              precision={2}
              data-testid="metric-mean"
            />
            <MetricCard 
              label="Volatility (σ)" 
              value={displayData?.metrics?.std || 0} 
              format="percentage"
              precision={2}
              data-testid="metric-std"
            />
            <MetricCard 
              label="Skewness" 
              value={displayData?.metrics?.skew || 0} 
              precision={3}
              data-testid="metric-skew"
            />
            <MetricCard 
              label="Kurtosis (Excess)" 
              value={displayData?.metrics?.kurt || 0} 
              precision={3}
              data-testid="metric-kurt"
            />
            <MetricCard 
              label="JB Statistic" 
              value={displayData?.metrics?.jb_stat || 0} 
              precision={2}
              data-testid="metric-jb"
            />
          </div>

          {/* Interpretation Card */}
          {displayData?.metrics && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="text-sm font-semibold mb-2 text-foreground">
                {simulationMode ? "Simulated Distribution Analysis" : "Distribution Analysis"}
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                {displayData.metrics.skew < -0.5 && (
                  <p>• <strong className="text-foreground">Negative skewness ({displayData.metrics.skew.toFixed(2)})</strong> → Long left tail: occasional large losses dominate risk perception</p>
                )}
                {displayData.metrics.skew > 0.5 && (
                  <p>• <strong className="text-foreground">Positive skewness ({displayData.metrics.skew.toFixed(2)})</strong> → Long right tail: occasional large gains (lottery-like)</p>
                )}
                {displayData.metrics.kurt > 1 && (
                  <p>• <strong className="text-foreground">Excess kurtosis ({displayData.metrics.kurt.toFixed(2)})</strong> → Fat tails: extreme events more likely than normal distribution</p>
                )}
                {displayData.metrics.jb_pvalue < 0.05 && (
                  <p>• <strong className="text-foreground">JB test rejects normality (p={displayData.metrics.jb_pvalue.toFixed(3)})</strong> → Variance alone is insufficient; consider LPM or higher moments</p>
                )}
                {displayData.metrics.jb_pvalue >= 0.05 && (
                  <p>• <strong className="text-foreground">JB test does not reject normality (p={displayData.metrics.jb_pvalue.toFixed(3)})</strong> → Returns approximately normal</p>
                )}
                {simulationMode && (
                  <p className="mt-2 pt-2 border-t border-blue-300">
                    • <strong className="text-foreground">Interactive Mode:</strong> Adjust sliders above to see how skewness and kurtosis affect tail risk, normality tests, and distribution shape
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Histogram with Normal Overlay */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">
              {simulationMode ? "Simulated Distribution with Normal Overlay" : "Return Distribution with Normal Overlay"}
            </h2>
            <div className="h-96">
              {displayData ? (
                <Plot
                  data={[
                    {
                      x: displayData.histogram.map((b: any) => b.bin_center),
                      y: displayData.histogram.map((b: any) => b.density),
                      type: "bar",
                      name: simulationMode ? "Simulated Returns" : "Actual Returns",
                      marker: { color: "#3b82f6", opacity: 0.7 },
                    },
                    {
                      x: displayData.normal_curve_x,
                      y: displayData.normal_curve_y,
                      type: "scatter",
                      mode: "lines",
                      name: "Normal Distribution",
                      line: { color: "#ef4444", width: 3 },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Monthly Return", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Density", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    showlegend: true,
                    legend: { x: 0.7, y: 0.95, bgcolor: "rgba(255,255,255,0.9)" },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">
                    {displayLoading ? "Computing distribution..." : "No distribution data"}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* QQ Plot */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Q-Q Plot: Normal Quantiles vs. Sample Quantiles</h2>
            <div className="h-96">
              {displayData ? (
                <Plot
                  data={[
                    {
                      x: displayData.qq_theoretical,
                      y: displayData.qq_sample,
                      type: "scatter",
                      mode: "markers",
                      name: "Sample Quantiles",
                      marker: { color: "#3b82f6", size: 6 },
                    },
                    {
                      x: displayData.qq_theoretical,
                      y: displayData.qq_theoretical,
                      type: "scatter",
                      mode: "lines",
                      name: "Normal Line",
                      line: { color: "#ef4444", width: 2, dash: "dash" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Theoretical Quantiles (Normal)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Sample Quantiles", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    showlegend: true,
                    legend: { x: 0.05, y: 0.95, bgcolor: "rgba(255,255,255,0.9)" },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">
                    {displayLoading ? "Computing Q-Q plot..." : "No Q-Q data"}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Interpretation:</strong> Points along the red line indicate normality. Deviations reveal distribution shape: 
              S-curve suggests fat tails (high kurtosis); upward/downward curve indicates skewness.
              {simulationMode && <span className="ml-1">Try adjusting kurtosis to see fat tails appear or skewness to create asymmetric curves.</span>}
            </p>
          </Card>
        </TabsContent>

        {/* Tab 2: LPM & Frontier */}
        <TabsContent value="lpm-frontier" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">LPM Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="tau-slider">Threshold τ (Target Return)</Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-tau">
                    {tau.toFixed(3)}
                  </span>
                </div>
                <Slider
                  id="tau-slider"
                  min={-0.03}
                  max={0.03}
                  step={0.001}
                  value={[tau]}
                  onValueChange={(value) => setTau(value[0])}
                  data-testid="slider-tau"
                />
                <p className="text-xs text-muted-foreground">
                  Returns below this threshold contribute to downside risk
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="n-slider">Moment Order n</Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-n">
                    {n.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="n-slider"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[n]}
                  onValueChange={(value) => setN(value[0])}
                  data-testid="slider-n"
                />
                <p className="text-xs text-muted-foreground">
                  n=1: linear, n=2: semivariance, n=3: higher penalty
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Return–LPM Efficient Frontier</h2>
            <div className="h-96">
              {frontierData?.frontier?.length > 0 ? (
                <Plot
                  data={[
                    {
                      x: frontierData.frontier.map((p: any) => p.lpm),
                      y: frontierData.frontier.map((p: any) => p.target_return * 100),
                      type: "scatter",
                      mode: "lines+markers",
                      name: `LPM Frontier (τ=${tau.toFixed(3)}, n=${n.toFixed(1)})`,
                      line: { color: "#3b82f6", width: 3 },
                      marker: { size: 6, color: "#3b82f6" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: `LPM${n.toFixed(1)}(τ=${tau.toFixed(3)})`, 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Expected Return (%)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    showlegend: true,
                    legend: { x: 0.02, y: 0.98, bgcolor: "rgba(255,255,255,0.9)" },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">
                    {frontierLoading ? "Computing LPM frontier..." : "No frontier data"}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Interpretation:</strong> The Return–LPM frontier shows optimal portfolios minimizing downside risk 
              for each level of expected return. Unlike traditional mean-variance, it penalizes only losses below threshold τ.
            </p>
          </Card>
        </TabsContent>

        {/* Tab 3: Ratios & Performance */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard 
              label="Avg Sharpe" 
              value={metricsData?.metrics ? 
                metricsData.metrics.reduce((sum: number, m: any) => sum + m.sharpe, 0) / metricsData.metrics.length : 
                0
              } 
              precision={3} 
              data-testid="metric-sharpe"
            />
            <MetricCard 
              label="Avg Treynor" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.treynor !== null)
                  .reduce((sum: number, m: any) => sum + (m.treynor || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.treynor !== null).length : 
                0
              } 
              precision={3} 
              data-testid="metric-treynor"
            />
            <MetricCard 
              label="Avg Info Ratio" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.info_ratio !== null)
                  .reduce((sum: number, m: any) => sum + (m.info_ratio || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.info_ratio !== null).length : 
                0
              } 
              precision={3} 
              data-testid="metric-info-ratio"
            />
            <MetricCard 
              label="Avg Jensen α" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.jensen_alpha !== null)
                  .reduce((sum: number, m: any) => sum + (m.jensen_alpha || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.jensen_alpha !== null).length : 
                0
              } 
              format="percentage" 
              data-testid="metric-jensen"
            />
            <MetricCard 
              label="Avg M²" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.m2 !== null)
                  .reduce((sum: number, m: any) => sum + (m.m2 || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.m2 !== null).length : 
                0
              } 
              format="percentage" 
              data-testid="metric-m2"
            />
          </div>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Performance Comparison</h2>
            <div className="h-96">
              {metricsData?.metrics?.length > 0 ? (
                <Plot
                  data={[
                    {
                      x: metricsData.metrics.map((m: any) => m.ticker),
                      y: metricsData.metrics.map((m: any) => m.sharpe),
                      type: "bar",
                      name: "Sharpe Ratio",
                      marker: { color: "#3b82f6" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Asset", 
                      gridcolor: "#e5e7eb",
                    },
                    yaxis: { 
                      title: "Sharpe Ratio", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 80 },
                    showlegend: false,
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">Loading metrics...</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Detailed Metrics Table</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Volatility</TableHead>
                    <TableHead className="text-right">Sharpe</TableHead>
                    <TableHead className="text-right">Treynor</TableHead>
                    <TableHead className="text-right">Info Ratio</TableHead>
                    <TableHead className="text-right">Jensen α</TableHead>
                    <TableHead className="text-right">M²</TableHead>
                    <TableHead className="text-right">Beta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsData?.metrics?.map((metric: any) => (
                    <TableRow key={metric.ticker} data-testid={`row-metric-${metric.ticker}`}>
                      <TableCell className="font-medium">{metric.ticker}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {(metric.mean * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {(metric.std * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.sharpe.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.treynor !== null ? metric.treynor.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.info_ratio !== null ? metric.info_ratio.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.jensen_alpha !== null ? (metric.jensen_alpha * 100).toFixed(2) + "%" : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.m2 !== null ? (metric.m2 * 100).toFixed(2) + "%" : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.beta !== null ? metric.beta.toFixed(3) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </ModuleLayout>
  );
}
