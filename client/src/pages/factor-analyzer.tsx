import { useState } from "react";
import { ModuleLayout } from "@/components/module-layout";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Play, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useGlobalState } from "@/contexts/global-state-context";

export default function FactorAnalyzer() {
  const { globalState } = useGlobalState();
  // TODO: Use globalState for API calls when implementing factor analysis
  const [selectedFactors, setSelectedFactors] = useState({
    MKT_RF: true,
    SMB: true,
    HML: true,
    MOM: false,
    RMW: false,
    CMA: false,
    TERM: false,
    CREDIT: false,
  });

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
          <div>
            <p className="font-semibold text-foreground">MOM (Momentum)</p>
            <p className="text-muted-foreground">Winners Minus Losers: return spread based on past performance</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">RMW (Profitability)</p>
            <p className="text-muted-foreground">Robust Minus Weak: return spread based on operating profitability</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">CMA (Investment)</p>
            <p className="text-muted-foreground">Conservative Minus Aggressive: return spread based on investment patterns</p>
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
        {/* Factor Selection */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">Factor Selection</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

          <div className="flex gap-3">
            <Button data-testid="button-run-factors">
              <Play className="h-4 w-4 mr-2" />
              Run Analysis
            </Button>
            <Button variant="outline" data-testid="button-upload-factors">
              <Upload className="h-4 w-4 mr-2" />
              Upload Factor Data (CSV)
            </Button>
          </div>
        </Card>

        {/* Correlation Heatmap */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Factor Correlation Matrix</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-heatmap">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-96 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">Correlation heatmap will appear here</p>
          </div>
        </Card>

        {/* Factor Loadings */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">Factor Loadings & Statistics</h2>
          <DataTable
            data={[
              { factor: "MKT-RF", beta: 1.15, t_stat: 12.45, mean: 0.065 },
              { factor: "SMB", beta: 0.35, t_stat: 3.82, mean: 0.028 },
              { factor: "HML", beta: -0.22, t_stat: -2.15, mean: 0.018 },
            ]}
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
                key: "mean", 
                label: "Mean Return", 
                align: "right",
                format: (v) => `${(v * 100).toFixed(2)}%`
              },
            ]}
          />

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-background/50 rounded-md p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">Alpha (α)</p>
              <p className="text-2xl font-mono font-semibold">0.82%</p>
            </div>
            <div className="bg-background/50 rounded-md p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-1">R-Squared</p>
              <p className="text-2xl font-mono font-semibold">78.5%</p>
            </div>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}
