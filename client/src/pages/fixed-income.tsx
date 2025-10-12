import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function FixedIncome() {
  const [useFRED, setUseFRED] = useState(false);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Fixed Income & Derivatives</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Asset pricing models extend beyond stocks to bonds and derivatives. Interest rate risk and credit
          risk are the primary drivers of fixed income returns.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Bond Risk Factors</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-foreground">Interest Rate Risk</p>
            <p className="text-muted-foreground">
              Change in bond prices due to yield curve shifts. Measured by duration and convexity.
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Default Risk</p>
            <p className="text-muted-foreground">
              Risk that issuer fails to make promised payments. Reflected in credit spreads.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Term Structure</h3>
        <p className="text-sm text-muted-foreground mb-3">
          The yield curve shows relationship between yields and maturities:
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Normal:</span> Upward sloping (long rates {'>'} short rates)
          </p>
          <p>
            <span className="font-semibold text-foreground">Inverted:</span> Downward sloping (recession signal)
          </p>
          <p>
            <span className="font-semibold text-foreground">Flat:</span> Little difference across maturities
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Credit Spreads</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Credit spread = Yield on risky bond - Yield on Treasury
        </p>
        <p className="text-sm text-muted-foreground">
          We proxy credit spreads using ETF spreads:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mt-2">
          <li>Investment Grade: LQD - TLT</li>
          <li>High Yield: HYG - IEF</li>
        </ul>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Five-Factor SDF</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Extending factors to bonds and stocks:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>R<sub>i</sub> - R<sub>f</sub> = α + β<sub>MKT</sub>MKT + β<sub>SMB</sub>SMB + β<sub>HML</sub>HML</p>
          <p className="ml-16">+ β<sub>TERM</sub>TERM + β<sub>CREDIT</sub>CREDIT + ε</p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Risk-Neutral Pricing</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Binomial model: find risk-neutral probabilities p such that:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>E<sup>Q</sup>[R] = r<sub>f</sub></p>
          <p className="mt-2">p = (e<sup>r</sup> - d) / (u - d)</p>
        </div>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Fixed Income & Derivatives" theory={theory}>
      <div className="space-y-6">
        {/* Controls */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Data Source</h2>
            <div className="flex items-center gap-3">
              <Label htmlFor="use-fred" className="text-sm">
                Use FRED API
              </Label>
              <Switch
                id="use-fred"
                data-testid="switch-use-fred"
                checked={useFRED}
                onCheckedChange={setUseFRED}
              />
            </div>
          </div>
          <Button data-testid="button-fetch-data">
            <Play className="h-4 w-4 mr-2" />
            Fetch Data
          </Button>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="10Y-3M Spread" value={0.0185} format="percentage" />
          <MetricCard label="Credit Spread (IG)" value={0.0125} format="percentage" />
          <MetricCard label="Credit Spread (HY)" value={0.0485} format="percentage" />
        </div>

        {/* Yield Curve */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Yield Curve</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-yield-curve">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-80 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">Yield curve will appear here</p>
          </div>
        </Card>

        {/* Yield Curve Data */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">Current Yields</h2>
          <DataTable
            data={[
              { tenor: "3M", yield: 0.0525 },
              { tenor: "6M", yield: 0.0512 },
              { tenor: "1Y", yield: 0.0485 },
              { tenor: "2Y", yield: 0.0458 },
              { tenor: "5Y", yield: 0.0425 },
              { tenor: "10Y", yield: 0.0410 },
              { tenor: "30Y", yield: 0.0435 },
            ]}
            columns={[
              { key: "tenor", label: "Tenor", align: "left" },
              { 
                key: "yield", 
                label: "Yield", 
                align: "right",
                format: (v) => `${(v * 100).toFixed(2)}%`
              },
            ]}
          />
        </Card>

        {/* Credit Spread Time Series */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Credit Spread History</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-credit-spread">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-80 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">Credit spread time series will appear here</p>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}
