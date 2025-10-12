import { useState } from "react";
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

export default function PortfolioBuilder() {
  // Get global state from context/localStorage or use defaults
  const [globalState] = useState({
    tickers: ["AAPL", "MSFT", "META", "TSLA", "NVDA", "^GSPC"],
    startDate: "2018-01-01",
    endDate: new Date().toISOString().split("T")[0],
    riskFreeRate: 0.02,
    marketProxy: "^GSPC",
  });
  const [allowShort, setAllowShort] = useState(false);
  const [interval, setInterval] = useState<"1d" | "1wk" | "1mo">("1wk");
  const { toast } = useToast();

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
          allow_short: allowShort,
        }),
      });
      
      return response;
    },
    onSuccess: () => {
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
          <h2 className="text-xl font-semibold mb-6">Optimization Settings</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interval-select">Rebalance Frequency</Label>
              <select
                id="interval-select"
                data-testid="select-interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value as "1d" | "1wk" | "1mo")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1d">Daily</option>
                <option value="1wk">Weekly</option>
                <option value="1mo">Monthly</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="allow-short" className="text-sm">
                Allow Short Selling
              </Label>
              <Switch
                id="allow-short"
                data-testid="switch-allow-short"
                checked={allowShort}
                onCheckedChange={setAllowShort}
              />
            </div>

            <Button 
              className="w-full" 
              data-testid="button-optimize"
              onClick={() => optimizeMutation.mutate()}
              disabled={loadingPrices || optimizeMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {optimizeMutation.isPending ? "Optimizing..." : "Optimize Portfolio"}
            </Button>

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
                    line: { color: "hsl(var(--primary))", width: 3 },
                  },
                  {
                    x: frontierData.cml.map((p: any) => p.risk),
                    y: frontierData.cml.map((p: any) => p.return),
                    type: "scatter",
                    mode: "lines",
                    name: "Capital Market Line",
                    line: { color: "hsl(var(--accent))", width: 2, dash: "dash" },
                  },
                  {
                    x: [frontierData.tangency.risk],
                    y: [frontierData.tangency.return],
                    type: "scatter",
                    mode: "markers",
                    name: "Tangency Portfolio",
                    marker: { size: 12, color: "hsl(var(--accent))" },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  font: { color: "hsl(var(--foreground))", family: "Inter, sans-serif" },
                  xaxis: { title: "Risk (σ)", gridcolor: "hsl(var(--border))" },
                  yaxis: { title: "Expected Return", gridcolor: "hsl(var(--border))" },
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
                  {loadingPrices ? "Loading price data..." : "Click 'Optimize Portfolio' to see results"}
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
