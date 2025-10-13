import { useState, useMemo } from "react";
import { ModuleLayout } from "@/components/module-layout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Plot from "react-plotly.js";

export default function InformationLab() {
  const [activeTab, setActiveTab] = useState("foreign-assets");

  // Foreign Assets Simulator state
  const [wH, setWH] = useState(0.6);
  const [rho, setRho] = useState(0.3);
  const [fxVol, setFxVol] = useState(0.1);

  // Home Bias Visualizer state
  const [homeBias, setHomeBias] = useState(70);
  const [deltaReturn, setDeltaReturn] = useState(0.01);
  const [sigmaRatio, setSigmaRatio] = useState(1.0);

  // Grossman Model Simulator state
  const [signalPrecision, setSignalPrecision] = useState(0.8);
  const [riskAversion, setRiskAversion] = useState(2.0);
  const [infoCost, setInfoCost] = useState(0.1);
  const [numInvestors, setNumInvestors] = useState(10);

  // Constants for foreign assets simulator
  const sigmaH = 0.15; // Home market volatility
  const sigmaF = 0.20; // Foreign market volatility
  const rhoRFX = 0.2;  // Correlation between returns and FX

  // Compute portfolio volatility without FX risk
  const portfolioVar = Math.pow(wH * sigmaH, 2) + Math.pow((1 - wH) * sigmaF, 2) + 
                       2 * wH * (1 - wH) * rho * sigmaH * sigmaF;
  const portfolioVol = Math.sqrt(portfolioVar);

  // Compute portfolio volatility with FX risk (corrected formula in variance units)
  const fxVar = Math.pow(fxVol, 2);
  const portfolioVolWithFX = Math.sqrt(portfolioVar + fxVar + 
                                        2 * rhoRFX * Math.sqrt(portfolioVar) * Math.sqrt(fxVar));

  // Diversification benefit
  const divBenefit = sigmaH - portfolioVol;

  // Generate data for portfolio vol vs correlation plot
  const rhoValues = Array.from({ length: 41 }, (_, i) => -1 + i * 0.05);
  const volValues = rhoValues.map(r => {
    const var_ = Math.pow(wH * sigmaH, 2) + Math.pow((1 - wH) * sigmaF, 2) + 
                 2 * wH * (1 - wH) * r * sigmaH * sigmaF;
    return Math.sqrt(var_);
  });

  // Home Bias calculations
  const muH = 0.08; // Home return
  const muF = muH + deltaReturn; // Foreign return
  const sigmaHBias = 0.15;
  const sigmaFBias = sigmaHBias * sigmaRatio;
  const rf = 0.02;

  // Portfolio returns and risk for different bias levels
  const biasLevels = Array.from({ length: 101 }, (_, i) => i);
  const sharpeRatios = biasLevels.map(bias => {
    const w = bias / 100;
    const portReturn = w * muH + (1 - w) * muF;
    const portVar = Math.pow(w * sigmaHBias, 2) + Math.pow((1 - w) * sigmaFBias, 2) + 
                    2 * w * (1 - w) * 0.3 * sigmaHBias * sigmaFBias;
    const portVol = Math.sqrt(portVar);
    return (portReturn - rf) / portVol;
  });

  const currentSharpe = sharpeRatios[homeBias];
  const optimalBias = biasLevels[sharpeRatios.indexOf(Math.max(...sharpeRatios))];
  const optimalSharpe = Math.max(...sharpeRatios);
  const efficiencyLoss = ((optimalSharpe - currentSharpe) / optimalSharpe) * 100;

  // Grossman Model simulation (memoized to prevent random regeneration)
  const grossmanResults = useMemo(() => {
    const P_true = 100;
    const signals = Array.from({ length: numInvestors }, () => 
      P_true + (Math.random() - 0.5) * 2 * (1 - signalPrecision) * 10
    );
    const Var_post = (1 - Math.pow(signalPrecision, 2)) * 50;
    const positions = signals.map(s => 
      ((s - P_true) / (riskAversion * Var_post)) * (1 - infoCost)
    );
    const P_eq = signals.reduce((sum, s, i) => 
      sum + s - riskAversion * Var_post * positions[i], 0) / numInvestors;
    const infoIndex = signalPrecision * (1 - infoCost);
    
    return { P_true, signals, positions, P_eq, infoIndex, Var_post };
  }, [signalPrecision, riskAversion, infoCost, numInvestors]);

  const { P_true, signals, positions, P_eq, infoIndex } = grossmanResults;

  // Theory content
  const theory = (
    <div className="space-y-6 py-6">
      {/* Introduction */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Information & Global Markets</h2>
        <p className="text-muted-foreground leading-relaxed mb-2">
          International diversification, home bias, and information asymmetry explain why investors allocate capital globally 
          and how market prices aggregate private information. This module explores the Grossman (1976) model of information 
          efficiency and connects it to modern portfolio construction through Black–Litterman.
        </p>
      </div>

      {/* 1. Why Global Diversification Matters */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">1. Why Global Diversification Matters</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Investors allocate wealth across countries to reduce portfolio volatility, because cross-country correlations are usually &lt; 1.
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>σ<sub>p</sub><sup>2</sup> = w<sub>H</sub><sup>2</sup>σ<sub>H</sub><sup>2</sup> + w<sub>F</sub><sup>2</sup>σ<sub>F</sub><sup>2</sup> + 2w<sub>H</sub>w<sub>F</sub>ρ<sub>HF</sub>σ<sub>H</sub>σ<sub>F</sub></p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          When currencies fluctuate, unhedged foreign positions add currency risk:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>σ<sub>p,FX</sub><sup>2</sup> = σ<sub>p</sub><sup>2</sup> + σ<sub>FX</sub><sup>2</sup> + 2ρ<sub>R,FX</sub>σ<sub>p</sub>σ<sub>FX</sub></p>
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> The lower the correlation between domestic and foreign returns, the higher the diversification gain. But currency risk can offset this benefit if unmanaged.</p>
        </div>
      </div>

      {/* 2. The Home Bias Puzzle */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">2. The Home Bias Puzzle</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Investors hold mostly domestic assets even though global diversification would improve the Sharpe ratio.
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Main drivers:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-3">
          <li>Information asymmetry and familiarity bias</li>
          <li>Institutional barriers and taxes</li>
          <li>Perceived currency and political risk</li>
        </ul>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>SR = (E[R<sub>p</sub>] - r<sub>f</sub>) / σ<sub>p</sub></p>
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> Home-biased portfolios feel safer but are inefficient: lower expected return for higher risk.</p>
        </div>
      </div>

      {/* 3. Information & Grossman (1976) */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">3. Information & Grossman (1976)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Markets are not perfectly efficient because information is costly. Each investor <em>i</em> receives a private noisy signal 
          s<sub>i</sub> about the true payoff P<sub>1</sub>:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>s<sub>i</sub> = P<sub>1</sub> + ε<sub>i</sub>, &nbsp; ε<sub>i</sub> ~ N(0, σ<sub>ε</sub><sup>2</sup>)</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Investor <em>i</em> (CARA utility) chooses position:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>X<sub>i</sub> = (E<sub>i</sub>[P<sub>1</sub>] - P<sub>0</sub>) / (a<sub>i</sub> · Var(P<sub>1</sub> | I<sub>i</sub>))</p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Equilibrium price:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>P<sub>0</sub> = E[P<sub>1</sub>] - λ · Cov(P<sub>1</sub>, D)</p>
        </div>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-3">
          <li><strong>a<sub>i</sub>:</strong> risk aversion</li>
          <li><strong>Var(P<sub>1</sub> | I<sub>i</sub>):</strong> posterior uncertainty</li>
          <li><strong>ρ:</strong> information precision (signal correlation with truth)</li>
        </ul>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> More precise signals → investors take larger positions → market prices become more informative → incentives to gather info decrease (rational expectations equilibrium).</p>
        </div>
      </div>

      {/* 4. Rational Expectations & Market Efficiency */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">4. Rational Expectations & Market Efficiency</h3>
        <p className="text-sm text-muted-foreground mb-3">
          When investors optimally use available information, prices embed those beliefs.
        </p>
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Flow:</strong>
        </p>
        <div className="bg-blue-50 p-4 rounded border border-blue-200 mb-3">
          <p className="text-sm font-mono text-foreground">
            Private Signal → Portfolio Decision → Market Price → Belief Update → New Equilibrium
          </p>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          If signals are costly or correlated, equilibrium prices only partially reveal fundamentals.
        </p>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> Efficiency is relative: markets can be informationally efficient given costs and incentives.</p>
        </div>
      </div>

      {/* 5. Connection to Black–Litterman */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">5. Connection to Black–Litterman</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Black–Litterman translates the Grossman idea into portfolio optimization: private signals → views → posterior expected returns.
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border mb-3">
          <p>E* = [(τΣ)<sup>-1</sup> + P<sup>T</sup>Ω<sup>-1</sup>P]<sup>-1</sup> [(τΣ)<sup>-1</sup>π + P<sup>T</sup>Ω<sup>-1</sup>Q]</p>
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> BL is a Bayesian rational-expectations framework: new "views" act as private signals updating market equilibrium returns.</p>
        </div>
      </div>

      {/* 6. Summary Takeaways */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">6. Summary Takeaways</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left p-2 font-semibold">Theme</th>
                <th className="text-left p-2 font-semibold">Key Equation</th>
                <th className="text-left p-2 font-semibold">Intuition</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="p-2">Diversification</td>
                <td className="p-2 font-mono">σ<sub>p</sub><sup>2</sup> = w<sub>H</sub><sup>2</sup>σ<sub>H</sub><sup>2</sup> + w<sub>F</sub><sup>2</sup>σ<sub>F</sub><sup>2</sup> + 2w<sub>H</sub>w<sub>F</sub>ρσ<sub>H</sub>σ<sub>F</sub></td>
                <td className="p-2">Correlation drives risk reduction</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2">Home Bias</td>
                <td className="p-2 font-mono">SR = (E[R<sub>p</sub>] - r<sub>f</sub>) / σ<sub>p</sub></td>
                <td className="p-2">Familiarity ≠ efficiency</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2">Grossman</td>
                <td className="p-2 font-mono">X<sub>i</sub> = (E<sub>i</sub>[P<sub>1</sub>] - P<sub>0</sub>) / (a<sub>i</sub> · Var)</td>
                <td className="p-2">Signal quality → position size</td>
              </tr>
              <tr className="border-b border-border">
                <td className="p-2">Efficiency</td>
                <td className="p-2 font-mono">Price = weighted beliefs</td>
                <td className="p-2">Prices ≈ info aggregator</td>
              </tr>
              <tr>
                <td className="p-2">Black–Litterman</td>
                <td className="p-2 font-mono">Posterior update formula</td>
                <td className="p-2">Rational expectations in practice</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
          <h3 className="text-lg font-semibold mb-2 text-foreground">So What?</h3>
          <p className="text-sm text-foreground">
            Global diversification reduces risk through low correlations, but home bias persists due to information asymmetry. 
            The Grossman model shows how private signals shape equilibrium prices, creating a feedback loop between information 
            gathering and market efficiency. Black–Litterman operationalizes this framework for practical portfolio construction.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Information & Global Markets" theory={theory}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-information">
          <TabsTrigger value="foreign-assets" data-testid="tab-foreign-assets">Foreign Assets</TabsTrigger>
          <TabsTrigger value="home-bias" data-testid="tab-home-bias">Home Bias</TabsTrigger>
          <TabsTrigger value="grossman" data-testid="tab-grossman">Grossman Model</TabsTrigger>
        </TabsList>

        {/* Tab 1: Foreign Assets Simulator */}
        <TabsContent value="foreign-assets" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Foreign Assets Diversification Simulator</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Explore how correlation (ρ) and FX volatility affect international diversification benefits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Home Weight Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="wh-slider" className="text-sm font-medium">
                    Home Weight (w<sub>H</sub>)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-wh">
                    {(wH * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  id="wh-slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[wH]}
                  onValueChange={(value) => setWH(value[0])}
                  data-testid="slider-wh"
                />
                <p className="text-xs text-muted-foreground">Allocation to domestic market</p>
              </div>

              {/* Correlation Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="rho-slider" className="text-sm font-medium">
                    Correlation (ρ)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-rho">
                    {rho.toFixed(2)}
                  </span>
                </div>
                <Slider
                  id="rho-slider"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={[rho]}
                  onValueChange={(value) => setRho(value[0])}
                  data-testid="slider-rho"
                />
                <p className="text-xs text-muted-foreground">Correlation between markets</p>
              </div>

              {/* FX Volatility Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="fx-slider" className="text-sm font-medium">
                    FX Volatility (σ<sub>FX</sub>)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-fx">
                    {(fxVol * 100).toFixed(1)}%
                  </span>
                </div>
                <Slider
                  id="fx-slider"
                  min={0}
                  max={0.3}
                  step={0.01}
                  value={[fxVol]}
                  onValueChange={(value) => setFxVol(value[0])}
                  data-testid="slider-fx"
                />
                <p className="text-xs text-muted-foreground">Currency risk volatility</p>
              </div>
            </div>

            {/* Results Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="text-sm font-semibold mb-1">Portfolio Vol (no FX)</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{(portfolioVol * 100).toFixed(2)}%</p>
              </Card>
              <Card className="p-4 bg-purple-50 border-purple-200">
                <h3 className="text-sm font-semibold mb-1">Portfolio Vol (with FX)</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{(portfolioVolWithFX * 100).toFixed(2)}%</p>
              </Card>
              <Card className="p-4 bg-green-50 border-green-200">
                <h3 className="text-sm font-semibold mb-1">Diversification Benefit</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{(divBenefit * 100).toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">σ<sub>H</sub> - σ<sub>p</sub></p>
              </Card>
            </div>

            {/* Volatility vs Correlation Chart */}
            <div className="h-96">
              <Plot
                data={[
                  {
                    x: rhoValues,
                    y: volValues.map(v => v * 100),
                    type: "scatter",
                    mode: "lines",
                    name: "Portfolio Volatility",
                    line: { color: "#3b82f6", width: 3 },
                  },
                  {
                    x: [rho],
                    y: [portfolioVol * 100],
                    type: "scatter",
                    mode: "markers",
                    name: "Current",
                    marker: { color: "#ef4444", size: 12 },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: {
                    title: "Correlation (ρ)",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  yaxis: {
                    title: "Portfolio Volatility (%)",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  margin: { l: 60, r: 20, t: 20, b: 60 },
                  showlegend: true,
                  legend: { x: 0.7, y: 0.95, bgcolor: "rgba(255,255,255,0.9)" },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-sm text-foreground">
                <strong>Tooltip:</strong> As ρ ↓, volatility ↓ → diversification benefit ↑. 
                Current setting: {rho < 0 ? "Negative" : rho < 0.3 ? "Low" : rho < 0.7 ? "Moderate" : "High"} correlation 
                provides {divBenefit > 0.05 ? "strong" : divBenefit > 0.02 ? "moderate" : "limited"} diversification.
                {fxVol > 0.15 && " Warning: High FX volatility may offset diversification gains!"}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Home Bias Visualizer */}
        <TabsContent value="home-bias" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Home Bias Visualizer</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Analyze how home bias affects portfolio efficiency through the Sharpe ratio.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Home Bias Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bias-slider" className="text-sm font-medium">
                    Home Bias (%)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-bias">
                    {homeBias}%
                  </span>
                </div>
                <Slider
                  id="bias-slider"
                  min={0}
                  max={100}
                  step={5}
                  value={[homeBias]}
                  onValueChange={(value) => setHomeBias(value[0])}
                  data-testid="slider-bias"
                />
                <p className="text-xs text-muted-foreground">% allocated to home market</p>
              </div>

              {/* Expected Return Gap Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="delta-slider" className="text-sm font-medium">
                    Return Gap (Δμ)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-delta">
                    {(deltaReturn * 100).toFixed(2)}%
                  </span>
                </div>
                <Slider
                  id="delta-slider"
                  min={-0.02}
                  max={0.02}
                  step={0.001}
                  value={[deltaReturn]}
                  onValueChange={(value) => setDeltaReturn(value[0])}
                  data-testid="slider-delta"
                />
                <p className="text-xs text-muted-foreground">Foreign - Home expected return</p>
              </div>

              {/* Sigma Ratio Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sigma-ratio-slider" className="text-sm font-medium">
                    σ Ratio (σ<sub>H</sub>/σ<sub>F</sub>)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-sigma-ratio">
                    {sigmaRatio.toFixed(2)}
                  </span>
                </div>
                <Slider
                  id="sigma-ratio-slider"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[sigmaRatio]}
                  onValueChange={(value) => setSigmaRatio(value[0])}
                  data-testid="slider-sigma-ratio"
                />
                <p className="text-xs text-muted-foreground">Relative volatility</p>
              </div>
            </div>

            {/* Results Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="text-sm font-semibold mb-1">Current Sharpe Ratio</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{currentSharpe.toFixed(3)}</p>
              </Card>
              <Card className="p-4 bg-green-50 border-green-200">
                <h3 className="text-sm font-semibold mb-1">Optimal Bias</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{optimalBias}%</p>
                <p className="text-xs text-muted-foreground mt-1">SR = {optimalSharpe.toFixed(3)}</p>
              </Card>
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="text-sm font-semibold mb-1">Efficiency Loss</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{efficiencyLoss.toFixed(1)}%</p>
              </Card>
            </div>

            {/* Sharpe Ratio Chart */}
            <div className="h-96">
              <Plot
                data={[
                  {
                    x: biasLevels,
                    y: sharpeRatios,
                    type: "scatter",
                    mode: "lines",
                    name: "Sharpe Ratio",
                    line: { color: "#3b82f6", width: 3 },
                  },
                  {
                    x: [homeBias],
                    y: [currentSharpe],
                    type: "scatter",
                    mode: "markers",
                    name: "Current Position",
                    marker: { color: "#ef4444", size: 12 },
                  },
                  {
                    x: [optimalBias],
                    y: [optimalSharpe],
                    type: "scatter",
                    mode: "markers",
                    name: "Optimal",
                    marker: { color: "#10b981", size: 12, symbol: "star" },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: {
                    title: "Home Bias (%)",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  yaxis: {
                    title: "Sharpe Ratio",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  margin: { l: 60, r: 20, t: 20, b: 60 },
                  showlegend: true,
                  legend: { x: 0.7, y: 0.95, bgcolor: "rgba(255,255,255,0.9)" },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
              <p className="text-sm text-foreground">
                <strong>Message:</strong> A {homeBias}% home bias reduces efficiency by {efficiencyLoss.toFixed(1)}% compared to the optimal allocation of {optimalBias}%. 
                {homeBias === 100 && " Full home bias significantly underperforms global diversification!"}
                {Math.abs(homeBias - optimalBias) < 10 && " You're close to the optimal allocation!"}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Grossman Model Simulator */}
        <TabsContent value="grossman" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Grossman Model Simulator</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Visualize how private signal quality and risk aversion shape equilibrium and information aggregation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Signal Precision Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="precision-slider" className="text-sm font-medium">
                    ρ (Signal Precision)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-precision">
                    {signalPrecision.toFixed(2)}
                  </span>
                </div>
                <Slider
                  id="precision-slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[signalPrecision]}
                  onValueChange={(value) => setSignalPrecision(value[0])}
                  data-testid="slider-precision"
                />
                <p className="text-xs text-muted-foreground">Signal-truth correlation</p>
              </div>

              {/* Risk Aversion Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="aversion-slider" className="text-sm font-medium">
                    a (Risk Aversion)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-aversion">
                    {riskAversion.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="aversion-slider"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={[riskAversion]}
                  onValueChange={(value) => setRiskAversion(value[0])}
                  data-testid="slider-aversion"
                />
                <p className="text-xs text-muted-foreground">CARA parameter</p>
              </div>

              {/* Info Cost Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="cost-slider" className="text-sm font-medium">
                    C (Info Cost)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-cost">
                    {infoCost.toFixed(2)}
                  </span>
                </div>
                <Slider
                  id="cost-slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[infoCost]}
                  onValueChange={(value) => setInfoCost(value[0])}
                  data-testid="slider-cost"
                />
                <p className="text-xs text-muted-foreground">Reduces participation</p>
              </div>

              {/* Number of Investors Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="investors-slider" className="text-sm font-medium">
                    N (Investors)
                  </Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-investors">
                    {numInvestors}
                  </span>
                </div>
                <Slider
                  id="investors-slider"
                  min={1}
                  max={20}
                  step={1}
                  value={[numInvestors]}
                  onValueChange={(value) => setNumInvestors(value[0])}
                  data-testid="slider-investors"
                />
                <p className="text-xs text-muted-foreground">Market participants</p>
              </div>
            </div>

            {/* Results Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h3 className="text-sm font-semibold mb-1">Equilibrium Price</h3>
                <p className="text-2xl font-mono font-bold text-foreground">${P_eq.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">True: ${P_true}</p>
              </Card>
              <Card className="p-4 bg-purple-50 border-purple-200">
                <h3 className="text-sm font-semibold mb-1">Info Index</h3>
                <p className="text-2xl font-mono font-bold text-foreground">{(infoIndex * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">ρ × (1 - C)</p>
              </Card>
              <Card className="p-4 bg-green-50 border-green-200">
                <h3 className="text-sm font-semibold mb-1">Avg Position</h3>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {(positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(2)}
                </p>
              </Card>
            </div>

            {/* Investor Positions Bar Chart */}
            <div className="h-80 mb-6">
              <Plot
                data={[
                  {
                    x: Array.from({ length: numInvestors }, (_, i) => `Inv ${i + 1}`),
                    y: positions,
                    type: "bar",
                    name: "Position Size",
                    marker: { color: "#3b82f6" },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: {
                    title: "Investor",
                    gridcolor: "#e5e7eb",
                  },
                  yaxis: {
                    title: "Position (X<sub>i</sub>)",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  margin: { l: 60, r: 20, t: 20, b: 60 },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* Price Informativeness Chart */}
            <div className="h-80">
              <Plot
                data={[
                  {
                    x: Array.from({ length: 21 }, (_, i) => i * 0.05),
                    y: Array.from({ length: 21 }, (_, i) => (i * 0.05) * (1 - infoCost) * 100),
                    type: "scatter",
                    mode: "lines",
                    name: "Info Index",
                    line: { color: "#10b981", width: 3 },
                  },
                  {
                    x: [signalPrecision],
                    y: [infoIndex * 100],
                    type: "scatter",
                    mode: "markers",
                    name: "Current",
                    marker: { color: "#ef4444", size: 12 },
                  },
                ]}
                layout={{
                  autosize: true,
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                  xaxis: {
                    title: "Signal Precision (ρ)",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  yaxis: {
                    title: "Price Informativeness Index (%)",
                    gridcolor: "#e5e7eb",
                    showgrid: true,
                  },
                  margin: { l: 60, r: 20, t: 20, b: 60 },
                  showlegend: true,
                  legend: { x: 0.05, y: 0.95, bgcolor: "rgba(255,255,255,0.9)" },
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200 space-y-2">
              <p className="text-sm text-foreground">
                <strong>Dynamic Analysis:</strong> At ρ = {signalPrecision.toFixed(2)} and a = {riskAversion.toFixed(1)}, 
                price reflects ≈ {(infoIndex * 100).toFixed(0)}% of private information.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><strong>Increasing ρ</strong> tightens beliefs → positions ↑ → price reflects more information</li>
                <li><strong>Higher a or C</strong> reduces participation → prices less informative</li>
                <li><strong>More investors (N)</strong> can improve price discovery through aggregation</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
