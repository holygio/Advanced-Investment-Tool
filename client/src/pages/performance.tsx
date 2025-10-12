import { useState } from "react";
import { ModuleLayout } from "@/components/module-layout";
import { MetricCard } from "@/components/metric-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Play } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Performance() {
  const [tau, setTau] = useState(0);
  const [n, setN] = useState(2);

  const theory = (
    <div className="space-y-6 py-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Risk & Performance Metrics</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Performance evaluation requires metrics that account for both return and risk. Different measures
          capture different aspects of portfolio performance and risk exposure.
        </p>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Risk-Adjusted Performance</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Sharpe Ratio</p>
            <p className="font-mono text-sm">SR = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>p</sub></p>
            <p className="text-muted-foreground mt-1">Reward per unit of total risk</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Treynor Ratio</p>
            <p className="font-mono text-sm">TR = (R<sub>p</sub> - R<sub>f</sub>) / β<sub>p</sub></p>
            <p className="text-muted-foreground mt-1">Reward per unit of systematic risk</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Information Ratio</p>
            <p className="font-mono text-sm">IR = (R<sub>p</sub> - R<sub>b</sub>) / σ<sub>tracking</sub></p>
            <p className="text-muted-foreground mt-1">Active return per unit of active risk</p>
          </div>
          <div className="bg-background p-3 rounded">
            <p className="font-semibold mb-1">Jensen's Alpha</p>
            <p className="font-mono text-sm">α = R<sub>p</sub> - [R<sub>f</sub> + β(R<sub>m</sub> - R<sub>f</sub>)]</p>
            <p className="text-muted-foreground mt-1">Excess return above CAPM prediction</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Higher Moments</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Skewness:</span> Measures asymmetry of return distribution.
            Negative skew indicates more extreme losses than gains.
          </p>
          <p>
            <span className="font-semibold text-foreground">Kurtosis:</span> Measures tail risk. High kurtosis indicates
            fat tails and higher probability of extreme events.
          </p>
          <p>
            <span className="font-semibold text-foreground">Jarque-Bera:</span> Tests for normality. High values reject
            the hypothesis of normal distribution.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-md p-4 border border-border">
        <h3 className="text-lg font-semibold mb-3">Lower Partial Moments (LPM)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          LPM measures downside risk relative to a target return τ:
        </p>
        <div className="bg-background p-4 rounded font-mono text-sm">
          <p>LPM<sub>n</sub>(τ) = (1/T) Σ [min(r<sub>t</sub> - τ, 0)]<sup>n</sup></p>
          <p className="text-xs text-muted-foreground mt-2">
            n = 2, τ = 0 gives semivariance (downside volatility)
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ModuleLayout title="Risk & Performance" theory={theory}>
      <div className="space-y-6">
        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Sharpe Ratio" value={1.245} precision={3} />
          <MetricCard label="Treynor Ratio" value={0.085} precision={3} />
          <MetricCard label="Information Ratio" value={0.652} precision={3} />
          <MetricCard label="Jensen's Alpha" value={0.028} format="percentage" />
        </div>

        {/* Higher Moments */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-4">Distribution Characteristics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Skewness</p>
              <p className="text-3xl font-mono font-semibold tabular-nums">-0.342</p>
              <p className="text-xs text-muted-foreground">Negative (left skewed)</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Excess Kurtosis</p>
              <p className="text-3xl font-mono font-semibold tabular-nums">2.156</p>
              <p className="text-xs text-muted-foreground">Leptokurtic (fat tails)</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Jarque-Bera</p>
              <p className="text-3xl font-mono font-semibold tabular-nums">45.23</p>
              <p className="text-xs text-muted-foreground">p-value: 0.001</p>
            </div>
          </div>
        </Card>

        {/* Distribution Chart */}
        <Card className="p-6 bg-card border-card-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Return Distribution</h2>
            <Button variant="ghost" size="sm" data-testid="button-export-distribution">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="h-80 bg-background/50 rounded-md flex items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground">Distribution histogram will appear here</p>
          </div>
        </Card>

        {/* LPM Analysis */}
        <Card className="p-6 bg-card border-card-border">
          <h2 className="text-xl font-semibold mb-6">Lower Partial Moments (Downside Risk)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label htmlFor="tau">Target Return (τ)</Label>
              <Input
                id="tau"
                data-testid="input-tau"
                type="number"
                step="0.001"
                value={tau}
                onChange={(e) => setTau(parseFloat(e.target.value))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Threshold below which returns are considered unfavorable
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="n">Order (n)</Label>
              <Input
                id="n"
                data-testid="input-n"
                type="number"
                step="1"
                min="1"
                max="4"
                value={n}
                onChange={(e) => setN(parseInt(e.target.value))}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                n=2 for semivariance (most common)
              </p>
            </div>
          </div>

          <Button data-testid="button-calculate-lpm">
            <Play className="h-4 w-4 mr-2" />
            Calculate LPM
          </Button>

          <div className="mt-6 p-4 bg-background/50 rounded-md border border-border">
            <p className="text-sm text-muted-foreground mb-1">
              LPM<sub>{n}</sub>({(tau * 100).toFixed(1)}%)
            </p>
            <p className="text-3xl font-mono font-semibold">0.0145</p>
          </div>
        </Card>
      </div>
    </ModuleLayout>
  );
}
