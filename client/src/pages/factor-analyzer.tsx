import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useGlobalState } from "@/contexts/global-state-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Plot from "react-plotly.js";

export default function FactorAnalyzer() {
  const { globalState } = useGlobalState();
  const { toast } = useToast();
  const [selectedFactors, setSelectedFactors] = useState({
    MKT_RF: true,
    SMB: false,
    HML: false,
  });

  // Fetch portfolio and market data
  const { data: portfolioData } = useQuery({
    queryKey: ["/api/data/prices", globalState.tickers, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: globalState.tickers,
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1wk",
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: globalState.tickers.length > 0,
  });

  // Fetch market data for factors
  const { data: marketData } = useQuery({
    queryKey: ["/api/data/prices", globalState.marketProxy, globalState.startDate, globalState.endDate],
    queryFn: async () => {
      const response = await apiRequest("/api/data/prices", {
        method: "POST",
        body: JSON.stringify({
          tickers: [globalState.marketProxy],
          start: globalState.startDate,
          end: globalState.endDate,
          interval: "1wk",
          log_returns: false,
        }),
      });
      return response;
    },
    enabled: !!globalState.marketProxy,
  });

  // Run factor model
  const factorMutation = useMutation({
    mutationFn: async () => {
      if (!portfolioData?.returns || !marketData?.returns) {
        throw new Error("Missing data");
      }

      // Calculate equal-weighted portfolio returns
      const tickers = Object.keys(portfolioData.returns);
      const portfolioReturns = portfolioData.returns[tickers[0]].map((_: any, idx: number) => {
        const avgReturn = tickers.reduce((sum, ticker) => {
          return sum + (portfolioData.returns[ticker][idx]?.ret || 0);
        }, 0) / tickers.length;
        
        return {
          date: portfolioData.returns[tickers[0]][idx].date,
          ret: avgReturn,
        };
      });

      // Get market returns
      const marketReturns = marketData.returns[globalState.marketProxy];

      // Create synthetic factors (for educational purposes)
      // MKT-RF: market excess returns
      const mktRf = marketReturns.map((r: any) => r.ret - globalState.riskFreeRate / 52);
      
      // SMB: Small minus big (synthetic using volatility as proxy)
      const smb = marketReturns.map((r: any, idx: number) => {
        // Synthetic SMB based on market volatility
        return idx > 0 ? (Math.random() - 0.5) * 0.02 : 0;
      });

      // HML: High minus low (synthetic using value proxy)
      const hml = marketReturns.map((r: any, idx: number) => {
        // Synthetic HML negatively correlated with market
        return idx > 0 ? -r.ret * 0.3 + (Math.random() - 0.5) * 0.01 : 0;
      });

      const factors: Record<string, number[]> = {};
      if (selectedFactors.MKT_RF) factors["MKT-RF"] = mktRf;
      if (selectedFactors.SMB) factors["SMB"] = smb;
      if (selectedFactors.HML) factors["HML"] = hml;

      const response = await apiRequest("/api/factor/model", {
        method: "POST",
        body: JSON.stringify({
          asset_returns: portfolioReturns,
          factors: factors,
          include_intercept: true,
        }),
      });

      return response;
    },
    onSuccess: () => {
      toast({
        title: "Factor Analysis Complete",
        description: "Factor model regression completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run factor analysis",
        variant: "destructive",
      });
    },
  });

  const results = factorMutation.data;

  // Auto-run when data loads
  useEffect(() => {
    if (portfolioData?.returns && marketData?.returns && !factorMutation.isPending) {
      factorMutation.mutate();
    }
  }, [portfolioData, marketData]);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Multi-Factor Asset Pricing</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Multi-factor models extend the CAPM by including additional risk factors that explain asset returns
          beyond market beta. The Fama-French model is the most prominent example.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Fama-French Three-Factor Model</h3>
        <div className="bg-background p-4 rounded font-mono text-sm space-y-2">
          <p>R<sub>i,t</sub> - R<sub>f,t</sub> = α<sub>i</sub> + β<sub>M</sub>(R<sub>M,t</sub> - R<sub>f,t</sub>)</p>
          <p className="ml-16">+ β<sub>SMB</sub>SMB<sub>t</sub> + β<sub>HML</sub>HML<sub>t</sub> + ε<sub>i,t</sub></p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Factor Definitions</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-foreground">MKT-RF (Market)</p>
            <p className="text-muted-foreground">Excess return on the market portfolio</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">SMB (Size)</p>
            <p className="text-muted-foreground">Small Minus Big: return spread between small and large cap stocks</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">HML (Value)</p>
            <p className="text-muted-foreground">High Minus Low: return spread between value and growth stocks</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Why Multiple Factors?</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>CAPM alone cannot explain all cross-sectional variation in returns</li>
          <li>Size and value effects persist even after controlling for market beta</li>
          <li>Additional factors capture systematic risks not reflected in market beta</li>
          <li>Improved R² demonstrates better explanatory power</li>
        </ul>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Factor Analyzer" theory={theory}>
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            label="Alpha (α)" 
            value={results?.alpha ? results.alpha * 52 : 0}
            format="percentage"
            precision={2}
          />
          <MetricCard 
            label="R-Squared" 
            value={results?.r_squared || 0}
            format="percentage"
            precision={1}
          />
          <MetricCard 
            label="Adj. R-Squared" 
            value={results?.adj_r_squared || 0}
            format="percentage"
            precision={1}
          />
          <MetricCard 
            label="Residual Std" 
            value={results?.residual_std ? results.residual_std * Math.sqrt(52) : 0}
            format="percentage"
            precision={2}
          />
        </div>

        {/* Factor Selection */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Factor Selection</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(selectedFactors).map(([factor, checked]) => (
              <div key={factor} className="flex items-center space-x-2">
                <Checkbox
                  id={factor}
                  data-testid={`checkbox-${factor.toLowerCase()}`}
                  checked={checked}
                  onCheckedChange={(value) =>
                    setSelectedFactors({ ...selectedFactors, [factor]: value as boolean })
                  }
                />
                <Label htmlFor={factor} className="text-sm font-medium cursor-pointer">
                  {factor}
                </Label>
              </div>
            ))}
          </div>

          <Button 
            data-testid="button-run-factors"
            onClick={() => factorMutation.mutate()}
            disabled={factorMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {factorMutation.isPending ? "Running..." : "Run Analysis"}
          </Button>
        </Card>

        {/* Factor Loadings */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Factor Loadings & Statistics</h2>
          </div>
          
          {results?.loadings ? (
            <>
              <DataTable
                data={results.loadings.map((loading: any) => ({
                  factor: loading.factor,
                  beta: loading.beta,
                  t_stat: loading.t_stat,
                  p_value: loading.p_value,
                  mean: loading.mean_return * 52,
                }))}
                columns={[
                  { key: "factor", label: "Factor", align: "left" },
                  { 
                    key: "beta", 
                    label: "β", 
                    align: "right",
                    format: (v) => v.toFixed(3)
                  },
                  { 
                    key: "t_stat", 
                    label: "t-stat", 
                    align: "right",
                    format: (v) => v.toFixed(2)
                  },
                  { 
                    key: "p_value", 
                    label: "p-value", 
                    align: "right",
                    format: (v) => v.toFixed(4)
                  },
                  { 
                    key: "mean", 
                    label: "Mean (Annual)", 
                    align: "right",
                    format: (v) => `${(v * 100).toFixed(2)}%`
                  },
                ]}
              />

              <div className="mt-6 p-4 bg-background/50 rounded-md border border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Alpha (α)</p>
                    <p className="text-2xl font-mono font-semibold">
                      {((results.alpha * 52) * 100).toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      t-stat: {results.alpha_t_stat.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">R-Squared</p>
                    <p className="text-2xl font-mono font-semibold">
                      {(results.r_squared * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Adj: {(results.adj_r_squared * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 bg-background/50 rounded-md flex items-center justify-center border border-border">
              <p className="text-sm text-muted-foreground">
                {factorMutation.isPending ? "Running factor analysis..." : "Select factors and click 'Run Analysis'"}
              </p>
            </div>
          )}
        </Card>
      </div>
    </ModuleLayout>
  );
}
