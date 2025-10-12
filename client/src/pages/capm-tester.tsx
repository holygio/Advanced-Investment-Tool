import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
      <div>
        <h2 className="text-2xl font-semibold mb-4">Capital Asset Pricing Model (CAPM)</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          The CAPM describes the relationship between systematic risk and expected return for assets,
          particularly stocks. It is widely used for pricing risky securities and generating expected returns.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">CAPM Equation</h3>
        <div className="bg-background p-4 rounded font-mono text-sm space-y-2">
          <p>E[R<sub>i</sub>] = R<sub>f</sub> + β<sub>i</sub>(E[R<sub>M</sub>] - R<sub>f</sub>)</p>
          <p className="mt-3 text-xs text-muted-foreground">where:</p>
          <p className="text-xs">E[R<sub>i</sub>] = Expected return on asset i</p>
          <p className="text-xs">R<sub>f</sub> = Risk-free rate</p>
          <p className="text-xs">β<sub>i</sub> = Beta of asset i (systematic risk)</p>
          <p className="text-xs">E[R<sub>M</sub>] = Expected market return</p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Regression Model</h3>
        <p className="text-sm text-muted-foreground mb-3">
          We estimate CAPM parameters using OLS regression on excess returns:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>R<sub>i,t</sub> - R<sub>f,t</sub> = α<sub>i</sub> + β<sub>i</sub>(R<sub>M,t</sub> - R<sub>f,t</sub>) + ε<sub>i,t</sub></p>
          <p className="mt-3 text-xs text-muted-foreground">
            α (alpha) represents abnormal return after adjusting for market risk
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Security Market Line (SML)</h3>
        <p className="text-sm text-muted-foreground">
          The SML is the graphical representation of the CAPM, showing expected return as a function of beta.
          Securities above the SML are undervalued (positive alpha), while those below are overvalued (negative alpha).
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Key Assumptions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>All investors hold the market portfolio</li>
          <li>Returns follow a normal distribution</li>
          <li>Investors can borrow/lend at the risk-free rate</li>
          <li>No transaction costs or taxes</li>
          <li>All information is available to all investors</li>
        </ul>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="CAPM Model Tester" theory={theory}>
      <div className="space-y-6">
        {/* Controls */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Regression Analysis</h2>
            <Button data-testid="button-run-capm">
              <Play className="h-4 w-4 mr-2" />
              Run CAPM
            </Button>
          </div>
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
          
          <div className="h-96 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">SML Chart will appear here</p>
          </div>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Market Beta" value={1.15} precision={3} />
          <MetricCard label="Alpha (α)" value={0.025} format="percentage" />
          <MetricCard label="R-Squared" value={0.68} format="percentage" precision={1} />
          <MetricCard label="T-Stat (β)" value={8.45} precision={2} />
        </div>

        {/* Results Table */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">CAPM Regression Results</h2>
          <DataTable
            data={[
              { ticker: "AAPL", alpha: 0.012, beta: 1.25, t_alpha: 1.82, t_beta: 12.45, r2: 0.72 },
              { ticker: "MSFT", alpha: 0.008, beta: 1.15, t_alpha: 1.35, t_beta: 10.88, r2: 0.68 },
              { ticker: "META", alpha: -0.005, beta: 1.42, t_alpha: -0.65, t_beta: 14.22, r2: 0.75 },
              { ticker: "TSLA", alpha: 0.035, beta: 1.85, t_alpha: 2.15, t_beta: 15.33, r2: 0.62 },
              { ticker: "NVDA", alpha: 0.028, beta: 1.65, t_alpha: 2.05, t_beta: 13.75, r2: 0.70 },
            ]}
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
      </div>
    </ModuleLayout>
  );
}
