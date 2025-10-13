import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalState } from "@/contexts/global-state-context";
import { apiRequest } from "@/lib/queryClient";
import { Network, TrendingUp } from "lucide-react";
import Plot from "react-plotly.js";

interface FactorDataPoint {
  date: string;
  "Mkt-RF": number;
  SMB: number;
  HML: number;
  RF: number;
  RMW?: number;
  CMA?: number;
}

interface RegressionResult {
  portfolio_name: string;
  alpha: number;
  alpha_tstat: number;
  alpha_pval: number;
  beta_mkt: number;
  beta_mkt_tstat: number;
  beta_smb: number;
  beta_smb_tstat: number;
  beta_hml: number;
  beta_hml_tstat: number;
  beta_rmw?: number;
  beta_rmw_tstat?: number;
  beta_cma?: number;
  beta_cma_tstat?: number;
  r_squared: number;
  adj_r_squared: number;
}

export default function FactorAnalyzer() {
  const { globalState } = useGlobalState();
  const [selectedModel, setSelectedModel] = useState<"FF3" | "FF5">("FF3");
  const [portfolioData, setPortfolioData] = useState<any>(null);

  // Load Fama-French factor data
  const { data: factorData } = useQuery({
    queryKey: ["/api/ff/data", globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: globalState.startDate,
        end_date: globalState.endDate,
      });
      return await apiRequest(`/api/ff/data?${params}`);
    },
  });

  // Fetch user's portfolio data
  const { data: priceData } = useQuery({
    queryKey: ["/api/data/prices", globalState.tickers, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      return await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: globalState.tickers,
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1mo",  // Monthly to match Fama-French
          log_returns: false,
        }),
      });
    },
    enabled: globalState.tickers.length > 0,
  });

  // Run factor analysis
  const { data: analysisResults } = useQuery({
    queryKey: ["/api/ff/analyze", selectedModel, priceData],
    queryFn: async () => {
      if (!priceData?.returns) return null;

      // Prepare portfolios (send raw returns - backend will handle excess returns using FF RF)
      const portfolios: Record<string, any[]> = {};
      
      for (const [ticker, returns] of Object.entries(priceData.returns as Record<string, any[]>)) {
        portfolios[ticker] = returns.map((r: any) => ({
          date: r.date,
          ret: r.ret,  // Send raw returns
        }));
      }

      return await apiRequest("/api/ff/analyze", {
        method: "POST",
        body: JSON.stringify({
          portfolios,
          model: selectedModel,
          start_date: globalState.startDate,
          end_date: globalState.endDate,
        }),
      });
    },
    enabled: !!priceData?.returns,
  });

  // Run GRS test
  const { data: grsResults } = useQuery({
    queryKey: ["/api/ff/grs", selectedModel, priceData],
    queryFn: async () => {
      if (!priceData?.returns) return null;

      // Prepare portfolios (send raw returns - backend will handle excess returns)
      const portfolios: Record<string, any[]> = {};
      
      for (const [ticker, returns] of Object.entries(priceData.returns as Record<string, any[]>)) {
        portfolios[ticker] = returns.map((r: any) => ({
          date: r.date,
          ret: r.ret,  // Send raw returns
        }));
      }

      return await apiRequest("/api/ff/grs", {
        method: "POST",
        body: JSON.stringify({
          portfolios,
          model: selectedModel,
          start_date: globalState.startDate,
          end_date: globalState.endDate,
        }),
      });
    },
    enabled: !!priceData?.returns,
  });

  const factorTheory = (
    <div className="space-y-6 py-6">
      {/* What Counts as an Anomaly? */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Anomalies & Multi-Factor Models</h2>
        <p className="text-muted-foreground leading-relaxed mb-2">
          An anomaly is a return pattern that is systematic and replicable yet unexplained by the baseline model (e.g., CAPM), and that is economically rationalizable rather than spurious.
        </p>
      </div>

      {/* Definition of Anomaly */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">What Counts as an "Anomaly"?</h3>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="text-foreground"><strong>1. Systematic Pattern:</strong> There must be a pattern tied to a characteristic (e.g., size, value). One-off wins don't qualify.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="text-foreground"><strong>2. Economic Rationale:</strong> It needs an economic rationale (risk story or friction) or else risks being data-mined.</p>
          </div>
          <div className="p-3 bg-muted/30 rounded border border-border">
            <p className="text-foreground"><strong>3. Tradable:</strong> If tradable, expected returns must reflect risk or limits to arbitrage (costs, shorting frictions, microcap illiquidity).</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> "Anomaly" means model misspecification or market imperfection—not magic.</p>
        </div>
      </div>

      {/* Core Equity Anomalies */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Core Equity Anomalies</h3>
        
        {/* Size (SMB) */}
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-semibold text-foreground mb-2">Size (SMB - Small Minus Big)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Idea:</strong> Small firms earn higher average returns than big firms after market beta adjustment.</p>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Stories:</strong> Lower analyst coverage, higher illiquidity, higher cash-flow risk; sample- and era-dependent.</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Note:</strong> Evidence varies by period/market; robustness is debated.</p>
        </div>

        {/* Value (HML) */}
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
          <h4 className="font-semibold text-foreground mb-2">Value (HML - High Minus Low B/M)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Idea:</strong> High book-to-market ("value") outperforms low B/M ("growth") beyond CAPM beta.</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Risk view:</strong> Distress/"bad times" sensitivity; accounting reliance critique persists.</p>
        </div>

        {/* Momentum (MOM) */}
        <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-200">
          <h4 className="font-semibold text-foreground mb-2">Momentum (MOM - Winners Minus Losers)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Idea:</strong> Past 6–12m winners beat losers over the next 6–12m (rebalanced).</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Caveats:</strong> Costly shorts, turnover, momentum crashes in panics; may proxy illiquidity.</p>
        </div>

        {/* Profitability & Investment (FF5) */}
        <div className="p-3 bg-amber-50 rounded border border-amber-200">
          <h4 className="font-semibold text-foreground mb-2">Profitability (RMW) & Investment (CMA) — FF (2015)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">RMW (Robust Minus Weak):</strong> More profitable firms earn more.</p>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">CMA (Conservative Minus Aggressive):</strong> Conservatively investing firms earn more; can subsume part of "value."</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Open question:</strong> Behavior for "new economy" or long-horizon R&D models.</p>
        </div>
      </div>

      {/* Factor Construction */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Factor Construction (Long–Short)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          How to build a zero-cost factor from sorted portfolios:
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong className="text-foreground">Rank stocks</strong> on a characteristic (size, B/M, momentum, profitability, investment)</p>
          <p>2. <strong className="text-foreground">Form portfolios:</strong> Deciles or 2×3 sorts (small/big × value/growth)</p>
          <p>3. <strong className="text-foreground">Factor return:</strong> Long top bucket, short bottom bucket</p>
        </div>
        <div className="mt-3 p-3 bg-muted/50 rounded font-mono text-sm border border-border">
          <p className="text-foreground">SMB = Small − Big</p>
          <p className="text-foreground">HML = High − Low</p>
          <p className="text-foreground">MOM = Winners − Losers</p>
          <p className="text-foreground">RMW = Robust − Weak</p>
          <p className="text-foreground">CMA = Conservative − Aggressive</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Portfolio-sorts amplify signal and stabilize betas; they're standard in anomaly testing.
        </p>
      </div>

      {/* Regression Forms */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Regression Forms</h3>
        
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">FF3 Time-Series:</strong></p>
          <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
            <p className="text-foreground">r<sub>i,t</sub> − r<sub>f,t</sub> = α<sub>i</sub> + β<sub>i,M</sub>(r<sub>M,t</sub> − r<sub>f,t</sub>) + β<sub>i,SMB</sub>SMB<sub>t</sub> + β<sub>i,HML</sub>HML<sub>t</sub> + ε<sub>i,t</sub></p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">FF5 adds RMW, CMA:</strong></p>
          <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
            <p className="text-foreground">r<sub>i,t</sub> − r<sub>f,t</sub> = α<sub>i</sub> + β<sub>i,M</sub>MKT<sub>t</sub> + β<sub>i,SMB</sub>SMB<sub>t</sub> + β<sub>i,HML</sub>HML<sub>t</sub></p>
            <p className="text-foreground ml-16">+ β<sub>i,RMW</sub>RMW<sub>t</sub> + β<sub>i,CMA</sub>CMA<sub>t</sub> + ε<sub>i,t</sub></p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Carhart 4-Factor adds Momentum:</strong></p>
          <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
            <p className="text-foreground">+ β<sub>i,MOM</sub>MOM<sub>t</sub></p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3">
          <strong className="text-foreground">Interpretation:</strong> Betas are loadings; alphas are pricing errors (should be ~0 if model holds).
        </p>
      </div>

      {/* Cross-Section (Expanded SML) */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Cross-Section (Expanded SML)</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
          <p className="text-foreground">E[r<sub>i</sub>] − r<sub>f</sub> = λ<sub>M</sub>β<sub>i,M</sub> + λ<sub>SMB</sub>β<sub>i,SMB</sub> + λ<sub>HML</sub>β<sub>i,HML</sub> + ...</p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Each λ is a factor risk premium (expected return on the long–short factor).
        </p>
      </div>

      {/* SDF View */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">SDF (Pricing Kernel) View — Why Factors = Risks</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Start from 1 = E[mR]. A linear SDF with K priced factors:
        </p>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm border border-border">
          <p className="text-foreground">m<sub>t</sub> = a + b′f<sub>t</sub>, where f<sub>t</sub> = [MKT<sub>t</sub>, SMB<sub>t</sub>, HML<sub>t</sub>, ...]′</p>
          <p className="text-foreground mt-2">b′ &lt; 0 (risk-averse)</p>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-foreground"><strong>Economic requirement:</strong> Any factor in the model must represent a risk that commands a price, not pure mispricing noise.</p>
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> Adding a factor to the regression also means adding it to the SDF. If you can't tell a risk story, your "factor" is likely data-mined.</p>
        </div>
      </div>

      {/* Testing Methodology */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Testing Anomalies & Models</h3>
        
        {/* Portfolio Sorts */}
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <h4 className="font-semibold text-foreground mb-2">1. Portfolio Sorts (Signal Amplification)</h4>
          <p className="text-sm text-muted-foreground">• Rank by characteristic; form K portfolios</p>
          <p className="text-sm text-muted-foreground">• Examine monotonicity in average returns and factor betas</p>
          <p className="text-sm text-muted-foreground">• Construct the factor as Long–Short extreme portfolios to test the premium</p>
        </div>

        {/* Fama-MacBeth */}
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
          <h4 className="font-semibold text-foreground mb-2">2. Fama–MacBeth (Two-Pass)</h4>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Pass 1 (time-series):</strong> Estimate betas on factors</p>
          <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">Pass 2 (cross-section):</strong> Regress average returns on betas → estimate λ's; test intercept ~ 0</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">Cautions:</strong> Errors-in-variables, beta instability; use portfolios and Newey–West SEs</p>
        </div>

        {/* GRS Test */}
        <div className="p-3 bg-purple-50 rounded border border-purple-200">
          <h4 className="font-semibold text-foreground mb-2">3. GRS Joint Alpha Test (Time-Series-Only)</h4>
          <p className="text-sm text-muted-foreground mb-2">Run time-series regressions for N test portfolios on K factors; test whether all alphas = 0 jointly using the GRS F-statistic (weights residual covariance).</p>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">If rejected →</strong> model fails to price the test assets.</p>
        </div>
      </div>

      {/* Implementation & Robustness */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Implementation & Robustness</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong className="text-foreground">Sample dependence / p-hacking:</strong> Effects vary by time/market; require out-of-sample and pre-spec tests</p>
          <p>• <strong className="text-foreground">Microcaps & delistings:</strong> Filter and include delisting returns; control for liquidity and fees</p>
          <p>• <strong className="text-foreground">Look-ahead / survivorship bias:</strong> Use point-in-time accounting; avoid future info</p>
          <p>• <strong className="text-foreground">Trading frictions & short constraints:</strong> Momentum and some value signals are costly to implement</p>
          <p>• <strong className="text-foreground">Multiple-testing:</strong> Many documented "factors" are correlated; use clustering or PCA to avoid double-counting</p>
        </div>
      </div>

      {/* Trading Considerations */}
      <div className="bg-white rounded-md p-4 border-2 border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Trading Against/With Anomalies</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong className="text-foreground">Pure factor long–short</strong> is zero-investment but may carry unwanted exposures to other factors; hedge or neutralize</p>
          <p>• <strong className="text-foreground">Exposure drift & noisy betas:</strong> Use deciles/quantiles and scaling to mitigate estimation error; beware regime shifts and momentum crashes</p>
        </div>
        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-foreground"><strong>So what?</strong> Even if an anomaly is "real," implementation determines whether it's exploitable after costs and constraints.</p>
        </div>
      </div>

      {/* So What? Summary */}
      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
        <h3 className="text-lg font-semibold mb-2 text-foreground">So What?</h3>
        <p className="text-sm text-foreground">
          Multi-factor models extend CAPM by adding dimensions of systematic risk. Each factor represents a tradable risk premium that cannot be diversified away. 
          These patterns motivate portfolio construction, performance attribution, and risk management—but only if they survive implementation frictions and out-of-sample testing.
        </p>
      </div>
    </div>
  );

  // Correlation heatmap
  const renderCorrelationHeatmap = () => {
    if (!factorData) return null;

    const corr = selectedModel === "FF3" 
      ? factorData.correlation_ff3 
      : factorData.correlation_ff5;

    return (
      <Plot
        data={[{
          z: corr.matrix,
          x: corr.factors,
          y: corr.factors,
          type: 'heatmap',
          colorscale: 'RdBu',
          zmid: 0,
          text: corr.matrix.map((row: number[]) => 
            row.map(val => val.toFixed(2))
          ),
          texttemplate: '%{text}',
          textfont: { size: 12 },
          hovertemplate: '%{x} × %{y}: %{z:.3f}<extra></extra>',
        }]}
        layout={{
          title: 'Factor Correlation Matrix',
          xaxis: { title: '', side: 'bottom' },
          yaxis: { title: '', autorange: 'reversed' },
          height: 400,
          margin: { l: 100, r: 50, t: 80, b: 100 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        config={{ displayModeBar: false }}
        className="w-full"
      />
    );
  };

  // Cumulative factor returns chart
  const renderFactorPremiaChart = () => {
    if (!factorData) return null;

    const data = selectedModel === "FF3" ? factorData.ff3 : factorData.ff5;
    const factors = selectedModel === "FF3" 
      ? ['Mkt-RF', 'SMB', 'HML'] 
      : ['Mkt-RF', 'SMB', 'HML', 'RMW', 'CMA'];

    // Compute cumulative returns for each factor
    const traces = factors.map(factor => {
      const cumulativeReturns = data.reduce((acc: number[], point: FactorDataPoint) => {
        const lastValue = acc.length > 0 ? acc[acc.length - 1] : 1;
        const factorReturn = point[factor as keyof FactorDataPoint] as number;
        acc.push(lastValue * (1 + factorReturn));
        return acc;
      }, []);

      return {
        x: data.map((d: FactorDataPoint) => d.date),
        y: cumulativeReturns,
        type: 'scatter',
        mode: 'lines',
        name: factor,
        line: { width: 2 },
      };
    });

    return (
      <Plot
        data={traces as any}
        layout={{
          title: 'Cumulative Factor Returns',
          xaxis: { title: 'Date', showgrid: true },
          yaxis: { title: 'Cumulative Return (Log Scale)', type: 'log', showgrid: true },
          height: 400,
          hovermode: 'x unified',
          legend: { orientation: 'h', y: -0.2 },
          margin: { l: 60, r: 40, t: 60, b: 100 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        config={{ displayModeBar: false }}
        className="w-full"
      />
    );
  };

  return (
    <ModuleLayout 
      title="Fama-French Factor Analysis" 
      theory={factorTheory}
    >
      <div className="space-y-6">
        {/* Model Selection */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Model Selection</h2>
          <RadioGroup value={selectedModel} onValueChange={(v) => setSelectedModel(v as "FF3" | "FF5")}>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FF3" id="ff3" data-testid="radio-ff3" />
                <Label htmlFor="ff3" className="cursor-pointer">
                  Fama-French 3-Factor (Mkt-RF, SMB, HML)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FF5" id="ff5" data-testid="radio-ff5" />
                <Label htmlFor="ff5" className="cursor-pointer">
                  Fama-French 5-Factor (+ RMW, CMA)
                </Label>
              </div>
            </div>
          </RadioGroup>
        </Card>

        {/* Data Source & Model Formula */}
        <Card className="p-6 bg-muted/30">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Model Equation</h3>
              <div className="bg-muted/50 p-4 rounded font-mono text-sm overflow-x-auto border border-border">
                {selectedModel === "FF3" ? (
                  <p className="whitespace-nowrap text-foreground">
                    R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>M</sub>(R<sub>M</sub> - R<sub>f</sub>) + β<sub>SMB</sub>·SMB + β<sub>HML</sub>·HML + ε<sub>i</sub>
                  </p>
                ) : (
                  <>
                    <p className="whitespace-nowrap mb-2 text-foreground">
                      R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>M</sub>(R<sub>M</sub> - R<sub>f</sub>) + β<sub>SMB</sub>·SMB + β<sub>HML</sub>·HML
                    </p>
                    <p className="whitespace-nowrap ml-16 text-foreground">
                      + β<sub>RMW</sub>·RMW + β<sub>CMA</sub>·CMA + ε<sub>i</sub>
                    </p>
                  </>
                )}
              </div>
            </div>
            
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <strong>Data Source:</strong> Historical factor returns from the{" "}
                <a 
                  href="https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Kenneth French Data Library
                </a>{" "}
                at Dartmouth College. Factor data: FF3 (1926-2024), FF5 (1963-2024). Your portfolio returns 
                are from Yahoo Finance and tested against these established factors.
              </p>
            </div>
          </div>
        </Card>

        {/* Summary Metrics */}
        {analysisResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Average R²"
              value={analysisResults.avg_r_squared}
              format="percentage"
              precision={1}
            />
            <MetricCard
              label="Average Adj. R²"
              value={analysisResults.avg_adj_r_squared}
              format="percentage"
              precision={1}
            />
            <MetricCard
              label="Significant Alphas"
              value={analysisResults.num_significant_alphas}
              format="number"
              precision={0}
            />
          </div>
        )}

        {/* Factor Data Tabs */}
        <Tabs defaultValue="stats" className="w-full">
          <TabsList>
            <TabsTrigger value="stats" data-testid="tab-stats">Descriptive Statistics</TabsTrigger>
            <TabsTrigger value="correlation" data-testid="tab-correlation">Correlations</TabsTrigger>
            <TabsTrigger value="premia" data-testid="tab-premia">Factor Premia</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Factor Statistics (Annualized)</h2>
              {factorData && (
                <DataTable
                  data={(selectedModel === "FF3" 
                    ? factorData.descriptive_stats_ff3 
                    : factorData.descriptive_stats_ff5
                  ).map((stat: any) => ({
                    factor: stat.factor,
                    mean: stat.mean * 12,  // Annualize
                    std: stat.std * Math.sqrt(12),  // Annualize
                    min: stat.min,
                    max: stat.max,
                  }))}
                  columns={[
                    { key: "factor", label: "Factor", align: "left" },
                    { 
                      key: "mean", 
                      label: "Mean (Annual)", 
                      align: "right",
                      format: (v) => `${(v * 100).toFixed(2)}%`
                    },
                    { 
                      key: "std", 
                      label: "Std Dev (Annual)", 
                      align: "right",
                      format: (v) => `${(v * 100).toFixed(2)}%`
                    },
                    { 
                      key: "min", 
                      label: "Min (Monthly)", 
                      align: "right",
                      format: (v) => `${(v * 100).toFixed(2)}%`
                    },
                    { 
                      key: "max", 
                      label: "Max (Monthly)", 
                      align: "right",
                      format: (v) => `${(v * 100).toFixed(2)}%`
                    },
                  ]}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="correlation" className="mt-6">
            <Card className="p-6">
              {renderCorrelationHeatmap()}
            </Card>
          </TabsContent>

          <TabsContent value="premia" className="mt-6">
            <Card className="p-6">
              {renderFactorPremiaChart()}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Regression Results */}
        {analysisResults?.regressions && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Regression Results</h2>
            <div className="overflow-x-auto">
              <DataTable
                data={analysisResults.regressions}
                columns={[
                  { key: "portfolio_name", label: "Portfolio", align: "left" },
                  { 
                    key: "alpha", 
                    label: "α (Annual)", 
                    align: "right",
                    format: (v) => `${(v * 12 * 100).toFixed(2)}%`
                  },
                  { 
                    key: "alpha_tstat", 
                    label: "t(α)", 
                    align: "right",
                    format: (v) => v.toFixed(2)
                  },
                  { 
                    key: "beta_mkt", 
                    label: "β(Mkt)", 
                    align: "right",
                    format: (v) => v.toFixed(3)
                  },
                  { 
                    key: "beta_smb", 
                    label: "β(SMB)", 
                    align: "right",
                    format: (v) => v.toFixed(3)
                  },
                  { 
                    key: "beta_hml", 
                    label: "β(HML)", 
                    align: "right",
                    format: (v) => v.toFixed(3)
                  },
                  ...(selectedModel === "FF5" ? [
                    { 
                      key: "beta_rmw", 
                      label: "β(RMW)", 
                      align: "right" as const,
                      format: (v: number) => v?.toFixed(3) || 'N/A'
                    },
                    { 
                      key: "beta_cma", 
                      label: "β(CMA)", 
                      align: "right" as const,
                      format: (v: number) => v?.toFixed(3) || 'N/A'
                    },
                  ] : []),
                  { 
                    key: "r_squared", 
                    label: "R²", 
                    align: "right",
                    format: (v) => `${(v * 100).toFixed(1)}%`
                  },
                ]}
              />
            </div>
          </Card>
        )}

        {/* GRS Test */}
        {grsResults && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">GRS Test for Pricing Efficiency</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">GRS Statistic</p>
                <p className="text-3xl font-mono font-semibold">{grsResults.grs_statistic.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">p-value</p>
                <p className="text-3xl font-mono font-semibold">{grsResults.p_value.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Portfolios Tested</p>
                <p className="text-3xl font-mono font-semibold">{grsResults.num_portfolios}</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-muted/30 rounded-md border border-border">
              <p className="text-sm font-medium mb-2">Interpretation:</p>
              <p className="text-sm text-muted-foreground">{grsResults.interpretation}</p>
            </div>
            <div className="mt-4 p-4 bg-muted/30 rounded-md border border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Methodology:</strong> The GRS test uses your portfolio returns from Yahoo Finance 
                and tests them against the historical Fama-French factors. It jointly tests whether all 
                alphas are zero. A low p-value (&lt; 0.05) indicates the model fails to price the assets correctly. 
                Test statistic: F({grsResults.num_portfolios}, {grsResults.num_observations - grsResults.num_portfolios - (selectedModel === "FF3" ? 3 : 5)})
              </p>
            </div>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}
