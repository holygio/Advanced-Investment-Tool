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
      <div>
        <h2 className="text-2xl font-semibold mb-4">Mean-Variance Portfolio Theory</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Portfolio theory provides a framework for constructing optimal portfolios that maximize expected
          return for a given level of risk, or minimize risk for a given expected return.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">The Efficient Frontier</h3>
        <p className="text-sm text-muted-foreground mb-3">
          The efficient frontier is constructed from expected returns (μ) and covariance matrix (Σ):
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>Minimize: ω'Σω</p>
          <p>Subject to: ω'μ = R<sub>target</sub></p>
          <p className="mt-2">where ω = portfolio weights</p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Capital Market Line (CML)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          With a risk-free asset, investors combine the tangency portfolio with the risk-free rate:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>E[R<sub>p</sub>] = R<sub>f</sub> + [(E[R<sub>M</sub>] - R<sub>f</sub>) / σ<sub>M</sub>] × σ<sub>p</sub></p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Key Assumptions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>Investors are risk-averse and maximize expected utility</li>
          <li>Returns are normally distributed</li>
          <li>Investors have homogeneous expectations</li>
          <li>Markets are frictionless (no transaction costs or taxes)</li>
          <li>Assets are infinitely divisible</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Two-Fund Separation</h3>
        <p className="text-sm text-muted-foreground">
          Every optimal portfolio can be constructed as a combination of just two portfolios: the risk-free
          asset and the tangency portfolio. This powerful result simplifies portfolio construction regardless
          of individual risk preferences.
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
