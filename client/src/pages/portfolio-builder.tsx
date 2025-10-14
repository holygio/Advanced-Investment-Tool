import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import Plot from "react-plotly.js";
import { useToast } from "@/hooks/use-toast";
import { useGlobalState } from "@/contexts/global-state-context";

export default function PortfolioBuilder() {
  const { globalState } = useGlobalState();
  const interval = "1wk";  // Fixed to weekly frequency
  const { toast } = useToast();
  const lastOptimizedParams = useRef<string | null>(null);

  // Fetch price data
  const { data: priceData, isLoading: loadingPrices } = useQuery({
    queryKey: ["/api/data/prices", globalState.tickers, globalState.startDate, globalState.endDate, interval],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: globalState.tickers,
          start: globalState.startDate,
          end: globalState.endDate,
          interval: interval,
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: globalState.tickers.length > 0,
  });

  // Calculate efficient frontier
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      if (!priceData?.returns) {
        throw new Error("No price data available");
      }
      
      const response = await apiRequest("/api/portfolio/efficient-frontier", {
        method: "POST",
        body: JSON.stringify({
          returns: priceData.returns,
          rf: globalState.riskFreeRate,
          allow_short: globalState.allowShortSelling,
          max_weight: globalState.maxWeight,
          interval: interval,
        }),
      });
      
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Optimization Complete",
        description: "Portfolio optimization completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize portfolio",
        variant: "destructive",
      });
    },
  });

  const frontierData = optimizeMutation.data;

  // Auto-trigger optimization when price data loads OR constraints change
  useEffect(() => {
    if (priceData?.returns && !loadingPrices && !optimizeMutation.isPending) {
      const currentParams = JSON.stringify({
        tickers: globalState.tickers,
        rf: globalState.riskFreeRate,
        allowShort: globalState.allowShortSelling,
        maxWeight: globalState.maxWeight
      });
      
      // Only optimize if parameters have changed
      if (lastOptimizedParams.current !== currentParams) {
        lastOptimizedParams.current = currentParams;
        // Reset mutation data before re-optimizing to prevent showing stale results
        optimizeMutation.reset();
        optimizeMutation.mutate();
      }
    }
  }, [priceData, loadingPrices, globalState.riskFreeRate, globalState.allowShortSelling, globalState.maxWeight]);

  // Calculate correlation matrix for heatmap
  const correlationData = priceData?.returns ? (() => {
    const tickers = Object.keys(priceData.returns);
    const n = tickers.length;
    const correlations: number[][] = [];
    
    // Extract return values
    const returnsData: Record<string, number[]> = {};
    for (const ticker of tickers) {
      returnsData[ticker] = priceData.returns[ticker].map((r: any) => r.ret);
    }
    
    // Calculate correlation matrix
    for (let i = 0; i < n; i++) {
      correlations[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlations[i][j] = 1;
        } else {
          const x = returnsData[tickers[i]];
          const y = returnsData[tickers[j]];
          const len = Math.min(x.length, y.length);
          
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
          for (let k = 0; k < len; k++) {
            sumX += x[k];
            sumY += y[k];
            sumXY += x[k] * y[k];
            sumX2 += x[k] * x[k];
            sumY2 += y[k] * y[k];
          }
          
          const numerator = len * sumXY - sumX * sumY;
          const denominator = Math.sqrt((len * sumX2 - sumX * sumX) * (len * sumY2 - sumY * sumY));
          correlations[i][j] = denominator !== 0 ? numerator / denominator : 0;
        }
      }
    }
    
    return { matrix: correlations, tickers };
  })() : null;

  const theory = (
    <div className="space-y-6 py-6">
      {/* Intuitive Motivation */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Mean-Variance Portfolio Theory</h2>
        <p className="text-muted-foreground leading-relaxed mb-2">
          Investors choose among risky assets by trading off expected return vs risk. Risk is measured by the variance of portfolio returns; return by the expected mean.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Portfolio selection is thus a two-dimensional optimization problem — how to maximize expected utility given risk aversion.
        </p>
      </div>

      {/* Fundamental Assumptions (A1-A7) */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Fundamental Assumptions (A1–A7)</h3>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A1: Nonsatiation</p>
            <p className="text-muted-foreground">More return is preferred to less. Utility is monotonic in wealth.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A2: Risk Aversion</p>
            <p className="text-muted-foreground">Investors dislike risk for equal expected returns. U''(W) &lt; 0.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A3: Single Period</p>
            <p className="text-muted-foreground">One investment horizon → decisions based on final wealth.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A4: Mean-Variance Preferences</p>
            <p className="text-muted-foreground">Utility depends only on E[r] and Var[r] (≈ quadratic utility or normal returns).</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A5: No Market Frictions</p>
            <p className="text-muted-foreground">No taxes, transaction costs, or liquidity issues.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A6: Homogeneous Information</p>
            <p className="text-muted-foreground">Everyone has the same information about returns and risks.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A7: Divisible Assets</p>
            <p className="text-muted-foreground">Assets can be bought in any fractional amount.</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-foreground"><strong>Why these matter:</strong> They simplify utility maximization so that risk is summarized by variance alone. If any assumption fails → the frontier bends, frictions appear, or expected utility is no longer linear in mean–variance.</p>
        </div>
      </div>

      {/* Mathematical Core */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Mathematical Core</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Let r = (r₁, …, rₙ)′ with expected returns μ = E[r] and covariance Σ. Portfolio weights ω satisfy 1′ω = 1.
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">E[r<sub>p</sub>] = ω′μ</p>
          <p className="text-foreground">Var(r<sub>p</sub>) = ω′Σω</p>
          <p className="text-foreground mt-3">Optimization problem:</p>
          <p className="text-foreground">min<sub>ω</sub> ω′Σω</p>
          <p className="text-foreground">s.t. ω′μ = μ*, 1′ω = 1</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Solution set → efficient frontier (curved "bullet" in E[r]–σ space). Each point represents a minimum-variance portfolio for given return.
        </p>
      </div>

      {/* Lagrangian Solution */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Lagrangian Solution</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">L = ω′Σω − λ₁(ω′μ − μ*) − λ₂(ω′1 − 1)</p>
          <p className="text-foreground mt-3">Closed-form solution:</p>
          <p className="text-foreground">ω = A⁻¹(λ₁μ + λ₂1) where A = Σ⁻¹</p>
          <p className="text-foreground mt-3">Frontier equation:</p>
          <p className="text-foreground">σ²<sub>p</sub> = (Aμ*² − 2Bμ* + C) / (AC − B²)</p>
          <p className="text-sm text-muted-foreground mt-2">with A = 1′A1, B = 1′Aμ, C = μ′Aμ</p>
        </div>
      </div>

      {/* Risk-Free Asset & CML */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Capital Market Line (CML)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Allow asset f with return r<sub>f</sub> and zero variance → new feasible set becomes linear:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
          <p className="text-foreground">E[r<sub>p</sub>] = r<sub>f</sub> + [(E[r<sub>M</sub>] − r<sub>f</sub>) / σ<sub>M</sub>] × σ<sub>p</sub></p>
        </div>
        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground mb-2"><strong>Two-Fund Separation Theorem:</strong></p>
          <p className="text-sm text-muted-foreground">Any efficient portfolio is a combination of the risk-free asset and one risky portfolio. Same risky portfolio (M = tangency) for everyone, different amounts of leverage depending on risk aversion.</p>
        </div>
      </div>

      {/* Economic Intuition */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Economic Intuition</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Diversification</strong> reduces idiosyncratic risk — only systematic risk remains</li>
          <li><strong className="text-foreground">Adding risk-free asset</strong> transforms the curved frontier into a straight line</li>
          <li><strong className="text-foreground">Same CML, different points:</strong> All investors face the same CML but pick different points on it</li>
        </ul>
      </div>

      {/* Extensions & Limitations */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Extensions & Limitations</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Correlations &lt; 1 create risk reduction</p>
          <p>• If short sales disallowed → frontier is piecewise linear</p>
          <p>• Non-normal returns → variance insufficient → higher moments matter (see Risk Analysis module)</p>
          <p>• Estimation error in μ, Σ → unstable weights → use robust or Bayesian methods</p>
        </div>
      </div>

      {/* So What? */}
      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
        <h3 className="text-lg font-semibold mb-2 text-foreground">So What?</h3>
        <p className="text-sm text-foreground">
          Portfolio theory defines the geometry of risk and return — it's the foundation for CAPM and every modern factor model. 
          Understanding the efficient frontier is essential for asset allocation, performance measurement, and risk management.
        </p>
      </div>
    </div>
  );

  const handleExportCSV = () => {
    if (!frontierData?.tangency) return;
    
    const weights = frontierData.tangency.weights;
    const csv = [
      ["Ticker", "Weight", "Allocation"],
      ...Object.entries(weights).map(([ticker, weight]) => [
        ticker,
        (weight as number).toFixed(4),
        `${((weight as number) * 100).toFixed(2)}%`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimal_portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModuleLayout title="Portfolio Builder" theory={theory}>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          label="Expected Return" 
          value={frontierData?.tangency?.return || 0} 
          format="percentage" 
        />
        <MetricCard 
          label="Volatility (σ)" 
          value={frontierData?.tangency?.risk || 0} 
          format="percentage" 
        />
        <MetricCard 
          label="Sharpe Ratio" 
          value={frontierData?.tangency?.sharpe || 0} 
          precision={3} 
        />
        <MetricCard 
          label="Risk-Free Rate" 
          value={globalState.riskFreeRate} 
          format="percentage" 
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Efficient Frontier */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Efficient Frontier</h2>
          <div className="h-96">
            {frontierData ? (
              <Plot
                data={[
                  {
                    x: frontierData.frontier.map((p: any) => p.risk),
                    y: frontierData.frontier.map((p: any) => p.return),
                    type: "scatter",
                    mode: "lines",
                    name: "Efficient Frontier",
                    line: { color: "#2563eb", width: 3 },
                  },
                  {
                    x: frontierData.cml.map((p: any) => p.risk),
                    y: frontierData.cml.map((p: any) => p.return),
                    type: "scatter",
                    mode: "lines",
                    name: "Capital Market Line",
                    line: { color: "#dc2626", width: 2, dash: "dash" },
                  },
                  {
                    x: [frontierData.tangency.risk],
                    y: [frontierData.tangency.return],
                    type: "scatter",
                    mode: "markers",
                    name: "Tangency Portfolio",
                    marker: { size: 14, color: "#16a34a", symbol: "star" },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: { 
                    title: "Risk (σ)", 
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                    zeroline: false,
                  },
                  yaxis: { 
                    title: "Expected Return", 
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                    zeroline: false,
                  },
                  margin: { l: 60, r: 20, t: 20, b: 60 },
                  showlegend: true,
                  legend: { x: 0.02, y: 0.98 },
                }}
                config={{ responsive: true }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                <p className="text-sm text-muted-foreground">
                  {loadingPrices ? "Loading data..." : optimizeMutation.isPending ? "Optimizing..." : "Click 'Load Data & Optimize' to begin"}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Portfolio Allocation Pie Chart */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Optimal Allocation</h2>
          <div className="h-96">
            {frontierData?.tangency ? (
              <Plot
                data={[
                  {
                    type: "pie",
                    labels: Object.keys(frontierData.tangency.weights),
                    values: Object.values(frontierData.tangency.weights),
                    textinfo: "label+percent",
                    textposition: "auto",
                    marker: {
                      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"],
                    },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  margin: { l: 20, r: 20, t: 20, b: 20 },
                  showlegend: true,
                  legend: { x: 1, xanchor: "right", y: 0.5 },
                }}
                config={{ responsive: true }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                <p className="text-sm text-muted-foreground">Awaiting optimization...</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Correlation Heatmap and Weights Table Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Correlation Heatmap */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Correlation Matrix</h2>
          <div className="h-96">
            {correlationData ? (
              <Plot
                data={[
                  {
                    type: "heatmap",
                    z: correlationData.matrix,
                    x: correlationData.tickers,
                    y: correlationData.tickers,
                    colorscale: [
                      [0, "#1e40af"],
                      [0.5, "#f3f4f6"],
                      [1, "#dc2626"],
                    ],
                    zmid: 0,
                    text: correlationData.matrix.map(row => 
                      row.map(val => val.toFixed(2))
                    ),
                    texttemplate: "%{text}",
                    textfont: { size: 10 },
                    colorbar: { title: "Correlation" },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 11 },
                  margin: { l: 60, r: 80, t: 20, b: 60 },
                  xaxis: { side: "bottom" },
                  yaxis: { autorange: "reversed" },
                }}
                config={{ responsive: true }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                <p className="text-sm text-muted-foreground">Loading correlations...</p>
              </div>
            )}
          </div>
        </Card>

        {/* Weights Table */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Optimal Portfolio Weights</h2>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-export-csv"
              onClick={handleExportCSV}
              disabled={!frontierData?.tangency}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          {frontierData?.tangency ? (
            <DataTable
              data={Object.entries(frontierData.tangency.weights).map(([ticker, weight]) => ({
                ticker,
                weight,
              }))}
              columns={[
                { key: "ticker", label: "Ticker", align: "left" },
                { 
                  key: "weight", 
                  label: "Weight", 
                  align: "right",
                  format: (v) => `${(v * 100).toFixed(2)}%`
                },
              ]}
            />
          ) : (
            <div className="h-64 bg-background/50 rounded-md flex items-center justify-center border border-border">
              <p className="text-sm text-muted-foreground">Awaiting optimization...</p>
            </div>
          )}
        </Card>
      </div>
    </ModuleLayout>
  );
}
