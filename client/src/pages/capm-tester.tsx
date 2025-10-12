import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useGlobalState } from "@/contexts/global-state-context";
import { apiRequest } from "@/lib/queryClient";
import Plot from "react-plotly.js";
import { useToast } from "@/hooks/use-toast";

export default function CAPMTester() {
  const { globalState } = useGlobalState();
  const { toast } = useToast();
  const interval = "1wk";
  const lastAnalyzedParams = useRef<string | null>(null);

  // Fetch price data including market proxy
  const allTickers = [...globalState.tickers, globalState.marketProxy];
  const { data: priceData, isLoading: loadingPrices } = useQuery({
    queryKey: ["/api/data/prices", allTickers, globalState.startDate, globalState.endDate, interval],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: allTickers,
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

  // Run CAPM analysis
  const capmMutation = useMutation({
    mutationFn: async () => {
      if (!priceData?.returns) {
        throw new Error("No price data available");
      }
      
      const response = await apiRequest("/api/model/capm", {
        method: "POST",
        body: JSON.stringify({
          returns: priceData.returns,
          market: globalState.marketProxy,
          rf: globalState.riskFreeRate / 100,  // Convert from percentage to decimal
          interval: interval,
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "CAPM Analysis Complete",
        description: "Regression analysis completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run CAPM analysis",
        variant: "destructive",
      });
    },
  });

  const capmData = capmMutation.data;

  // Auto-trigger CAPM analysis when price data loads
  useEffect(() => {
    if (priceData?.returns && !loadingPrices && !capmMutation.isPending) {
      const currentParams = JSON.stringify({
        tickers: globalState.tickers,
        market: globalState.marketProxy,
      });
      
      if (lastAnalyzedParams.current !== currentParams) {
        lastAnalyzedParams.current = currentParams;
        capmMutation.mutate();
      }
    }
  }, [priceData, loadingPrices, globalState.tickers, globalState.marketProxy]);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Capital Asset Pricing Model (CAPM)</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The CAPM describes the relationship between systematic risk and expected return for assets,
          particularly stocks. It is widely used for pricing risky securities and generating expected returns.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">CAPM Equation</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">E[R<sub>i</sub>] = R<sub>f</sub> + β<sub>i</sub>(E[R<sub>M</sub>] - R<sub>f</sub>)</p>
          <p className="mt-3 text-xs text-muted-foreground">where:</p>
          <p className="text-xs text-foreground">E[R<sub>i</sub>] = Expected return on asset i</p>
          <p className="text-xs text-foreground">R<sub>f</sub> = Risk-free rate</p>
          <p className="text-xs text-foreground">β<sub>i</sub> = Beta of asset i (systematic risk)</p>
          <p className="text-xs text-foreground">E[R<sub>M</sub>] = Expected market return</p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Regression Model</h3>
        <p className="text-sm text-muted-foreground mb-3">
          We estimate CAPM parameters using OLS regression on excess returns:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
          <p className="text-foreground">R<sub>i,t</sub> - R<sub>f,t</sub> = α<sub>i</sub> + β<sub>i</sub>(R<sub>M,t</sub> - R<sub>f,t</sub>) + ε<sub>i,t</sub></p>
          <p className="mt-3 text-xs text-muted-foreground">
            α (alpha) represents abnormal return after adjusting for market risk
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Security Market Line (SML)</h3>
        <p className="text-sm text-muted-foreground">
          The SML is the graphical representation of the CAPM, showing expected return as a function of beta.
          Securities above the SML are undervalued (positive alpha), while those below are overvalued (negative alpha).
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Key Assumptions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>All investors hold the market portfolio</li>
          <li>Returns follow a normal distribution</li>
          <li>Investors can borrow/lend at the risk-free rate</li>
          <li>No transaction costs or taxes</li>
          <li>All information is available to all investors</li>
        </ul>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="CAPM Model Tester" theory={theory}>
      <div className="space-y-6">
        {/* Regression Analysis Header */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold">Regression Analysis</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {loadingPrices ? "Loading market data..." : capmMutation.isPending ? "Running CAPM analysis..." : capmData ? "Analysis complete" : "Load portfolio data to begin"}
          </p>
        </Card>

        {/* SML Chart */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Security Market Line</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-sml">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-96">
            {capmData?.results && capmData.results.length > 0 ? (
              <Plot
                data={[
                  // Security Market Line
                  capmData.sml && capmData.sml.length > 0 ? {
                    x: capmData.sml.map((p: any) => p.beta),
                    y: capmData.sml.map((p: any) => p.expectedReturn),
                    type: "scatter",
                    mode: "lines",
                    name: "SML (CAPM)",
                    line: { color: "#dc2626", width: 3, dash: "dash" },
                    hovertemplate: "β: %{x:.2f}<br>E[R]: %{y:.1%}<extra></extra>",
                  } : null,
                  // Asset scatter points
                  {
                    x: capmData.results.map((r: any) => r.beta),
                    y: capmData.results.map((r: any) => r.expected_return),
                    type: "scatter",
                    mode: "markers+text",
                    name: "Assets",
                    text: capmData.results.map((r: any) => r.ticker),
                    textposition: "top center",
                    textfont: { size: 10, color: "#374151" },
                    marker: { 
                      size: 14, 
                      color: "#2563eb",
                      line: { width: 2, color: "#ffffff" }
                    },
                    hovertemplate: "%{text}<br>β: %{x:.3f}<br>E[R]: %{y:.1%}<extra></extra>",
                  },
                  // Risk-free rate point
                  capmData.summary ? {
                    x: [0],
                    y: [capmData.summary.risk_free_rate],
                    type: "scatter",
                    mode: "markers",
                    name: "Risk-Free Rate",
                    marker: { 
                      size: 12, 
                      color: "#10b981",
                      symbol: "diamond",
                      line: { width: 2, color: "#ffffff" }
                    },
                    hovertemplate: "Rf: %{y:.1%}<extra></extra>",
                  } : null,
                  // Market portfolio point
                  capmData.summary ? {
                    x: [1],
                    y: [capmData.summary.market_return],
                    type: "scatter",
                    mode: "markers",
                    name: "Market Portfolio",
                    marker: { 
                      size: 14, 
                      color: "#f59e0b",
                      symbol: "star",
                      line: { width: 2, color: "#ffffff" }
                    },
                    hovertemplate: "Market<br>β: 1.00<br>E[R]: %{y:.1%}<extra></extra>",
                  } : null,
                ].filter(Boolean)}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: { 
                    title: { text: "Beta (β)", font: { size: 14, weight: 600 } }, 
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                    zeroline: true,
                    zerolinecolor: "#9ca3af",
                    zerolinewidth: 1,
                  },
                  yaxis: { 
                    title: { text: "Expected Return (Annual)", font: { size: 14, weight: 600 } }, 
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                    zeroline: true,
                    zerolinecolor: "#9ca3af",
                    tickformat: ".1%",
                  },
                  margin: { l: 70, r: 40, t: 40, b: 70 },
                  showlegend: true,
                  legend: { 
                    x: 0.02, 
                    y: 0.98,
                    bgcolor: "rgba(255,255,255,0.9)",
                    bordercolor: "#e5e7eb",
                    borderwidth: 1,
                  },
                  hovermode: "closest",
                }}
                config={{ 
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                <p className="text-sm text-muted-foreground">
                  {loadingPrices ? "Loading data..." : capmMutation.isPending ? "Analyzing..." : "Load portfolio data to see SML"}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Metrics */}
        {capmData?.results && capmData.results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              label="Market Beta" 
              value={capmData.results[0].beta || 0} 
              precision={3} 
            />
            <MetricCard 
              label="Alpha (α)" 
              value={capmData.results[0].alpha || 0} 
              format="percentage" 
            />
            <MetricCard 
              label="R-Squared" 
              value={capmData.results[0].r2 || 0} 
              format="percentage" 
              precision={1} 
            />
            <MetricCard 
              label="T-Stat (β)" 
              value={capmData.results[0].t_beta || 0} 
              precision={2} 
            />
          </div>
        )}

        {/* Results Table */}
        {capmData?.results && (
          <Card className="p-6 bg-card border-card-border">
            <h2 className="text-xl font-semibold mb-4">CAPM Regression Results</h2>
            <DataTable
              data={capmData.results}
              columns={[
                { key: "ticker", label: "Ticker", align: "left" },
                { 
                  key: "alpha", 
                  label: "α", 
                  align: "right",
                  format: (v) => `${(v * 100).toFixed(2)}%`
                },
                { 
                  key: "beta", 
                  label: "β", 
                  align: "right",
                  format: (v) => v.toFixed(3)
                },
                { 
                  key: "t_alpha", 
                  label: "t(α)", 
                  align: "right",
                  format: (v) => v.toFixed(2)
                },
                { 
                  key: "t_beta", 
                  label: "t(β)", 
                  align: "right",
                  format: (v) => v.toFixed(2)
                },
                { 
                  key: "r2", 
                  label: "R²", 
                  align: "right",
                  format: (v) => `${(v * 100).toFixed(1)}%`
                },
              ]}
            />
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
