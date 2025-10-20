import { useGlobalState } from "@/contexts/global-state-context";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Play, Info, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { useLocation } from "wouter";

export function PortfolioConfigSidebar() {
  const { globalState, updateGlobalState } = useGlobalState();
  const [tickerText, setTickerText] = useState(globalState.tickers.join("\n"));
  const [location, setLocation] = useLocation();

  const handleTickerChange = (text: string) => {
    setTickerText(text);
    // Parse tickers from text (supports both newline and comma-separated)
    const tickers = text
      .split(/[\n,]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
    updateGlobalState({ tickers });
  };

  const handleLookbackYearsChange = (years: number[]) => {
    const lookbackYears = years[0];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - lookbackYears);
    
    updateGlobalState({
      lookbackYears,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });
  };

  const handleRiskFreeRateChange = (value: string) => {
    const rate = parseFloat(value);
    if (!isNaN(rate)) {
      updateGlobalState({ riskFreeRate: rate / 100 });
    }
  };

  const handleMaxWeightChange = (value: number[]) => {
    updateGlobalState({ maxWeight: value[0] / 100 });
  };

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col h-screen">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold">Portfolio Configuration</h2>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Static Dataset Info */}
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100 text-sm font-semibold">
            Static Dataset (2015-2025)
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs space-y-1">
            <p>Using 10 years of historical data for 10 pre-selected ETFs.</p>
            <p className="font-semibold mt-2">Available tickers:</p>
            <p className="font-mono">SPY, QQQ, IWM, XLF, TLT, HYG, GLD, SLV, UUP, VIXY</p>
            <p className="italic mt-2">No API costs - instant data loading!</p>
          </AlertDescription>
        </Alert>

        {/* Investment Universe */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Investment Universe</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Select from available tickers above (one per line or comma-separated)</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            value={tickerText}
            onChange={(e) => handleTickerChange(e.target.value)}
            placeholder="SPY&#10;QQQ&#10;TLT&#10;GLD"
            className="font-mono text-sm min-h-[120px]"
            data-testid="input-tickers"
          />
          <p className="text-xs text-muted-foreground">
            {globalState.tickers.length} ticker{globalState.tickers.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Data Parameters */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Data Parameters</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Historical data period (years)</Label>
              <span className="text-sm font-medium" data-testid="text-lookback-years">
                {globalState.lookbackYears}
              </span>
            </div>
            <Slider
              value={[globalState.lookbackYears]}
              onValueChange={handleLookbackYearsChange}
              min={1}
              max={10}
              step={1}
              className="w-full"
              data-testid="slider-lookback-years"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="risk-free-rate" className="text-sm">
                Risk-free rate (annual %)
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Typically 3-month T-bill rate (2-3% in normal conditions)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="risk-free-rate"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={(globalState.riskFreeRate * 100).toFixed(1)}
                onChange={(e) => handleRiskFreeRateChange(e.target.value)}
                className="flex-1"
                data-testid="input-risk-free-rate"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </Card>

        {/* Portfolio Constraints */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Portfolio Constraints</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-short" className="text-sm cursor-pointer">
              Allow short selling
            </Label>
            <Checkbox
              id="allow-short"
              checked={globalState.allowShortSelling}
              onCheckedChange={(checked) => 
                updateGlobalState({ allowShortSelling: checked as boolean })
              }
              data-testid="checkbox-allow-short"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-weight-input" className="text-sm">Maximum weight per asset</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Maximum allocation to any single asset (5-100%)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="max-weight-input"
                type="number"
                step="5"
                min="5"
                max="100"
                value={(globalState.maxWeight * 100).toFixed(0)}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 5 && value <= 100) {
                    updateGlobalState({ maxWeight: value / 100 });
                  }
                }}
                className="flex-1"
                data-testid="input-max-weight"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Slider
              value={[globalState.maxWeight * 100]}
              onValueChange={handleMaxWeightChange}
              min={5}
              max={100}
              step={5}
              className="w-full"
              data-testid="slider-max-weight"
            />
          </div>
        </Card>
      </div>

      <div className="p-6 border-t border-border">
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={() => setLocation("/portfolio")}
          data-testid="button-load-optimize"
        >
          <Play className="h-4 w-4" />
          Load Data & Optimize Portfolio
        </Button>
      </div>
    </div>
  );
}
