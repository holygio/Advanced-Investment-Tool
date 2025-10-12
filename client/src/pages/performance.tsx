import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalState } from "@/contexts/global-state-context";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Plot from "react-plotly.js";

export default function Performance() {
  const { globalState } = useGlobalState();
  const [tau, setTau] = useState(0);
  const [n, setN] = useState(2);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch portfolio data
  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["/api/data/prices", globalState.tickers, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: globalState.tickers,
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1mo",
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: globalState.tickers.length > 0,
  });

  // Fetch multi-asset metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/risk/multi-asset-metrics", portfolioData, globalState.riskFreeRate, globalState.marketProxy],
    queryFn: async () => {
      if (!portfolioData?.returns) return null;
      
      const assets = Object.keys(portfolioData.returns).map(ticker => ({
        ticker,
        returns: portfolioData.returns[ticker].map((d: any) => d.ret)
      }));

      const response = await apiRequest("/api/risk/multi-asset-metrics", {
        method: "POST",
        body: JSON.stringify({
          assets,
          market_ticker: globalState.marketProxy,
          rf: globalState.riskFreeRate,
          interval: "1mo"
        }),
      });
      return response;
    },
    enabled: !!portfolioData?.returns,
  });

  // Fetch LPM frontier
  const { data: frontierData, isLoading: frontierLoading } = useQuery({
    queryKey: ["/api/risk/lpm-frontier", portfolioData, tau, n],
    queryFn: async () => {
      if (!portfolioData?.returns) return null;
      
      const assets = Object.keys(portfolioData.returns).map(ticker => ({
        ticker,
        returns: portfolioData.returns[ticker].map((d: any) => d.ret)
      }));

      const response = await apiRequest("/api/risk/lpm-frontier", {
        method: "POST",
        body: JSON.stringify({
          assets,
          tau,
          n,
          num_points: 30
        }),
      });
      return response;
    },
    enabled: !!portfolioData?.returns,
  });

  // Calculate portfolio distribution for histogram
  const portfolioReturns = portfolioData?.returns ? (() => {
    const tickers = Object.keys(portfolioData.returns);
    return portfolioData.returns[tickers[0]].map((_: any, idx: number) => {
      const avgReturn = tickers.reduce((sum, ticker) => {
        return sum + (portfolioData.returns[ticker][idx]?.ret || 0);
      }, 0) / tickers.length;
      return avgReturn;
    });
  })() : [];

  // Calculate correlation matrix
  const correlationData = portfolioData?.returns ? (() => {
    const tickers = Object.keys(portfolioData.returns);
    const n = tickers.length;
    const corrMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returns1 = portfolioData.returns[tickers[i]].map((d: any) => d.ret);
        const returns2 = portfolioData.returns[tickers[j]].map((d: any) => d.ret);
        
        const mean1 = returns1.reduce((a: number, b: number) => a + b, 0) / returns1.length;
        const mean2 = returns2.reduce((a: number, b: number) => a + b, 0) / returns2.length;
        
        let cov = 0;
        let var1 = 0;
        let var2 = 0;
        
        for (let k = 0; k < returns1.length; k++) {
          const diff1 = returns1[k] - mean1;
          const diff2 = returns2[k] - mean2;
          cov += diff1 * diff2;
          var1 += diff1 * diff1;
          var2 += diff2 * diff2;
        }
        
        corrMatrix[i][j] = cov / Math.sqrt(var1 * var2);
      }
    }
    
    return { tickers, matrix: corrMatrix };
  })() : null;

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Portfolio Performance and Risk in Practice</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The five classical performance metrics assess efficiency across different risk types. In parallel, 
          Lower Partial Moments (LPM) and the Return–LPM Frontier extend risk measurement to asymmetric losses.
        </p>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Five Risk-Adjusted Performance Metrics</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Sharpe Ratio</p>
            <p className="font-mono text-sm mb-1 text-foreground">SR = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>p</sub></p>
            <p className="text-muted-foreground">Excess return per unit of total volatility</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Treynor Ratio</p>
            <p className="font-mono text-sm mb-1 text-foreground">TR = (R<sub>p</sub> - R<sub>f</sub>) / β<sub>p</sub></p>
            <p className="text-muted-foreground">Excess return per unit of systematic risk (beta)</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Information Ratio</p>
            <p className="font-mono text-sm mb-1 text-foreground">IR = α<sub>p</sub> / σ<sub>ε,p</sub></p>
            <p className="text-muted-foreground">Alpha per unit of idiosyncratic (tracking) error</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Jensen's Alpha</p>
            <p className="font-mono text-sm mb-1 text-foreground">α = R<sub>p</sub> - [R<sub>f</sub> + β<sub>p</sub>(R<sub>m</sub> - R<sub>f</sub>)]</p>
            <p className="text-muted-foreground">Portion of return not explained by CAPM (manager skill)</p>
          </div>
          <div className="bg-muted/50 p-3 rounded border border-border">
            <p className="font-semibold mb-1 text-foreground">Modigliani–Modigliani (M²)</p>
            <p className="font-mono text-sm mb-1 text-foreground">M² = R<sub>p,adj</sub> - R<sub>m</sub></p>
            <p className="text-muted-foreground">Portfolio return adjusted to have same volatility as benchmark (Sharpe in %)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Lower Partial Moments (LPM)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          While mean–variance theory treats all volatility as risk, LPM focuses only on downside outcomes, 
          aligning better with investor preferences. The Return–LPM frontier extends the efficient frontier 
          using this asymmetric risk measure.
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
          <p className="text-foreground mb-2">LPM<sub>n</sub>(τ) = E[(min(0, R - τ))<sup>n</sup>]</p>
          <p className="text-xs text-muted-foreground">
            • n = 1: Mean shortfall (linear downside)<br/>
            • n = 2: Semivariance (downside volatility)<br/>
            • τ: Threshold return (often 0 or risk-free rate)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Interpretation Guide</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Sharpe:</strong> Total risk adjustment - suitable when portfolio is investor's only holding</li>
          <li><strong className="text-foreground">Treynor:</strong> Systematic risk only - appropriate when portfolio is part of diversified holdings</li>
          <li><strong className="text-foreground">Information Ratio:</strong> Manager skill measurement - captures alpha generation efficiency</li>
          <li><strong className="text-foreground">Jensen's Alpha:</strong> Absolute CAPM outperformance - positive alpha suggests manager adds value</li>
          <li><strong className="text-foreground">M²:</strong> Sharpe ratio expressed as percentage return - easier to compare across portfolios</li>
        </ul>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Risk & Performance" theory={theory}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-performance">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="lpm-frontier" data-testid="tab-lpm-frontier">LPM & Frontier</TabsTrigger>
          <TabsTrigger value="metrics" data-testid="tab-metrics">Ratios & Performance</TabsTrigger>
          <TabsTrigger value="correlations" data-testid="tab-correlations">Correlations</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
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
                      title: "Monthly Return", 
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
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">Loading distribution...</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Distribution Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Mean Return (Annual)</p>
                <p className="text-3xl font-mono font-semibold tabular-nums" data-testid="stat-mean">
                  {metricsData?.metrics?.[0] 
                    ? (metricsData.metrics.reduce((sum: number, m: any) => sum + m.mean, 0) / metricsData.metrics.length * 100).toFixed(2) + "%" 
                    : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Volatility (Annual)</p>
                <p className="text-3xl font-mono font-semibold tabular-nums" data-testid="stat-vol">
                  {metricsData?.metrics?.[0] 
                    ? (metricsData.metrics.reduce((sum: number, m: any) => sum + m.std, 0) / metricsData.metrics.length * 100).toFixed(2) + "%" 
                    : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg Sharpe Ratio</p>
                <p className="text-3xl font-mono font-semibold tabular-nums" data-testid="stat-sharpe">
                  {metricsData?.metrics?.[0] 
                    ? (metricsData.metrics.reduce((sum: number, m: any) => sum + m.sharpe, 0) / metricsData.metrics.length).toFixed(3) 
                    : "—"}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: LPM & Frontier */}
        <TabsContent value="lpm-frontier" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">LPM Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="tau-slider">Threshold τ (Target Return)</Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-tau">
                    {tau.toFixed(3)}
                  </span>
                </div>
                <Slider
                  id="tau-slider"
                  min={-0.03}
                  max={0.03}
                  step={0.001}
                  value={[tau]}
                  onValueChange={(value) => setTau(value[0])}
                  data-testid="slider-tau"
                />
                <p className="text-xs text-muted-foreground">
                  Returns below this threshold contribute to downside risk
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="n-slider">Moment Order n</Label>
                  <span className="text-sm font-mono tabular-nums text-foreground" data-testid="value-n">
                    {n.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="n-slider"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[n]}
                  onValueChange={(value) => setN(value[0])}
                  data-testid="slider-n"
                />
                <p className="text-xs text-muted-foreground">
                  n=1: linear, n=2: semivariance, n=3: higher penalty
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Return–LPM Efficient Frontier</h2>
            <div className="h-96">
              {frontierData?.frontier?.length > 0 ? (
                <Plot
                  data={[
                    {
                      x: frontierData.frontier.map((p: any) => p.lpm),
                      y: frontierData.frontier.map((p: any) => p.target_return * 100),
                      type: "scatter",
                      mode: "lines+markers",
                      name: `LPM Frontier (τ=${tau.toFixed(3)}, n=${n.toFixed(1)})`,
                      line: { color: "#3b82f6", width: 3 },
                      marker: { size: 6, color: "#3b82f6" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: `LPM${n.toFixed(1)}(τ=${tau.toFixed(3)})`, 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    yaxis: { 
                      title: "Expected Return (%)", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 60 },
                    showlegend: true,
                    legend: { x: 0.02, y: 0.98, bgcolor: "rgba(255,255,255,0.9)" },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">
                    {frontierLoading ? "Computing LPM frontier..." : "No frontier data"}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              <strong>Interpretation:</strong> The Return–LPM frontier shows optimal portfolios minimizing downside risk 
              for each level of expected return. Unlike traditional mean-variance, it penalizes only losses below threshold τ.
            </p>
          </Card>
        </TabsContent>

        {/* Tab 3: Ratios & Performance */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard 
              label="Avg Sharpe" 
              value={metricsData?.metrics ? 
                metricsData.metrics.reduce((sum: number, m: any) => sum + m.sharpe, 0) / metricsData.metrics.length : 
                0
              } 
              precision={3} 
              data-testid="metric-sharpe"
            />
            <MetricCard 
              label="Avg Treynor" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.treynor !== null)
                  .reduce((sum: number, m: any) => sum + (m.treynor || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.treynor !== null).length : 
                0
              } 
              precision={3} 
              data-testid="metric-treynor"
            />
            <MetricCard 
              label="Avg Info Ratio" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.info_ratio !== null)
                  .reduce((sum: number, m: any) => sum + (m.info_ratio || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.info_ratio !== null).length : 
                0
              } 
              precision={3} 
              data-testid="metric-info-ratio"
            />
            <MetricCard 
              label="Avg Jensen α" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.jensen_alpha !== null)
                  .reduce((sum: number, m: any) => sum + (m.jensen_alpha || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.jensen_alpha !== null).length : 
                0
              } 
              format="percentage" 
              data-testid="metric-jensen"
            />
            <MetricCard 
              label="Avg M²" 
              value={metricsData?.metrics ? 
                metricsData.metrics.filter((m: any) => m.m2 !== null)
                  .reduce((sum: number, m: any) => sum + (m.m2 || 0), 0) / 
                metricsData.metrics.filter((m: any) => m.m2 !== null).length : 
                0
              } 
              format="percentage" 
              data-testid="metric-m2"
            />
          </div>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Performance Comparison</h2>
            <div className="h-96">
              {metricsData?.metrics?.length > 0 ? (
                <Plot
                  data={[
                    {
                      x: metricsData.metrics.map((m: any) => m.ticker),
                      y: metricsData.metrics.map((m: any) => m.sharpe),
                      type: "bar",
                      name: "Sharpe Ratio",
                      marker: { color: "#3b82f6" },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Asset", 
                      gridcolor: "#e5e7eb",
                    },
                    yaxis: { 
                      title: "Sharpe Ratio", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                    },
                    margin: { l: 60, r: 20, t: 20, b: 80 },
                    showlegend: false,
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">Loading metrics...</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Detailed Metrics Table</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Mean</TableHead>
                    <TableHead className="text-right">Volatility</TableHead>
                    <TableHead className="text-right">Sharpe</TableHead>
                    <TableHead className="text-right">Treynor</TableHead>
                    <TableHead className="text-right">Info Ratio</TableHead>
                    <TableHead className="text-right">Jensen α</TableHead>
                    <TableHead className="text-right">M²</TableHead>
                    <TableHead className="text-right">Beta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsData?.metrics?.map((metric: any) => (
                    <TableRow key={metric.ticker} data-testid={`row-metric-${metric.ticker}`}>
                      <TableCell className="font-medium">{metric.ticker}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {(metric.mean * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {(metric.std * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.sharpe.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.treynor !== null ? metric.treynor.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.info_ratio !== null ? metric.info_ratio.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.jensen_alpha !== null ? (metric.jensen_alpha * 100).toFixed(2) + "%" : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.m2 !== null ? (metric.m2 * 100).toFixed(2) + "%" : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {metric.beta !== null ? metric.beta.toFixed(3) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Correlations */}
        <TabsContent value="correlations" className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Correlation Matrix</h2>
            <div className="h-96">
              {correlationData ? (
                <Plot
                  data={[
                    {
                      z: correlationData.matrix,
                      x: correlationData.tickers,
                      y: correlationData.tickers,
                      type: "heatmap",
                      colorscale: [
                        [0, "#ef4444"],
                        [0.5, "#f3f4f6"],
                        [1, "#22c55e"],
                      ],
                      zmin: -1,
                      zmax: 1,
                      colorbar: {
                        title: "Correlation",
                        titleside: "right",
                      },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 10 },
                    margin: { l: 60, r: 60, t: 20, b: 80 },
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">Loading correlations...</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Beta vs Market ({globalState.marketProxy})</h2>
            <div className="h-80">
              {metricsData?.metrics?.length > 0 ? (
                <Plot
                  data={[
                    {
                      x: metricsData.metrics.filter((m: any) => m.beta !== null).map((m: any) => m.ticker),
                      y: metricsData.metrics.filter((m: any) => m.beta !== null).map((m: any) => m.beta),
                      type: "bar",
                      marker: { 
                        color: metricsData.metrics.filter((m: any) => m.beta !== null).map((m: any) => 
                          m.beta > 1 ? "#ef4444" : m.beta < 1 ? "#22c55e" : "#3b82f6"
                        ) 
                      },
                    },
                  ]}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#1f2937", family: "Inter, sans-serif", size: 12 },
                    xaxis: { 
                      title: "Asset",
                      gridcolor: "#e5e7eb",
                    },
                    yaxis: { 
                      title: "Beta", 
                      gridcolor: "#e5e7eb",
                      showgrid: true,
                      zeroline: true,
                      zerolinecolor: "#9ca3af",
                    },
                    shapes: [{
                      type: 'line',
                      x0: -0.5,
                      x1: metricsData.metrics.filter((m: any) => m.beta !== null).length - 0.5,
                      y0: 1,
                      y1: 1,
                      line: {
                        color: '#6b7280',
                        width: 2,
                        dash: 'dash',
                      },
                    }],
                    margin: { l: 60, r: 20, t: 20, b: 80 },
                    showlegend: false,
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="h-full bg-background/50 rounded-md flex items-center justify-center border border-border">
                  <p className="text-sm text-muted-foreground">Loading beta data...</p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Beta {'>'} 1 (red): More volatile than market | Beta {'<'} 1 (green): Less volatile than market | Beta = 1 (blue): Market-like volatility
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
