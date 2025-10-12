import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
        weight.toFixed(4),
        `${(weight * 100).toFixed(2)}%`,
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-6">Export Results</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Portfolio is automatically optimized using weekly returns. Adjust parameters in the left sidebar to see updated results.
              </p>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              data-testid="button-export-csv"
              onClick={handleExportCSV}
              disabled={!frontierData?.tangency}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </Card>

        {/* Chart Area */}
        <Card className="lg:col-span-2 p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Efficient Frontier</h2>
          </div>
          
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
                    marker: { size: 12, color: "#16a34a", symbol: "star" },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#000", family: "Inter, sans-serif", size: 12 },
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
                  {loadingPrices ? "Loading price data..." : optimizeMutation.isPending ? "Optimizing portfolio..." : "Configure portfolio in the left sidebar to begin"}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Weights Table */}
      {frontierData?.tangency && (
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">Optimal Portfolio Weights</h2>
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
        </Card>
      )}
    </ModuleLayout>
  );
}
