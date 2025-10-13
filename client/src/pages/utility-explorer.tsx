import { useState, useEffect } from "react";
import { ModuleLayout } from "@/components/module-layout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { Loader2 } from "lucide-react";

type UtilityType = "CRRA" | "CARA" | "DARA";

export default function UtilityExplorer() {
  const [activeTab, setActiveTab] = useState("utility");
  const [utilityType, setUtilityType] = useState<UtilityType>("CRRA");
  const [gamma, setGamma] = useState(3.0);
  const [b, setB] = useState(0.001);
  const [showCAPM, setShowCAPM] = useState(true);

  // Utility curves mutation
  const utilityMutation = useMutation({
    mutationFn: async (params: { utilityType: UtilityType; gamma: number; b: number }) => {
      const response = await fetch("/api/utility/curves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utility_type: params.utilityType,
          gamma: params.gamma,
          b: params.b,
          x_min: 0.1,
          x_max: 10,
          n_points: 100,
        }),
      });
      if (!response.ok) throw new Error("Failed to calculate utility");
      return response.json();
    },
  });

  // SDF mutation  
  const sdfMutation = useMutation({
    mutationFn: async (params: { utilityType: "CRRA" | "CARA" | "CAPM"; gamma: number; b: number }) => {
      const response = await fetch("/api/utility/sdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utility_type: params.utilityType,
          gamma: params.gamma,
          b: params.b,
          beta: 0.99,
          n_points: 100,
        }),
      });
      if (!response.ok) throw new Error("Failed to calculate SDF");
      return response.json();
    },
  });

  // Calculate on mount and when parameters change
  useEffect(() => {
    utilityMutation.mutate({ utilityType, gamma, b });
  }, [utilityType, gamma, b]);

  useEffect(() => {
    if (utilityType === "CRRA") {
      sdfMutation.mutate({ utilityType: "CRRA", gamma, b });
    } else if (utilityType === "CARA") {
      sdfMutation.mutate({ utilityType: "CARA", gamma, b });
    }
  }, [utilityType, gamma, b]);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Utility Functions & Stochastic Discount Factor</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Utility functions describe investor preferences over wealth. The Stochastic Discount Factor (SDF)
          is derived from marginal utility and prices all assets consistently under no-arbitrage conditions.
        </p>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Risk Aversion Types</h3>
        <div className="space-y-4 text-sm">
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">CRRA (Constant Relative Risk Aversion)</p>
            <p className="font-mono text-sm mb-1 text-foreground">U(x) = (x<sup>1-γ</sup> - 1) / (1-γ)</p>
            <p className="text-muted-foreground">Risk aversion constant as percentage of wealth. R(x) = γ</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">CARA (Constant Absolute Risk Aversion)</p>
            <p className="font-mono text-sm mb-1 text-foreground">U(x) = -e<sup>-bx</sup></p>
            <p className="text-muted-foreground">Risk aversion constant in absolute terms. A(x) = b</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">DARA (Decreasing Absolute Risk Aversion)</p>
            <p className="font-mono text-sm mb-1 text-foreground">U(x) = ln(x) - 0.5·ln(1 + ln(x)²)</p>
            <p className="text-muted-foreground">Risk aversion decreases with wealth. A(x) ↓ as x ↑</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Risk Aversion Measures</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">Absolute: A(x) = -U''(x) / U'(x)</p>
          <p className="text-foreground">Relative: R(x) = -x·U''(x) / U'(x)</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          CARA has constant A(x). CRRA has constant R(x). DARA has both decreasing with wealth.
        </p>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Stochastic Discount Factor</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">m<sub>t+1</sub> = β · U'(c<sub>t+1</sub>) / U'(c<sub>t</sub>)</p>
          <p className="text-foreground mt-2">Asset prices: p<sub>t</sub> = E[m<sub>t+1</sub> · x<sub>t+1</sub>]</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          The SDF transforms future payoffs into present values. Higher SDF in bad states means assets 
          paying in those states are valuable hedges.
        </p>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">CAPM and SDF</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
          <p className="text-foreground">m<sub>t+1</sub> = a + b · R<sub>M,t+1</sub></p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          CAPM assumes linear SDF. This emerges from quadratic utility or normal returns with exponential 
          utility. CRRA and CARA yield nonlinear SDFs capturing higher-order risk preferences.
        </p>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Utility Explorer" theory={theory}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utility" data-testid="tab-utility">Utility & Marginal</TabsTrigger>
          <TabsTrigger value="risk-aversion" data-testid="tab-risk-aversion">Risk Aversion</TabsTrigger>
          <TabsTrigger value="sdf" data-testid="tab-sdf">SDF Explorer</TabsTrigger>
        </TabsList>

        {/* Panel 1: Utility and Marginal Utility */}
        <TabsContent value="utility" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-6">Configuration</h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Utility Type</Label>
                <div className="flex gap-3">
                  {(["CRRA", "CARA", "DARA"] as UtilityType[]).map((type) => (
                    <button
                      key={type}
                      data-testid={`button-${type.toLowerCase()}`}
                      onClick={() => setUtilityType(type)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        utilityType === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover-elevate active-elevate-2"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {utilityType === "CRRA" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Risk Aversion (γ)</Label>
                    <span className="text-sm font-mono text-muted-foreground">{gamma.toFixed(2)}</span>
                  </div>
                  <Slider
                    data-testid="slider-gamma"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={[gamma]}
                    onValueChange={(value) => setGamma(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low (0.5)</span>
                    <span>High (10)</span>
                  </div>
                </div>
              )}

              {utilityType === "CARA" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Risk Aversion (b)</Label>
                    <span className="text-sm font-mono text-muted-foreground">{b.toFixed(4)}</span>
                  </div>
                  <Slider
                    data-testid="slider-b"
                    min={0.0001}
                    max={0.01}
                    step={0.0001}
                    value={[b]}
                    onValueChange={(value) => setB(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low (0.0001)</span>
                    <span>High (0.01)</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Utility Function Chart */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Utility Function U(x)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Concavity indicates risk aversion. Steeper concavity means stronger aversion to risk.
            </p>
            <div className="h-96">
              {utilityMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : utilityMutation.data ? (
                <Plot
                  data={[{
                    x: utilityMutation.data.curves.map((p: any) => p.x),
                    y: utilityMutation.data.curves.map((p: any) => p.U),
                    type: "scatter",
                    mode: "lines",
                    name: `U(x) - ${utilityType}`,
                    line: { color: "#3b82f6", width: 2 },
                  }]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { title: "Wealth (x)", gridcolor: "#e5e7eb", showgrid: true },
                    yaxis: { title: "Utility U(x)", gridcolor: "#e5e7eb", showgrid: true },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>

          {/* Marginal Utility Chart */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Marginal Utility U'(x)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Declining marginal utility shows diminishing value of additional wealth. Steeper decline indicates higher risk aversion.
            </p>
            <div className="h-96">
              {utilityMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : utilityMutation.data ? (
                <Plot
                  data={[{
                    x: utilityMutation.data.curves.map((p: any) => p.x),
                    y: utilityMutation.data.curves.map((p: any) => p.U_prime),
                    type: "scatter",
                    mode: "lines",
                    name: `U'(x) - ${utilityType}`,
                    line: { color: "#22c55e", width: 2 },
                  }]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { title: "Wealth (x)", gridcolor: "#e5e7eb", showgrid: true },
                    yaxis: { title: "Marginal Utility U'(x)", gridcolor: "#e5e7eb", showgrid: true },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>

        {/* Panel 2: Risk Aversion */}
        <TabsContent value="risk-aversion" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Absolute Risk Aversion A(x)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              A(x) = -U''(x)/U'(x). CARA has constant A(x), CRRA has A(x) = γ/x, DARA has decreasing A(x).
            </p>
            <div className="h-96">
              {utilityMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : utilityMutation.data ? (
                <Plot
                  data={[{
                    x: utilityMutation.data.curves.map((p: any) => p.x),
                    y: utilityMutation.data.curves.map((p: any) => p.A),
                    type: "scatter",
                    mode: "lines",
                    name: `A(x) - ${utilityType}`,
                    line: { color: "#f59e0b", width: 2 },
                  }]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { title: "Wealth (x)", gridcolor: "#e5e7eb", showgrid: true },
                    yaxis: { title: "Absolute Risk Aversion A(x)", gridcolor: "#e5e7eb", showgrid: true },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Relative Risk Aversion R(x)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              R(x) = -x·U''(x)/U'(x) = x·A(x). CRRA has constant R(x) = γ. CARA has increasing R(x). DARA has decreasing R(x).
            </p>
            <div className="h-96">
              {utilityMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : utilityMutation.data ? (
                <Plot
                  data={[{
                    x: utilityMutation.data.curves.map((p: any) => p.x),
                    y: utilityMutation.data.curves.map((p: any) => p.R),
                    type: "scatter",
                    mode: "lines",
                    name: `R(x) - ${utilityType}`,
                    line: { color: "#8b5cf6", width: 2 },
                  }]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { title: "Wealth (x)", gridcolor: "#e5e7eb", showgrid: true },
                    yaxis: { title: "Relative Risk Aversion R(x)", gridcolor: "#e5e7eb", showgrid: true },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>

        {/* Panel 3: SDF Explorer */}
        <TabsContent value="sdf" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Stochastic Discount Factor</h2>
              <div className="flex items-center gap-2">
                <Label htmlFor="show-capm" className="text-sm">Show CAPM SDF</Label>
                <Switch
                  id="show-capm"
                  checked={showCAPM}
                  onCheckedChange={setShowCAPM}
                  data-testid="switch-show-capm"
                />
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              {sdfMutation.data?.interpretation || "The SDF shows how marginal utility transforms payoffs into prices. Higher SDF in recession states (Δc < 0) means assets paying in bad times are valuable hedges."}
            </p>

            <div className="h-96">
              {sdfMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sdfMutation.data ? (
                <Plot
                  data={[
                    {
                      x: sdfMutation.data.sdf_points.map((p: any) => p.delta_c * 100),
                      y: sdfMutation.data.sdf_points.map((p: any) => p.m),
                      type: "scatter",
                      mode: "lines",
                      name: `${sdfMutation.data.utility_type} SDF`,
                      line: { color: "#3b82f6", width: 3 },
                    },
                    ...(showCAPM ? [{
                      x: Array.from({ length: 100 }, (_, i) => -10 + i * 0.2),
                      y: Array.from({ length: 100 }, (_, i) => 1 - 3 * (-0.1 + i * 0.002)),
                      type: "scatter" as const,
                      mode: "lines" as const,
                      name: "CAPM (Linear)",
                      line: { color: "#ef4444", width: 2, dash: "dash" },
                    }] : [])
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Consumption Growth Δc (%)", 
                      gridcolor: "#e5e7eb", 
                      showgrid: true,
                      zeroline: true,
                      zerolinecolor: "#9ca3af",
                    },
                    yaxis: { 
                      title: "SDF m", 
                      gridcolor: "#e5e7eb", 
                      showgrid: true 
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    legend: { x: 0.02, y: 0.98 },
                    shapes: [{
                      type: 'rect',
                      xref: 'x',
                      yref: 'paper',
                      x0: -10,
                      x1: 0,
                      y0: 0,
                      y1: 1,
                      fillcolor: 'rgba(239, 68, 68, 0.1)',
                      line: { width: 0 },
                      layer: 'below',
                    }],
                    annotations: [{
                      xref: 'x',
                      yref: 'paper',
                      x: -5,
                      y: 0.95,
                      text: 'Recession Region',
                      showarrow: false,
                      font: { size: 10, color: '#9ca3af' },
                    }],
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
