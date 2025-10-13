import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { Loader2 } from "lucide-react";

export default function FixedIncome() {
  const [activeTab, setActiveTab] = useState("yield-curves");
  
  // Risk-neutral calculator state
  const [rnParams, setRnParams] = useState({
    s: 100,
    k: 100,
    u: 1.1,
    d: 0.9,
    r: 0.03
  });

  // Fetch fixed income data
  const { data: fiData, isLoading } = useQuery({
    queryKey: ["/api/fixedincome/data"],
  });

  // Risk-neutral calculation mutation
  const rnMutation = useMutation({
    mutationFn: async (params: typeof rnParams) => {
      const response = await fetch("/api/fixedincome/risk-neutral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error("Failed to calculate");
      return response.json();
    },
  });

  // Trigger risk-neutral calculation when params change
  const handleRnParamChange = (updates: Partial<typeof rnParams>) => {
    const newParams = { ...rnParams, ...updates };
    setRnParams(newParams);
    rnMutation.mutate(newParams);
  };

  // Trigger initial calculation on mount
  useEffect(() => {
    rnMutation.mutate(rnParams);
  }, []);

  const theory = (
    <div className="space-y-6 py-6">
      {/* Card 1: Why Asset Pricing ≠ Only Stocks */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">1. Why "Asset Pricing ≠ Only Stocks"</h3>
        <p className="text-sm text-muted-foreground mb-3">
          CAPM/MV apply in principle to all assets, but other asset classes have distinct risk drivers; 
          bonds & derivatives deserve dedicated treatment.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            For a complete model/SDF, we must capture interest-rate and default risks, not just R<sub>M</sub>.
          </p>
        </div>
      </Card>

      {/* Card 2: Bonds - Payoffs, Asymmetry */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">2. Bonds: Payoffs, Asymmetry, and Non-Linearity</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Fixed coupons + principal; limited upside (single-digits), downside to −100%.
        </p>
        <p className="text-sm text-muted-foreground">
          Non-linear price–yield relation; coupon reinvestment matters.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Risk is not symmetric; linear β intuition is fragile for rates.
          </p>
        </div>
      </Card>

      {/* Card 3: Interest-Rate Risk */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">3. Interest-Rate Risk (Term Structure &gt; Single YTM)</h3>
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-3">
          <p className="font-mono text-sm text-foreground">
            P = Σ<sub>t=1</sub><sup>T</sup> coupon<sub>t</sub>/(1+r<sub>t</sub>)<sup>t</sup> + principal/(1+r<sub>T</sub>)<sup>T</sup>
          </p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          YTM is a single summary; reality is a vector of spot rates → term structure matters.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Sensitivity drivers: maturity (longer ⇒ more sensitive) and coupon (higher ⇒ less sensitive).
        </p>
        <p className="text-sm text-muted-foreground">
          Practical signal: term spread (10y–3m) is informative (FF 1993 link).
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Rate moves are multi-tenor; use curve intuition, not just a scalar YTM.
          </p>
        </div>
      </Card>

      {/* Card 4: Duration-Convexity */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">4. Duration–Convexity (Intuition Card)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Approximate price change for yield shock Δy:
        </p>
        <div className="bg-purple-50 p-4 rounded-md border border-purple-200 mb-3">
          <p className="font-mono text-sm text-foreground">ΔP/P ≈ −D·Δy + (1/2)·C·(Δy)²</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Asymmetry: +100 bps vs −100 bps impacts are not equal (convexity).
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Use duration–convexity for scenario sense-checking; be wary of large shocks.
          </p>
        </div>
      </Card>

      {/* Card 5: Default (Credit) Risk */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">5. Default (Credit) Risk</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Ratings (AAA…D) proxy PD; recovery matters; large investors often face IG constraints (BBB+); 
          downgrades trigger flows.
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Prices reflect PD × LGD and a risk premium (non-linear; varies with rating).
        </p>
        <p className="text-sm text-muted-foreground">
          Historical default rates and recession regimes explain spread cycles; risk premia are time-varying.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Credit spreads embed expected losses + risk compensation; both move with the cycle.
          </p>
        </div>
      </Card>

      {/* Card 6: Structured Credit (CDO Tranching) */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">6. Structured Credit (CDO Tranching)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Pool splits into equity, mezz, senior, super-senior; losses flow from bottom up.
        </p>
        <p className="text-sm text-muted-foreground">
          Senior tranches can appear low-risk until correlation/regime shifts.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Tranching repackages default risk; systemic correlation is the Achilles' heel.
          </p>
        </div>
      </Card>

      {/* Card 7: A Unified 5-Factor SDF */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">7. A Unified 5-Factor SDF (Stocks + Bonds)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Early FF (1993) includes TERM and CREDIT alongside MKT/SMB/HML:
        </p>
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-3">
          <p className="font-mono text-sm text-foreground">
            m<sub>t</sub> = a + b<sub>M</sub>·R<sub>t</sub><sup>M</sup> + b<sub>SMB</sub>·SMB<sub>t</sub> + b<sub>HML</sub>·HML<sub>t</sub>
          </p>
          <p className="font-mono text-sm text-foreground ml-8">
            + b<sub>TERM</sub>·TERM<sub>t</sub> + b<sub>CRED</sub>·CRED<sub>t</sub>
          </p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          TERM = long − short gov't returns; CREDIT = corp − gov't returns.
        </p>
        <p className="text-sm text-muted-foreground">
          Stocks and bonds are linked through discounting (rates) and distress (credit).
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Cross-asset SDF needs both curve and credit to price broad portfolios.
          </p>
        </div>
      </Card>

      {/* Card 8: Derivatives - Why SDF Pricing Is Limited */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">8. Derivatives: Why SDF Pricing Is Limited in Practice</h3>
        <p className="text-sm text-muted-foreground mb-3">
          In principle, same SDF; in practice, hedge ratios (deltas) change continuously → 
          option "β" is time-varying and highly non-linear.
        </p>
        <p className="text-sm text-muted-foreground">
          SDF approaches suit longer-horizon investments, not fast-changing derivatives exposures.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Use SDF for risk pricing intuition; value options via no-arbitrage machinery.
          </p>
        </div>
      </Card>

      {/* Card 9: Risk-Neutral Probabilities */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">9. Risk-Neutral Probabilities (Educational Bridge)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          In a one-step binomial:
        </p>
        <div className="bg-purple-50 p-4 rounded-md border border-purple-200 mb-3">
          <p className="font-mono text-sm text-foreground">
            E<sup>Q</sup>[R] = r<sub>f</sub>  ⇒  p<sup>Q</sup> = [(1+r<sub>f</sub>) − d] / (u − d)
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          These risk-neutral p<sup>Q</sup> are not physical probabilities but are forward-looking from option prices. 
          Shifts in p<sup>Q</sup> can reveal regime changes.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Options encode state prices; great for extracting market-implied scenarios.
          </p>
        </div>
      </Card>

      {/* Card 10: Performance & Portfolio Construction */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">10. Performance & Portfolio Construction Notes (Cross-links)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Hedge funds/market timing: exposures and premia are time-varying; evaluation metrics can swing with regimes.
        </p>
        <p className="text-sm text-muted-foreground">
          Hierarchical portfolios: re-optimize at the total level; Treynor for well-diversified sleeves vs total σ 
          when sleeves aren't.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Always look top-down across asset classes; cross-correlations matter.
          </p>
        </div>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <ModuleLayout title="Fixed Income & Derivatives" theory={theory}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title="Fixed Income & Derivatives" theory={theory}>
      {/* Data Source Disclaimer */}
      <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> This module uses curated offline datasets (yield curves, credit spreads, and bond characteristics) 
          for educational purposes. The data is not sourced from Yahoo Finance or other live market data providers.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-fixedincome">
          <TabsTrigger value="yield-curves" data-testid="tab-yield-curves">Yield Curves</TabsTrigger>
          <TabsTrigger value="spreads" data-testid="tab-spreads">Spreads</TabsTrigger>
          <TabsTrigger value="bond-sensitivity" data-testid="tab-bond-sensitivity">Bond Sensitivity</TabsTrigger>
          <TabsTrigger value="risk-neutral" data-testid="tab-risk-neutral">Risk-Neutral Demo</TabsTrigger>
        </TabsList>

        {/* Tab 1: Yield Curves */}
        <TabsContent value="yield-curves" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Latest Term Spread"
              value={`${(fiData?.latest_term_spread || 0).toFixed(2)}%`}
              subtitle="10Y - 3M"
              data-testid="metric-term-spread"
            />
            <MetricCard
              title="IG Credit Spread"
              value={`${(fiData?.latest_credit_ig || 0).toFixed(2)} bps`}
              subtitle="Investment Grade"
              data-testid="metric-credit-ig"
            />
            <MetricCard
              title="HY Credit Spread"
              value={`${(fiData?.latest_credit_hy || 0).toFixed(2)} bps`}
              subtitle="High Yield"
              data-testid="metric-credit-hy"
            />
          </div>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Yield Curve Evolution</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Historical snapshots showing how the term structure has shifted over time. 
              Note inversions (downward slope) which often signal recessions.
            </p>
            <div className="h-96">
              {fiData?.yield_curves ? (
                <Plot
                  data={fiData.yield_curves.map((curve: any) => {
                    // Calculate curve shape based on slope (30Y - 3M)
                    const shortEnd = curve.points.find((p: any) => p.maturity === '3M')?.yield || 0;
                    const longEnd = curve.points.find((p: any) => p.maturity === '30Y')?.yield || 0;
                    const slope = longEnd - shortEnd;
                    
                    let shape = "Normal";
                    let color = "#3b82f6"; // blue
                    
                    if (slope > 0.5) {
                      shape = "Normal (Steep)";
                      color = "#22c55e"; // green
                    } else if (slope >= 0 && slope <= 0.5) {
                      shape = "Flat";
                      color = "#f59e0b"; // amber
                    } else {
                      shape = "Inverted";
                      color = "#ef4444"; // red
                    }
                    
                    return {
                      x: curve.points.map((p: any) => p.maturity),
                      y: curve.points.map((p: any) => p.yield),
                      type: "scatter",
                      mode: "lines+markers",
                      name: `${curve.date} (${shape})`,
                      line: { width: 2, color },
                      hovertemplate: '<b>%{x}</b><br>Yield: %{y:.2f}%<br>Shape: ' + shape + '<extra></extra>',
                    };
                  })}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: {
                      title: "Maturity",
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: {
                      title: "Yield (%)",
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    legend: { x: 1.05, y: 1 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Spreads */}
        <TabsContent value="spreads" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Term Spread Over Time</h2>
            <p className="text-sm text-muted-foreground mb-4">
              TERM factor: 10Y - 3M spread. Reflects term premium — compensation for interest rate risk.
            </p>
            <div className="h-80">
              {fiData?.term_spreads ? (
                <Plot
                  data={[
                    {
                      x: fiData.term_spreads.map((p: any) => p.date),
                      y: fiData.term_spreads.map((p: any) => p.term_spread),
                      type: "scatter",
                      mode: "lines",
                      name: "Term Spread",
                      line: { color: "#3b82f6", width: 2 },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: {
                      title: "Date",
                      gridcolor: "#e5e7eb",
                    },
                    yaxis: {
                      title: "Spread (%)",
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                      zeroline: true,
                      zerolinecolor: "#9ca3af",
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    shapes: [{
                      type: 'line',
                      x0: fiData.term_spreads[0]?.date || '',
                      x1: fiData.term_spreads[fiData.term_spreads.length - 1]?.date || '',
                      y0: 0,
                      y1: 0,
                      line: {
                        color: '#ef4444',
                        width: 2,
                        dash: 'dash',
                      },
                    }],
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Credit Spreads Over Time</h2>
            <p className="text-sm text-muted-foreground mb-4">
              CREDIT factor: Corporate vs. government yield spread. Spikes during credit crises.
            </p>
            <div className="h-80">
              {fiData?.term_spreads ? (
                <Plot
                  data={[
                    {
                      x: fiData.term_spreads.map((p: any) => p.date),
                      y: fiData.term_spreads.map((p: any) => p.credit_spread_ig),
                      type: "scatter",
                      mode: "lines",
                      name: "IG Spread",
                      line: { color: "#22c55e", width: 2 },
                    },
                    {
                      x: fiData.term_spreads.map((p: any) => p.date),
                      y: fiData.term_spreads.map((p: any) => p.credit_spread_hy),
                      type: "scatter",
                      mode: "lines",
                      name: "HY Spread",
                      line: { color: "#ef4444", width: 2 },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: {
                      title: "Date",
                      gridcolor: "#e5e7eb",
                    },
                    yaxis: {
                      title: "Spread (bps)",
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    legend: { x: 0.02, y: 0.98 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Bond Sensitivity */}
        <TabsContent value="bond-sensitivity" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Price Sensitivity Analysis</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Duration-Convexity approximation: ΔP/P ≈ -D·Δy + 0.5·Conv·(Δy)². 
              Shows price changes for ±100 bps rate shocks.
            </p>
            
            {/* Sensitivity Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-2 font-semibold text-foreground">Bond</th>
                    <th className="text-right py-3 px-2 font-semibold text-foreground">Maturity (Y)</th>
                    <th className="text-right py-3 px-2 font-semibold text-foreground">Duration</th>
                    <th className="text-right py-3 px-2 font-semibold text-foreground">Convexity</th>
                    <th className="text-right py-3 px-2 font-semibold text-foreground">-100 bps</th>
                    <th className="text-right py-3 px-2 font-semibold text-foreground">+100 bps</th>
                  </tr>
                </thead>
                <tbody>
                  {fiData?.bonds?.map((bond: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-3 px-2 text-foreground font-medium" data-testid={`bond-name-${idx}`}>{bond.bond}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{bond.maturity}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{bond.duration.toFixed(1)}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{bond.convexity.toFixed(1)}</td>
                      <td className="text-right py-3 px-2 text-green-600 font-medium">+{bond.price_change_neg100.toFixed(2)}%</td>
                      <td className="text-right py-3 px-2 text-red-600 font-medium">{bond.price_change_pos100.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual comparison */}
            <div className="h-80">
              {fiData?.bonds ? (
                <Plot
                  data={[
                    {
                      x: fiData.bonds.map((b: any) => b.bond),
                      y: fiData.bonds.map((b: any) => b.price_change_neg100),
                      name: "Rates -100 bps",
                      type: "bar",
                      marker: { color: "#22c55e" },
                    },
                    {
                      x: fiData.bonds.map((b: any) => b.bond),
                      y: fiData.bonds.map((b: any) => b.price_change_pos100),
                      name: "Rates +100 bps",
                      type: "bar",
                      marker: { color: "#ef4444" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: {
                      title: "Bond",
                      gridcolor: "#e5e7eb",
                    },
                    yaxis: {
                      title: "Price Change (%)",
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                      zeroline: true,
                      zerolinecolor: "#9ca3af",
                    },
                    margin: { l: 60, r: 20, t: 20, b: 80 },
                    legend: { x: 0.02, y: 0.98 },
                    barmode: "group",
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Risk-Neutral Demo */}
        <TabsContent value="risk-neutral" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Binomial Risk-Neutral Pricing</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Adjust parameters to see how risk-neutral probability p^Q changes. The call option price is calculated 
              by discounting the risk-neutral expected payoff at the risk-free rate.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Stock Price (S): ${rnParams.s}</Label>
                  <Slider
                    value={[rnParams.s]}
                    onValueChange={([v]) => handleRnParamChange({ s: v })}
                    min={50}
                    max={150}
                    step={5}
                    data-testid="slider-rn-stock-price"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Strike Price (K): ${rnParams.k}</Label>
                  <Slider
                    value={[rnParams.k]}
                    onValueChange={([v]) => handleRnParamChange({ k: v })}
                    min={50}
                    max={150}
                    step={5}
                    data-testid="slider-rn-strike"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Up Factor (u): {rnParams.u.toFixed(2)}</Label>
                  <Slider
                    value={[rnParams.u * 100]}
                    onValueChange={([v]) => handleRnParamChange({ u: v / 100 })}
                    min={101}
                    max={150}
                    step={1}
                    data-testid="slider-rn-up"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Down Factor (d): {rnParams.d.toFixed(2)}</Label>
                  <Slider
                    value={[rnParams.d * 100]}
                    onValueChange={([v]) => handleRnParamChange({ d: v / 100 })}
                    min={50}
                    max={99}
                    step={1}
                    data-testid="slider-rn-down"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Risk-Free Rate (r): {(rnParams.r * 100).toFixed(1)}%</Label>
                  <Slider
                    value={[rnParams.r * 1000]}
                    onValueChange={([v]) => handleRnParamChange({ r: v / 1000 })}
                    min={0}
                    max={100}
                    step={5}
                    data-testid="slider-rn-rate"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {rnMutation.data && (
                  <>
                    <div className="bg-muted/50 p-4 rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Risk-Neutral Probability</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="value-rn-prob">
                        p^Q = {rnMutation.data.p_q.toFixed(4)}
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Call Option Price</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="value-call-price">
                        ${rnMutation.data.call_price.toFixed(2)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs text-green-700 mb-1">Up State</p>
                        <p className="text-lg font-semibold text-green-900">S = ${rnMutation.data.s_up.toFixed(2)}</p>
                        <p className="text-sm text-green-700">Payoff: ${rnMutation.data.call_up.toFixed(2)}</p>
                      </div>

                      <div className="bg-red-50 p-3 rounded border border-red-200">
                        <p className="text-xs text-red-700 mb-1">Down State</p>
                        <p className="text-lg font-semibold text-red-900">S = ${rnMutation.data.s_down.toFixed(2)}</p>
                        <p className="text-sm text-red-700">Payoff: ${rnMutation.data.call_down.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <p className="text-xs text-blue-700 mb-2 font-semibold">Interpretation</p>
                      <p className="text-xs text-blue-900 leading-relaxed">{rnMutation.data.interpretation}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Binomial Tree Visualization */}
            <div className="h-64">
              {rnMutation.data ? (
                <Plot
                  data={[
                    {
                      x: [0, 1, 1],
                      y: [rnParams.s, rnMutation.data.s_up, rnMutation.data.s_down],
                      mode: "markers+text",
                      type: "scatter",
                      text: [
                        `S₀ = $${rnParams.s}`,
                        `S↑ = $${rnMutation.data.s_up.toFixed(2)}`,
                        `S↓ = $${rnMutation.data.s_down.toFixed(2)}`,
                      ],
                      textposition: "top center",
                      marker: { size: 20, color: ["#3b82f6", "#22c55e", "#ef4444"] },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: {
                      title: "Time",
                      gridcolor: "#e5e7eb",
                      tickvals: [0, 1],
                      ticktext: ["t=0", "t=1"],
                    },
                    yaxis: {
                      title: "Stock Price ($)",
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 40, b: 60 },
                    shapes: [
                      {
                        type: 'line',
                        x0: 0,
                        y0: rnParams.s,
                        x1: 1,
                        y1: rnMutation.data.s_up,
                        line: { color: '#22c55e', width: 2 },
                      },
                      {
                        type: 'line',
                        x0: 0,
                        y0: rnParams.s,
                        x1: 1,
                        y1: rnMutation.data.s_down,
                        line: { color: '#ef4444', width: 2 },
                      },
                    ],
                    annotations: [
                      {
                        x: 0.5,
                        y: (rnParams.s + rnMutation.data.s_up) / 2,
                        text: `p^Q = ${rnMutation.data.p_q.toFixed(3)}`,
                        showarrow: false,
                        font: { color: '#22c55e', size: 10 },
                      },
                      {
                        x: 0.5,
                        y: (rnParams.s + rnMutation.data.s_down) / 2,
                        text: `1-p^Q = ${(1 - rnMutation.data.p_q).toFixed(3)}`,
                        showarrow: false,
                        font: { color: '#ef4444', size: 10 },
                      },
                    ],
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
