import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Moon, Sun } from "lucide-react";

interface GlobalControlsProps {
  tickers: string[];
  onTickersChange: (tickers: string[]) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  riskFreeRate: number;
  onRiskFreeRateChange: (rate: number) => void;
  marketProxy: string;
  onMarketProxyChange: (proxy: string) => void;
}

export function GlobalControls({
  tickers,
  onTickersChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  riskFreeRate,
  onRiskFreeRateChange,
  marketProxy,
  onMarketProxyChange,
}: GlobalControlsProps) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="tickers" className="text-sm font-medium whitespace-nowrap">
            Tickers
          </Label>
          <Input
            id="tickers"
            data-testid="input-tickers"
            value={tickers.join(", ")}
            onChange={(e) => onTickersChange(e.target.value.split(",").map((t) => t.trim()))}
            placeholder="AAPL, MSFT, META"
            className="w-48 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="start-date" className="text-sm font-medium whitespace-nowrap">
            Start
          </Label>
          <Input
            id="start-date"
            data-testid="input-start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-36 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="end-date" className="text-sm font-medium whitespace-nowrap">
            End
          </Label>
          <Input
            id="end-date"
            data-testid="input-end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-36 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="rf-rate" className="text-sm font-medium whitespace-nowrap">
            Rf
          </Label>
          <Input
            id="rf-rate"
            data-testid="input-risk-free-rate"
            type="number"
            step="0.001"
            value={riskFreeRate}
            onChange={(e) => onRiskFreeRateChange(parseFloat(e.target.value))}
            className="w-20 h-8 text-sm font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="market" className="text-sm font-medium whitespace-nowrap">
            Market
          </Label>
          <Input
            id="market"
            data-testid="input-market-proxy"
            value={marketProxy}
            onChange={(e) => onMarketProxyChange(e.target.value)}
            placeholder="^GSPC"
            className="w-24 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
          className="h-8 w-8"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
