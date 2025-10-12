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

  const ff3Theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Fama-French 3-Factor Model</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The Fama-French three-factor model extends CAPM by adding size (SMB) and value (HML) factors
          to explain cross-sectional variation in stock returns beyond market beta.
        </p>
      </div>

      <div className="bg-card rounded-md p-6 border border-border">
        <h3 className="text-lg font-semibold mb-4">Model Equation</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm overflow-x-auto border border-border">
          <p className="whitespace-nowrap text-foreground">
            R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>M</sub>(R<sub>M</sub> - R<sub>f</sub>) + β<sub>SMB</sub>·SMB + β<sub>HML</sub>·HML + ε<sub>i</sub>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-md p-4 border border-border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Mkt-RF (Market)
          </h4>
          <p className="text-sm text-muted-foreground">
            Excess return on the market portfolio - captures systematic market risk
          </p>
        </div>
        <div className="bg-card rounded-md p-4 border border-border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            SMB (Size)
          </h4>
          <p className="text-sm text-muted-foreground">
            Small Minus Big - captures the size premium (small cap outperformance)
          </p>
        </div>
        <div className="bg-card rounded-md p-4 border border-border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            HML (Value)
          </h4>
          <p className="text-sm text-muted-foreground">
            High Minus Low - captures the value premium (value stock outperformance)
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Interpretation</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong>α (alpha):</strong> If significant and non-zero, the model fails to price the asset</li>
          <li><strong>β coefficients:</strong> Factor loadings indicating exposure to each risk factor</li>
          <li><strong>R²:</strong> Proportion of return variation explained by the factors</li>
        </ul>
      </div>
    </div>
  );

  const ff5Theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Fama-French 5-Factor Model</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The five-factor model adds profitability (RMW) and investment (CMA) factors to the original
          three-factor model for improved explanatory power.
        </p>
      </div>

      <div className="bg-card rounded-md p-6 border border-border">
        <h3 className="text-lg font-semibold mb-4">Model Equation</h3>
        <div className="bg-muted/50 p-4 rounded font-mono text-sm overflow-x-auto border border-border">
          <p className="whitespace-nowrap mb-2 text-foreground">
            R<sub>i</sub> - R<sub>f</sub> = α<sub>i</sub> + β<sub>M</sub>(R<sub>M</sub> - R<sub>f</sub>) + β<sub>SMB</sub>·SMB + β<sub>HML</sub>·HML
          </p>
          <p className="whitespace-nowrap ml-16 text-foreground">
            + β<sub>RMW</sub>·RMW + β<sub>CMA</sub>·CMA + ε<sub>i</sub>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-md p-4 border border-border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            RMW (Profitability)
          </h4>
          <p className="text-sm text-muted-foreground">
            Robust Minus Weak - captures the profitability premium (profitable firms outperform)
          </p>
        </div>
        <div className="bg-card rounded-md p-4 border border-border">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            CMA (Investment)
          </h4>
          <p className="text-sm text-muted-foreground">
            Conservative Minus Aggressive - captures investment patterns (low-investment firms outperform)
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Why Five Factors?</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>Profitability and investment patterns are independent sources of average return</li>
          <li>The five-factor model better captures variation in average returns than the three-factor model</li>
          <li>HML becomes largely redundant when profitability and investment factors are included</li>
        </ul>
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
      theory={selectedModel === "FF3" ? ff3Theory : ff5Theory}
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
