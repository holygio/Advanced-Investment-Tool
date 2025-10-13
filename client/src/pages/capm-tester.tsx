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
      {/* Conceptual Bridge */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">CAPM: From Efficient Portfolios to Market Equilibrium</h2>
        <p className="text-muted-foreground leading-relaxed mb-2">
          When everyone faces the same CML and invests their wealth proportionally to the risky tangency portfolio, the aggregate portfolio of all investors = the market portfolio (M).
        </p>
        <p className="text-muted-foreground leading-relaxed">
          That's the step from optimal portfolio choice → general equilibrium.
        </p>
      </div>

      {/* Extra Assumptions (A8-A10) */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Additional CAPM Assumptions (A8–A10)</h3>
        <p className="text-sm text-muted-foreground mb-3">Combined with Portfolio Theory (A1–A7), these create the CAPM world:</p>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A8: Homogeneous Expectations</p>
            <p className="text-muted-foreground">All investors share the same beliefs about μ, Σ, r<sub>f</sub>.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A9: Unlimited Borrow/Lend</p>
            <p className="text-muted-foreground">Can borrow or lend freely at risk-free rate.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="font-semibold text-foreground mb-1">A10: Perfect Competition</p>
            <p className="text-muted-foreground">No single investor affects prices; markets clear.</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>Result:</strong> Everyone holds some mix of r<sub>f</sub> and M. Thus M lies on the CML and is the tangency portfolio for the entire market.</p>
        </div>
      </div>

      {/* Deriving CAPM Equation */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Deriving the CAPM Equation</h3>
        <p className="text-sm text-muted-foreground mb-3">
          From first order conditions of utility maximization:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">E[r<sub>i</sub>] − r<sub>f</sub> = β<sub>i</sub>(E[r<sub>M</sub>] − r<sub>f</sub>)</p>
          <p className="text-foreground mt-3">where β<sub>i</sub> = Cov(r<sub>i</sub>, r<sub>M</sub>) / Var(r<sub>M</sub>)</p>
          <p className="text-sm text-muted-foreground mt-3">→ Only systematic risk matters.</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Alternate form: E[r<sub>i</sub>] = r<sub>f</sub> + λ<sub>M</sub>β<sub>i</sub>, where λ<sub>M</sub> = E[r<sub>M</sub>] − r<sub>f</sub> is the market risk premium.
        </p>
      </div>

      {/* CML vs SML */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">CML vs SML</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-border">
              <tr className="text-left">
                <th className="py-2 px-3 font-semibold text-foreground">Feature</th>
                <th className="py-2 px-3 font-semibold text-foreground">CML</th>
                <th className="py-2 px-3 font-semibold text-foreground">SML</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-medium text-foreground">Axes</td>
                <td className="py-2 px-3">σ – E[r]</td>
                <td className="py-2 px-3">β – E[r]</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 px-3 font-medium text-foreground">Applies to</td>
                <td className="py-2 px-3">Efficient portfolios</td>
                <td className="py-2 px-3">All assets</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-foreground">Slope</td>
                <td className="py-2 px-3">(E[r<sub>M</sub>] − r<sub>f</sub>) / σ<sub>M</sub></td>
                <td className="py-2 px-3">E[r<sub>M</sub>] − r<sub>f</sub></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Geometrically: SML shows expected return vs beta = linear with intercept r<sub>f</sub>, slope = market premium.
        </p>
      </div>

      {/* CAPM as SDF */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">CAPM as a Pricing Kernel (SDF View)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Start from fundamental pricing: 1 = E[mR<sub>i</sub>]
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">Assume linear SDF: m<sub>t</sub> = a + bR<sub>M,t</sub>, b &lt; 0</p>
          <p className="text-foreground mt-2">Plug in → recover the SML</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          <strong className="text-foreground">Interpretation:</strong> Under risk aversion, m decreases when market return is high → investors value payoffs that hedge bad states.
        </p>
      </div>

      {/* Testing CAPM */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Testing the CAPM: Fama–MacBeth Two-Step</h3>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="font-semibold text-foreground mb-2">Step 1: Time-Series Regression (Estimate β<sub>i</sub>)</p>
            <p className="font-mono text-sm text-foreground">r<sub>i,t</sub> − r<sub>f,t</sub> = α<sub>i</sub> + β<sub>i</sub>(r<sub>M,t</sub> − r<sub>f,t</sub>) + ε<sub>i,t</sub></p>
          </div>
          <div className="p-3 bg-green-50 rounded border border-green-200">
            <p className="font-semibold text-foreground mb-2">Step 2: Cross-Sectional Regression (Test risk premium)</p>
            <p className="font-mono text-sm text-foreground">r̄<sub>i</sub> − r<sub>f</sub> = λ₀ + λ<sub>M</sub>β<sub>i</sub> + u<sub>i</sub></p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-muted/30 rounded border border-border">
          <p className="text-sm text-foreground mb-2"><strong>Tests:</strong></p>
          <p className="text-sm text-muted-foreground">• H₀: λ₀ = 0, λ<sub>M</sub> &gt; 0 (intercept zero, premium positive)</p>
          <p className="text-sm text-muted-foreground">• H₀: α<sub>i</sub> = 0 (no pricing error)</p>
          <p className="text-sm text-muted-foreground">• Joint α=0 test: GRS test (covered in Factor Analyzer module)</p>
        </div>
      </div>

      {/* Empirical Challenges */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Empirical Challenges & Critiques</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong className="text-foreground">Beta instability:</strong> β changes over time → rolling estimates needed</p>
          <p>• <strong className="text-foreground">Errors-in-variables:</strong> Estimated β → attenuation bias</p>
          <p>• <strong className="text-foreground">Roll (1977) Critique:</strong> True market portfolio is unobservable → CAPM tests are joint with market proxy</p>
          <p>• <strong className="text-foreground">Anomalies:</strong> Cross-section not fully explained by β → leads to multi-factor models (see Factor Analyzer)</p>
        </div>
      </div>

      {/* Economic Meaning */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Economic Meaning</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Assets earning positive covariance with market</strong> (return ↑ in booms) → less valuable → higher expected return</li>
          <li><strong className="text-foreground">Assets that hedge recessions</strong> (return ↑ in bad times) → valuable → lower expected return</li>
          <li><strong className="text-foreground">Risk premium</strong> is the reward for exposure to systematic (consumption or market) risk</li>
        </ul>
      </div>

      {/* Extensions */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Extensions</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong className="text-foreground">Conditional CAPM:</strong> β, λ vary over time</p>
          <p>• <strong className="text-foreground">Consumption CAPM:</strong> Replace market return with consumption growth</p>
          <p>• <strong className="text-foreground">Multi-factor (FF3/FF5):</strong> Add SMB, HML, RMW, CMA → see Factor Analyzer module</p>
        </div>
      </div>

      {/* So What? */}
      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
        <h3 className="text-lg font-semibold mb-2 text-foreground">So What?</h3>
        <p className="text-sm text-foreground mb-2">
          From utility maximization and market equilibrium → only systematic risk is priced.
        </p>
        <p className="text-sm text-foreground">
          Simple but powerful: CAPM is the foundation for factor models, performance metrics (Sharpe, Treynor, Jensen's alpha), 
          and cost of capital estimation. Its limitations led to richer models, but it remains the conceptual anchor of modern finance.
        </p>
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
