import { useState } from "react";
import { ModuleLayout } from "@/components/module-layout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useGlobalState } from "@/contexts/global-state-context";

type UtilityType = "CRRA" | "CARA" | "DARA";

export default function UtilityExplorer() {
  const { globalState } = useGlobalState();
  // TODO: Use globalState.riskFreeRate and other params for utility calculations
  const [utilityType, setUtilityType] = useState<UtilityType>("CRRA");
  const [gamma, setGamma] = useState(2);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Utility Functions & SDF</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Utility functions describe investor preferences over wealth. The Stochastic Discount Factor (SDF)
          is derived from marginal utility and prices all assets consistently.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Risk Aversion Types</h3>
        <div className="space-y-4 text-sm">
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">CRRA (Constant Relative Risk Aversion)</p>
            <p className="font-mono text-sm mb-1">U(x) = x<sup>1-γ</sup> / (1-γ)</p>
            <p className="text-muted-foreground">Risk aversion constant as percentage of wealth</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">CARA (Constant Absolute Risk Aversion)</p>
            <p className="font-mono text-sm mb-1">U(x) = -e<sup>-γx</sup></p>
            <p className="text-muted-foreground">Risk aversion constant in absolute terms</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">DARA (Decreasing Absolute Risk Aversion)</p>
            <p className="font-mono text-sm mb-1">U(x) = ln(x)</p>
            <p className="text-muted-foreground">Risk aversion decreases with wealth</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Stochastic Discount Factor</h3>
        <p className="text-sm text-muted-foreground mb-3">
          The SDF relates to marginal utility:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm space-y-2">
          <p>m<sub>t+1</sub> = U'(c<sub>t+1</sub>) / U'(c<sub>t</sub>)</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Asset prices: p<sub>t</sub> = E[m<sub>t+1</sub> · x<sub>t+1</sub>]
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">CAPM and SDF</h3>
        <p className="text-sm text-muted-foreground mb-3">
          In the CAPM, the SDF is affine in the market return:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>m<sub>t+1</sub> = a + b · R<sub>M,t+1</sub></p>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          This linear relationship emerges from quadratic utility or normal returns with exponential utility.
        </p>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Utility Explorer" theory={theory}>
      <div className="space-y-6">
        {/* Controls */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-6">Utility Function Configuration</h2>
          
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
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="gamma" className="text-sm font-medium">
                  Risk Aversion (γ)
                </Label>
                <span className="text-sm font-mono text-muted-foreground">{gamma.toFixed(2)}</span>
              </div>
              <Slider
                id="gamma"
                data-testid="slider-gamma"
                min={0.5}
                max={10}
                step={0.1}
                value={[gamma]}
                onValueChange={(value) => setGamma(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Risk Aversion (0.5)</span>
                <span>High Risk Aversion (10)</span>
              </div>
            </div>

            <Button data-testid="button-calculate-utility">
              <Play className="h-4 w-4 mr-2" />
              Calculate Utility Functions
            </Button>
          </div>
        </Card>

        {/* Utility Function Chart */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Utility Function U(x)</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-utility">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-80 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">U(x) chart will appear here</p>
          </div>
        </Card>

        {/* Marginal Utility Chart */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Marginal Utility U'(x)</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-marginal">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-80 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">U'(x) chart will appear here</p>
          </div>
        </Card>

        {/* SDF Comparison */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">SDF Conceptual Comparison</h2>
          
          <div className="space-y-4">
            <div className="bg-background/50 rounded-md p-4 border border-border">
              <p className="text-sm font-medium mb-2">Power Utility SDF</p>
              <p className="font-mono text-sm">m<sub>t+1</sub> = (c<sub>t+1</sub> / c<sub>t</sub>)<sup>-γ</sup></p>
            </div>
            <div className="bg-background/50 rounded-md p-4 border border-border">
              <p className="text-sm font-medium mb-2">CAPM SDF (Affine in R<sub>M</sub>)</p>
              <p className="font-mono text-sm">m<sub>t+1</sub> = a + b · R<sub>M,t+1</sub></p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            The CAPM SDF is a special case that emerges under specific conditions. Power utility SDFs
            capture broader risk preferences including attitudes toward higher moments.
          </p>
        </Card>
      </div>
    </ModuleLayout>
  );
}
