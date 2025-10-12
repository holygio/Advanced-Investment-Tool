import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useGlobalState } from "@/contexts/global-state-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Plot from "react-plotly.js";

export default function Performance() {
  const { globalState } = useGlobalState();
  const { toast } = useToast();
  const [tau, setTau] = useState(0);
  const [n, setN] = useState(2);

  // Fetch portfolio data
  const { data: portfolioData } = useQuery({
    queryKey: ["/api/data/prices", globalState.tickers, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: globalState.tickers,
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1wk",
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: globalState.tickers.length > 0,
  });

  // Fetch market data
  const { data: marketData } = useQuery({
    queryKey: ["/api/data/prices", globalState.marketProxy, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: [globalState.marketProxy],
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1wk",
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: !!globalState.marketProxy,
  });

  // Calculate performance metrics
  const performanceMutation = useMutation({
    mutationFn: async () => {
      if (!portfolioData?.returns) {
        throw new Error("Missing portfolio data");
      }

      // Calculate equal-weighted portfolio returns
      const tickers = Object.keys(portfolioData.returns);
      const portfolioReturns = portfolioData.returns[tickers[0]].map((_: any, idx: number) => {
        const avgReturn = tickers.reduce((sum, ticker) => {
          return sum + (portfolioData.returns[ticker][idx]?.ret || 0);
        }, 0) / tickers.length;
        
        return {
          date: portfolioData.returns[tickers[0]][idx].date,
          ret: avgReturn,
        };
      });

      const benchmark = marketData?.returns?.[globalState.marketProxy] || null;

      const response = await apiRequest("/api/risk/performance", {
        method: "POST",
        body: JSON.stringify({
          portfolio: portfolioReturns,
          benchmark: benchmark,
          rf: globalState.riskFreeRate,
          lpm: tau !== 0 || n !== 2 ? { tau, n } : null,
          interval: "1wk",
        }),
      });

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Performance metrics calculated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to calculate performance",
        variant: "destructive",
      });
    },
  });

  const results = performanceMutation.data;

  // Auto-run when data loads
  useEffect(() => {
    if (portfolioData?.returns && !performanceMutation.isPending) {
      performanceMutation.mutate();
    }
  }, [portfolioData, marketData]);

  // Extract returns for histogram
  const portfolioReturns = portfolioData?.returns ? (() => {
    const tickers = Object.keys(portfolioData.returns);
    return portfolioData.returns[tickers[0]].map((_: any, idx: number) => {
      const avgReturn = tickers.reduce((sum, ticker) => {
        return sum + (portfolioData.returns[ticker][idx]?.ret || 0);
      }, 0) / tickers.length;
      return avgReturn;
    });
  })() : [];

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Risk & Performance Metrics</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Performance evaluation requires metrics that account for both return and risk. Different measures
          capture different aspects of portfolio performance and risk exposure.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Risk-Adjusted Performance</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Sharpe Ratio</p>
            <p className="font-mono text-sm">SR = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>p</sub></p>
            <p className="text-muted-foreground mt-1">Reward per unit of total risk</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Treynor Ratio</p>
            <p className="font-mono text-sm">TR = (R<sub>p</sub> - R<sub>f</sub>) / β<sub>p</sub></p>
            <p className="text-muted-foreground mt-1">Reward per unit of systematic risk</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Information Ratio</p>
            <p className="font-mono text-sm">IR = (R<sub>p</sub> - R<sub>b</sub>) / σ<sub>tracking</sub></p>
            <p className="text-muted-foreground mt-1">Active return per unit of active risk</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Jensen's Alpha</p>
            <p className="font-mono text-sm">α = R<sub>p</sub> - [R<sub>f</sub> + β(R<sub>m</sub> - R<sub>f</sub>)]</p>
            <p className="text-muted-foreground mt-1">Excess return above CAPM prediction</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Higher Moments</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Skewness:</span> Measures asymmetry of return distribution.
            Negative skew indicates more extreme losses than gains.
          </p>
          <p>
            <span className="font-semibold text-foreground">Kurtosis:</span> Measures tail risk. High kurtosis indicates
            fat tails and higher probability of extreme events.
          </p>
          <p>
            <span className="font-semibold text-foreground">Jarque-Bera:</span> Tests for normality. High values reject
            the hypothesis of normal distribution.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Lower Partial Moments (LPM)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          LPM measures downside risk relative to a target return τ:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>LPM<sub>n</sub>(τ) = (1/T) Σ [min(r<sub>t</sub> - τ, 0)]<sup>n</sup></p>
          <p className="text-xs text-muted-foreground mt-2">
            n = 2, τ = 0 gives semivariance (downside volatility)
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Risk & Performance" theory={theory}>
      <div className="space-y-6">
        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Sharpe Ratio" 
            value={results?.sharpe || 0} 
            precision={3} 
          />
          <MetricCard 
            label="Treynor Ratio" 
            value={results?.treynor || 0} 
            precision={3} 
          />
          <MetricCard 
            label="Information Ratio" 
            value={results?.informationRatio || 0} 
            precision={3} 
          />
          <MetricCard 
            label="Jensen's Alpha" 
            value={results?.jensenAlpha || 0} 
            format="percentage" 
          />
        </div>

        {/* Higher Moments */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Distribution Characteristics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Skewness</p>
              <p className="text-3xl font-mono font-semibold tabular-nums">
                {results?.skew ? results.skew.toFixed(3) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {results?.skew ? (results.skew < 0 ? "Negative (left skewed)" : "Positive (right skewed)") : ""}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Excess Kurtosis</p>
              <p className="text-3xl font-mono font-semibold tabular-nums">
                {results?.kurtosis ? results.kurtosis.toFixed(3) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {results?.kurtosis ? (results.kurtosis > 0 ? "Leptokurtic (fat tails)" : "Platykurtic (thin tails)") : ""}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Jarque-Bera</p>
              <p className="text-3xl font-mono font-semibold tabular-nums">
                {results?.jb ? results.jb.toFixed(2) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {results?.jb && results.jb > 5.99 ? "Non-normal (p < 0.05)" : "Normal"}
              </p>
            </div>
          </div>
        </Card>

        {/* Return Distribution Histogram */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Return Distribution</h2>
          <div className="h-96">
            {portfolioReturns.length > 0 ? (
              <Plot
                data={[
                  {
                    x: portfolioReturns,
                    type: "histogram",
                    name: "Returns",
                    marker: { color: "#3b82f6" },
                    nbinsx: 30,
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: { 
                    title: "Weekly Return", 
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  yaxis: { 
                    title: "Frequency", 
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  margin: { l: 60, r: 20, t: 20, b: 60 },
                  showlegend: false,
                }}
                config={{ responsive: true }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                <p className="text-sm text-muted-foreground">Loading distribution...</p>
              </div>
            )}
          </div>
        </Card>

        {/* LPM Controls */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Lower Partial Moment (LPM)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6">
            <div className="space-y-2">
              <Label htmlFor="tau">Target Return (τ)</Label>
              <Input
                id="tau"
                type="number"
                step="0.001"
                value={tau}
                onChange={(e) => setTau(parseFloat(e.target.value))}
                data-testid="input-tau"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n">Moment Order (n)</Label>
              <Input
                id="n"
                type="number"
                step="1"
                min="1"
                max="4"
                value={n}
                onChange={(e) => setN(parseInt(e.target.value))}
                data-testid="input-n"
              />
            </div>
            <Button 
              onClick={() => performanceMutation.mutate()}
              disabled={performanceMutation.isPending}
              data-testid="button-calculate-lpm"
            >
              <Play className="h-4 w-4 mr-2" />
              Calculate LPM
            </Button>
          </div>

          {results?.lpm !== null && results?.lpm !== undefined && (
            <div className="p-4 bg-background/50 rounded-md border border-border">
              <p className="text-sm text-muted-foreground mb-1">LPM<sub>{n}</sub>(τ = {tau})</p>
              <p className="text-3xl font-mono font-semibold">{results.lpm.toFixed(6)}</p>
            </div>
          )}
        </Card>
      </div>
    </ModuleLayout>
  );
}
