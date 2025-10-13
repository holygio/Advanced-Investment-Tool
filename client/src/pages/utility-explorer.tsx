import { useState, useEffect } from "react";
import { ModuleLayout } from "@/components/module-layout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "@tanstack/react-query";
import Plot from "react-plotly.js";
import { Loader2 } from "lucide-react";

type UtilityType = "CRRA" | "CARA" | "DARA";

export default function UtilityExplorer() {
  const [activeTab, setActiveTab] = useState("utility");
  const [utilityType, setUtilityType] = useState<UtilityType>("CRRA");
  const [gamma, setGamma] = useState(3.0);
  const [beta, setBeta] = useState(0.99);
  const [sigmaC, setSigmaC] = useState(0.02);
  const [rho, setRho] = useState(-0.3);
  const [wealthMax, setWealthMax] = useState(100);

  // Theory utility generation mutation
  const theoryMutation = useMutation({
    mutationFn: async (params: {
      utility: UtilityType;
      gamma: number;
      beta: number;
      sigma_c: number;
      rho: number;
      wealth_max: number;
    }) => {
      const response = await fetch("/api/theory/utility/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utility: params.utility,
          gamma: params.gamma,
          beta: params.beta,
          wealth_min: 1,
          wealth_max: params.wealth_max,
          sigma_c: params.sigma_c,
          rho: params.rho,
          seed: 42,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate theory data");
      return response.json();
    },
  });

  // Recalculate when parameters change
  useEffect(() => {
    theoryMutation.mutate({
      utility: utilityType,
      gamma,
      beta,
      sigma_c: sigmaC,
      rho,
      wealth_max: wealthMax,
    });
  }, [utilityType, gamma, beta, sigmaC, rho, wealthMax]);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Utility Theory & SDF Simulator</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Explore how investor preferences (CARA, CRRA, DARA) shape risk attitudes and translate into 
          the Stochastic Discount Factor used in asset pricing. All data is synthetically generated for 
          pedagogical clarity.
        </p>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Utility Functions</h3>
        <div className="space-y-4 text-sm">
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">CARA (Constant Absolute Risk Aversion)</p>
            <p className="font-mono text-sm mb-1 text-foreground">U(x) = -e<sup>-bx</sup>/b, U'(x) = e<sup>-bx</sup></p>
            <p className="text-muted-foreground">Constant A(x) = b. Fixed fear of loss regardless of wealth.</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">CRRA (Constant Relative Risk Aversion)</p>
            <p className="font-mono text-sm mb-1 text-foreground">U(x) = x<sup>1-γ</sup>/(1-γ), U'(x) = x<sup>-γ</sup></p>
            <p className="text-muted-foreground">Constant R(x) = γ. Risk aversion proportional to wealth.</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">DARA (Decreasing Absolute Risk Aversion)</p>
            <p className="font-mono text-sm mb-1 text-foreground">U(x) = (a+x)<sup>1-γ</sup>/(1-γ), U'(x) = (a+x)<sup>-γ</sup></p>
            <p className="text-muted-foreground">Both A(x), R(x) ↓ with wealth. Wealthier investors are bolder.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Risk Aversion Measures</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">A(x) = -U''(x) / U'(x) (Absolute)</p>
          <p className="text-foreground">R(x) = x·A(x) (Relative)</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Absolute RA measures fear per $1 loss. Relative RA measures fear relative to current wealth.
        </p>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Stochastic Discount Factor</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm space-y-2 border border-border">
          <p className="text-foreground">m<sub>t</sub> = β · U'(c<sub>t+1</sub>) / U'(c<sub>t</sub>)</p>
          <p className="text-foreground mt-2">Price: p<sub>t</sub> = E[m<sub>t+1</sub> · x<sub>t+1</sub>]</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          The SDF transforms future payoffs into present values. Higher m in bad states means assets 
          paying there are valuable hedges.
        </p>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Utility & SDF Explorer" theory={theory}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="utility" data-testid="tab-utility">Utility & Marginal</TabsTrigger>
          <TabsTrigger value="risk-aversion" data-testid="tab-risk-aversion">Risk Aversion</TabsTrigger>
          <TabsTrigger value="sdf" data-testid="tab-sdf">SDF Explorer</TabsTrigger>
        </TabsList>

        {/* Global Controls */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Discount Factor (β)</Label>
                  <span className="text-sm font-mono text-muted-foreground">{beta.toFixed(3)}</span>
                </div>
                <Slider
                  data-testid="slider-beta"
                  min={0.9}
                  max={0.999}
                  step={0.001}
                  value={[beta]}
                  onValueChange={(value) => setBeta(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Impatient (0.90)</span>
                  <span>Patient (0.999)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Consumption Vol (σ<sub>c</sub>)</Label>
                  <span className="text-sm font-mono text-muted-foreground">{(sigmaC * 100).toFixed(1)}%</span>
                </div>
                <Slider
                  data-testid="slider-sigma-c"
                  min={0.01}
                  max={0.05}
                  step={0.001}
                  value={[sigmaC]}
                  onValueChange={(value) => setSigmaC(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low (1%)</span>
                  <span>High (5%)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Correlation ρ(Δc, R<sub>m</sub>)</Label>
                  <span className="text-sm font-mono text-muted-foreground">{rho.toFixed(2)}</span>
                </div>
                <Slider
                  data-testid="slider-rho"
                  min={-0.9}
                  max={0.9}
                  step={0.1}
                  value={[rho]}
                  onValueChange={(value) => setRho(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Negative (-0.9)</span>
                  <span>Positive (0.9)</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Wealth Range (Max)</Label>
                  <span className="text-sm font-mono text-muted-foreground">{wealthMax}</span>
                </div>
                <Slider
                  data-testid="slider-wealth-max"
                  min={10}
                  max={500}
                  step={10}
                  value={[wealthMax]}
                  onValueChange={(value) => setWealthMax(value[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Narrow (10)</span>
                  <span>Wide (500)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tab 1: Utility & Marginal Utility */}
        <TabsContent value="utility" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-2">Utility Function U(x) & Marginal Utility U'(x)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Curvature of U(x) determines aversion to risk. Steeper decline in U'(x) indicates stronger diminishing returns to wealth.
            </p>
            
            <div className="h-[500px]">
              {theoryMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : theoryMutation.data ? (
                <Plot
                  data={[
                    {
                      x: theoryMutation.data.wealth,
                      y: theoryMutation.data.U,
                      type: "scatter",
                      mode: "lines",
                      name: "U(x)",
                      yaxis: "y1",
                      line: { color: "#3b82f6", width: 3 },
                    },
                    {
                      x: theoryMutation.data.wealth,
                      y: theoryMutation.data.Uprime,
                      type: "scatter",
                      mode: "lines",
                      name: "U'(x)",
                      yaxis: "y2",
                      line: { color: "#22c55e", width: 3, dash: "dot" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Wealth (x)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Utility U(x)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                      titlefont: { color: "#3b82f6" },
                      tickfont: { color: "#3b82f6" },
                    },
                    yaxis2: {
                      title: "Marginal Utility U'(x)",
                      overlaying: "y",
                      side: "right",
                      gridcolor: "#e5e7eb",
                      showgrid: false,
                      titlefont: { color: "#22c55e" },
                      tickfont: { color: "#22c55e" },
                    },
                    margin: { l: 60, r: 80, t: 20, b: 60 },
                    legend: { x: 0.02, y: 0.98 },
                    hovermode: "x unified",
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Risk Aversion */}
        <TabsContent value="risk-aversion" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-2">Risk Aversion Measures</h2>
            <p className="text-sm text-muted-foreground mb-4">
              CARA: flat A(x). CRRA: constant R(x). DARA: both declining.
            </p>
            
            <div className="h-[500px]">
              {theoryMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : theoryMutation.data ? (
                <Plot
                  data={[
                    {
                      x: theoryMutation.data.wealth,
                      y: theoryMutation.data.A,
                      type: "scatter",
                      mode: "lines",
                      name: "A(x) - Absolute",
                      yaxis: "y1",
                      line: { color: "#f59e0b", width: 3 },
                    },
                    {
                      x: theoryMutation.data.wealth,
                      y: theoryMutation.data.R,
                      type: "scatter",
                      mode: "lines",
                      name: "R(x) - Relative",
                      yaxis: "y2",
                      line: { color: "#8b5cf6", width: 3, dash: "dot" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Wealth (x)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Absolute Risk Aversion A(x)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                      titlefont: { color: "#f59e0b" },
                      tickfont: { color: "#f59e0b" },
                    },
                    yaxis2: {
                      title: "Relative Risk Aversion R(x)",
                      overlaying: "y",
                      side: "right",
                      gridcolor: "#e5e7eb",
                      showgrid: false,
                      titlefont: { color: "#8b5cf6" },
                      tickfont: { color: "#8b5cf6" },
                    },
                    margin: { l: 60, r: 100, t: 20, b: 60 },
                    legend: { x: 0.02, y: 0.98 },
                    annotations: [
                      {
                        x: theoryMutation.data.wealth[10],
                        y: theoryMutation.data.A[10],
                        text: `A(10) = ${theoryMutation.data.A[10].toFixed(3)}`,
                        showarrow: true,
                        arrowhead: 2,
                        ax: 40,
                        ay: -40,
                        font: { color: "#f59e0b", size: 10 },
                      },
                    ],
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>

            <div className="mt-4 bg-muted/50 p-4 rounded border border-border">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Interpretation</h3>
              <p className="text-sm text-muted-foreground">
                {utilityType === "CARA" && "CARA has constant absolute risk aversion - investors have fixed fear per $1 loss regardless of wealth."}
                {utilityType === "CRRA" && "CRRA has constant relative risk aversion - investors maintain the same proportional fear of loss as wealth changes."}
                {utilityType === "DARA" && "DARA exhibits decreasing absolute and relative risk aversion - wealthier investors become more risk-tolerant."}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: SDF Explorer */}
        <TabsContent value="sdf" className="space-y-6">
          {theoryMutation.data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-card border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Mean SDF</h3>
                <p className="text-2xl font-mono text-foreground" data-testid="text-mean-sdf">
                  {theoryMutation.data.mean_sdf.toFixed(3)}
                </p>
              </Card>
              <Card className="p-4 bg-card border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">SDF Volatility</h3>
                <p className="text-2xl font-mono text-foreground" data-testid="text-std-sdf">
                  {theoryMutation.data.std_sdf.toFixed(3)}
                </p>
              </Card>
              <Card className="p-4 bg-card border-border">
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Avg Pricing Error</h3>
                <p className="text-2xl font-mono text-foreground" data-testid="text-pricing-error">
                  {theoryMutation.data.mean_pricing_error.toFixed(4)}
                </p>
              </Card>
            </div>
          )}

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-2">SDF Time Path (240 Months)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Higher m in bad states (Δc &lt; 0) means assets paying there are valuable hedges. 
              Recession shading highlights states where consumption falls.
            </p>
            
            <div className="h-[500px]">
              {theoryMutation.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : theoryMutation.data ? (
                <Plot
                  data={[
                    {
                      x: Array.from({ length: 240 }, (_, i) => i),
                      y: theoryMutation.data.SDF_utility,
                      type: "scatter",
                      mode: "lines",
                      name: `${utilityType} SDF`,
                      line: { color: "#3b82f6", width: 2 },
                    },
                    {
                      x: Array.from({ length: 240 }, (_, i) => i),
                      y: theoryMutation.data.SDF_capm,
                      type: "scatter",
                      mode: "lines",
                      name: "CAPM SDF (Linear)",
                      line: { color: "#ef4444", width: 2, dash: "dash" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Time (months)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Stochastic Discount Factor (m)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    legend: { x: 0.02, y: 0.98 },
                    shapes: theoryMutation.data.consumption_growth.map((dc: number, i: number) => 
                      dc < 0 ? {
                        type: 'rect' as const,
                        xref: 'x' as const,
                        yref: 'paper' as const,
                        x0: i - 0.5,
                        x1: i + 0.5,
                        y0: 0,
                        y1: 1,
                        fillcolor: 'rgba(239, 68, 68, 0.1)',
                        line: { width: 0 },
                        layer: 'below' as const,
                      } : null
                    ).filter(Boolean),
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>

            <div className="mt-4 bg-muted/50 p-4 rounded border border-border">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Understanding the SDF</h3>
              <p className="text-sm text-muted-foreground">
                The SDF translates future payoffs into present value under utility theory: m<sub>t</sub> = β·U'(c<sub>t+1</sub>)/U'(c<sub>t</sub>). 
                When consumption falls (red shaded regions), marginal utility rises, making the SDF spike. 
                Assets that pay well in these states command higher prices today because they hedge against bad times.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
