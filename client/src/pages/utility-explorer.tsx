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

  // Debounced recalculation when parameters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      theoryMutation.mutate({
        utility: utilityType,
        gamma,
        beta,
        sigma_c: sigmaC,
        rho,
        wealth_max: wealthMax,
      });
    }, 300); // Wait 300ms after user stops adjusting

    return () => clearTimeout(timeoutId);
  }, [utilityType, gamma, beta, sigmaC, rho, wealthMax]);

  const theory = (
    <div className="space-y-6 py-6">
      {/* Card 1: Why Utility Matters for Pricing */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">1. Why Utility Matters for Pricing</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Utility encodes risk preferences; its marginal utility shapes the SDF <span className="font-mono">m</span> used in pricing:
        </p>
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 space-y-2">
          <p className="font-mono text-sm text-foreground">1 = E[m<sub>t+1</sub> R<sub>t+1</sub>]</p>
          <p className="font-mono text-sm text-foreground">m<sub>t+1</sub> ∝ U'(C<sub>t+1</sub>)</p>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Risk aversion ⇒ U' declines with wealth; "bad states" (low C) have high m.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            All models (CAPM, multi-factor, LPM) imply a particular shape for U and thus for m.
          </p>
        </div>
      </Card>

      {/* Card 2: Traditional Utility Classes */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">2. Traditional Utility Classes: CRRA, CARA, DARA</h3>
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
            <p className="font-semibold text-sm text-foreground mb-2">CRRA (Constant Relative Risk Aversion)</p>
            <p className="font-mono text-sm text-foreground mb-2">U(x) = (x<sup>1-γ</sup> - 1) / (1-γ)  (log when γ=1)</p>
            <p className="text-sm text-muted-foreground">Relative RA = γ (constant)</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
            <p className="font-semibold text-sm text-foreground mb-2">CARA (Constant Absolute Risk Aversion)</p>
            <p className="font-mono text-sm text-foreground mb-2">U(x) = -e<sup>-bx</sup></p>
            <p className="text-sm text-muted-foreground">Absolute RA = b (constant)</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
            <p className="font-semibold text-sm text-foreground mb-2">DARA (Decreasing Absolute Risk Aversion)</p>
            <p className="font-mono text-sm text-foreground mb-2">U(x) = ln x  (example)</p>
            <p className="text-sm text-muted-foreground">ARA decreases with wealth</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          These summarize risk attitude when SDF isn't explicit.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Curvature of U ⇒ strength of risk aversion and SDF slope.
          </p>
        </div>
      </Card>

      {/* Card 3: Marginal Utility → SDF */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">3. Marginal Utility → SDF (General + CAPM)</h3>
        <div className="space-y-3">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <p className="font-mono text-sm text-foreground">m<sub>t+1</sub> = β · U'(C<sub>t+1</sub>) / U'(C<sub>t</sub>)  (utility-based)</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <p className="font-mono text-sm text-foreground">m<sub>t+1</sub> = a + b·R<sub>M,t+1</sub>,  b &lt; 0  (CAPM affine SDF)</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          CAPM requires investing "in everything" so R<sub>M</sub> tracks wealth/consumption risk. 
          Real investors may have non-market exposures (home, human capital).
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            CAPM is a linear approximation; richer SDFs allow non-linear state pricing.
          </p>
        </div>
      </Card>

      {/* Card 4: Stochastic Dominance */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">4. Stochastic Dominance (FSD → TSD)</h3>
        <div className="space-y-3">
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-sm text-foreground"><strong>FSD (non-satiation):</strong> U' &gt; 0 ⇒ m &gt; 0</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-sm text-foreground"><strong>SSD (risk aversion):</strong> U'' &lt; 0 ⇒ m decreasing</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-sm text-foreground"><strong>TSD (skewness pref.):</strong> U''' &gt; 0 ⇒ m decreasing at decreasing rate</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          SD sets economically necessary sign/shape constraints on m.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            SD generalizes MV beyond normality/quadratic utility.
          </p>
        </div>
      </Card>

      {/* Card 5: CAPM vs SD */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">5. CAPM vs SD (Violations & Linear Limits)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          CAPM SDF <span className="font-mono">m = a + b·R<sub>M</sub></span> can satisfy risk aversion (b &lt; 0) 
          but may violate non-satiation (negative m in extremes).
        </p>
        <p className="text-sm text-muted-foreground">
          MV implies quadratic U → only locally valid; SD admits non-linear m.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            CAPM/MV are useful approximations, fragile in tails.
          </p>
        </div>
      </Card>

      {/* Card 6: Why/When MV Still Useful */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">6. Why/When MV Still Useful</h3>
        <p className="text-sm text-muted-foreground mb-3">
          MV relies on (i) normal returns or (ii) quadratic U.
        </p>
        <p className="text-sm text-muted-foreground">
          By Taylor approx (Tsiang, 1972), it works over limited ranges; fails in extremes and can be FSD-dominated.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Good baseline; upgrade when tails/skew matter.
          </p>
        </div>
      </Card>

      {/* Card 7: SD-Based SDFs */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">7. SD-Based SDFs (Descriptive Approach)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Estimate m non-parametrically via <span className="font-mono">E[mR] = 1</span>; enforce m &gt; 0, decreasing, etc.
        </p>
        <p className="text-sm text-muted-foreground">
          Empirically shows strong aversion to large losses (~ −12%).
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            Lets the data shape m; some anomalies persist.
          </p>
        </div>
      </Card>

      {/* Card 8: LPM & M-LPM Equilibrium */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">8. Lower Partial Moments (LPM) & M-LPM Equilibrium</h3>
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-3">
          <p className="font-mono text-sm text-foreground">LPM<sub>n</sub>(τ) = E[max(τ - R, 0)<sup>n</sup>]</p>
          <p className="font-mono text-sm text-foreground mt-2">Semivariance: LPM<sub>2</sub>(0)</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Under normality, MV ≈ LPM; in general, M-LPM yields an equilibrium SDF of form:
        </p>
        <div className="bg-purple-50 p-4 rounded-md border border-purple-200 mb-3">
          <p className="font-mono text-sm text-foreground">m = a + b·min(R<sub>M</sub> - r<sub>f</sub>, 0)</p>
          <p className="text-sm text-muted-foreground mt-2">(risk-neutral above threshold)</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Portfolio separation holds with a risk-free asset; efficient sets differ from MV.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            LPM focuses on downside risk, preserving non-satiation and risk aversion.
          </p>
        </div>
      </Card>

      {/* Card 9: ESG Optional Note */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-3 text-foreground">9. ESG (Optional Theory Note)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          ESG fits if/when it affects returns; factorizable (long high ESG − short low ESG).
        </p>
        <p className="text-sm text-muted-foreground">
          Realized vs expected returns can diverge as flows move prices.
        </p>
        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-500">
          <p className="text-sm font-semibold text-foreground">So what?</p>
          <p className="text-sm text-muted-foreground">
            ESG may represent a priced risk factor or simply reflect flow-driven mispricing.
          </p>
        </div>
      </Card>
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
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-2">State-Price Diagram</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Each point is a "state of the world." The x-axis shows consumption growth (Δc), and the y-axis shows how much that state is "worth" today (SDF = m). 
              Bad states (left, low Δc) have high prices → assets that pay there are valuable hedges.
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
                      x: theoryMutation.data.dc_sorted,
                      y: theoryMutation.data.sdf_utility_sorted,
                      type: "scatter",
                      mode: "markers",
                      name: `${utilityType} SDF States`,
                      marker: { 
                        size: 8, 
                        color: theoryMutation.data.sdf_utility_sorted,
                        colorscale: [
                          [0, '#22c55e'],    // green for cheap states (low m)
                          [0.5, '#fbbf24'],  // yellow for neutral
                          [1, '#ef4444']     // red for expensive states (high m)
                        ],
                        showscale: true,
                        colorbar: {
                          title: "State Price (m)",
                          titleside: "right"
                        }
                      },
                    },
                    {
                      x: theoryMutation.data.dc_sorted,
                      y: theoryMutation.data.sdf_utility_sorted,
                      type: "scatter",
                      mode: "lines",
                      name: `${utilityType} Curve`,
                      line: { color: "#3b82f6", width: 3 },
                      showlegend: false,
                    },
                    {
                      x: theoryMutation.data.dc_sorted,
                      y: theoryMutation.data.sdf_capm_sorted,
                      type: "scatter",
                      mode: "lines",
                      name: "CAPM SDF (Linear)",
                      line: { color: "#6366f1", width: 2, dash: "dash" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Consumption Growth (Δc)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                      zeroline: true,
                      zerolinecolor: "#9ca3af",
                    },
                    yaxis: { 
                      title: "Stochastic Discount Factor (m)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 100, t: 20, b: 60 },
                    legend: { x: 0.02, y: 0.98 },
                    annotations: [
                      {
                        x: theoryMutation.data.dc_sorted[Math.floor(theoryMutation.data.dc_sorted.length * 0.1)],
                        y: theoryMutation.data.sdf_utility_sorted[Math.floor(theoryMutation.data.dc_sorted.length * 0.1)],
                        text: "EXPENSIVE STATES<br>(High m → Bad Δc)",
                        showarrow: true,
                        arrowhead: 2,
                        ax: -70,
                        ay: -50,
                        font: { color: "#ef4444", size: 12, weight: "bold" },
                        bgcolor: "rgba(255,255,255,0.9)",
                        bordercolor: "#ef4444",
                        borderwidth: 2,
                        borderpad: 4,
                      },
                      {
                        x: theoryMutation.data.dc_sorted[Math.floor(theoryMutation.data.dc_sorted.length * 0.9)],
                        y: theoryMutation.data.sdf_utility_sorted[Math.floor(theoryMutation.data.dc_sorted.length * 0.9)],
                        text: "CHEAP STATES<br>(Low m → Good Δc)",
                        showarrow: true,
                        arrowhead: 2,
                        ax: 70,
                        ay: 50,
                        font: { color: "#22c55e", size: 12, weight: "bold" },
                        bgcolor: "rgba(255,255,255,0.9)",
                        bordercolor: "#22c55e",
                        borderwidth: 2,
                        borderpad: 4,
                      },
                    ],
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </div>

            <div className="mt-4 bg-muted/50 p-4 rounded border border-border">
              <h3 className="text-sm font-semibold mb-2 text-foreground">Understanding State Prices</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">What you're seeing:</strong> Each point represents a possible economic state. 
                  The x-axis shows consumption growth (Δc), and the y-axis shows that state's "price" (m = SDF). 
                  Colors reveal expensive states (red, high m) vs cheap states (green, low m).
                </p>
                
                <p>
                  <strong className="text-foreground">Why the curve?</strong> When consumption falls (left, bad times), marginal utility U'(c) spikes. 
                  Since m = β·U'(c<sub>t+1</sub>)/U'(c<sub>t</sub>), bad states become expensive — investors pay more today for $1 delivered in recession.
                </p>
                
                <p>
                  <strong className="text-foreground">Curvature = Risk Aversion (γ={gamma.toFixed(1)}):</strong> Higher γ makes U'(c) more sensitive to consumption changes, 
                  steepening the SDF curve. {utilityType === "CRRA" ? "CRRA maintains constant relative risk aversion." : utilityType === "CARA" ? "CARA keeps absolute risk aversion constant." : "DARA shows declining risk aversion as wealth grows."}
                </p>
                
                <p>
                  <strong className="text-foreground">The pricing story:</strong> Price = E[m·Payoff]. Assets paying when m is high (bad states) cost more → lower expected returns. 
                  CAPM's linear approximation (dashed) misses this curvature, underpricing tail risk.
                </p>
              </div>
            </div>
          </Card>

          {/* Two-Asset Pricing Panel */}
          {theoryMutation.data && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold mb-4">Asset Pricing Demonstration</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Using the SDF above, we can price two synthetic assets. The pricing equation p = E[m · X] determines current prices from future payoffs.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-lg border-2 border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <h3 className="text-lg font-semibold text-foreground">Safe Bond</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payoff Pattern:</span>
                      <span className="font-mono text-foreground">Constant (1)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price p:</span>
                      <span className="font-mono text-foreground">{theoryMutation.data.safe_bond_price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Return:</span>
                      <span className="font-mono text-foreground">{theoryMutation.data.safe_bond_return.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E[mR]:</span>
                      <span className={`font-mono ${Math.abs(theoryMutation.data.safe_bond_price * (1 + theoryMutation.data.safe_bond_return/100) - 1) < 0.05 ? 'text-green-600' : 'text-red-600'}`}>
                        {(theoryMutation.data.safe_bond_price * (1 + theoryMutation.data.safe_bond_return/100)).toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Safe payoff → no covariance with m → expected return near risk-free rate
                  </p>
                </div>

                <div className="p-5 rounded-lg border-2 border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <h3 className="text-lg font-semibold text-foreground">Risky Asset</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payoff Pattern:</span>
                      <span className="font-mono text-foreground">1 + R<sub>m</sub></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price p:</span>
                      <span className="font-mono text-foreground">{theoryMutation.data.risky_asset_price.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Return:</span>
                      <span className="font-mono text-foreground">{theoryMutation.data.risky_asset_return.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Beta (β):</span>
                      <span className="font-mono text-foreground">{theoryMutation.data.risky_asset_beta.toFixed(3)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Pays when market rises → positive Cov with consumption → higher expected return (risk premium)
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-foreground">
                  <strong>Key Insight:</strong> The SDF curvature (driven by γ = {gamma.toFixed(1)}) determines how much extra return risky assets require. 
                  Higher risk aversion → steeper SDF → larger equity premium.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
