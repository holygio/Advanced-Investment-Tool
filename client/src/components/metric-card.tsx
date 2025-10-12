import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  format?: "number" | "percentage" | "currency";
  precision?: number;
}

export function MetricCard({ label, value, trend, format = "number", precision = 2 }: MetricCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === "string") return val;
    
    switch (format) {
      case "percentage":
        return `${(val * 100).toFixed(precision)}%`;
      case "currency":
        return `$${val.toFixed(precision)}`;
      default:
        return val.toFixed(precision);
    }
  };

  const trendColor = trend && trend > 0 ? "text-success" : trend && trend < 0 ? "text-destructive" : "";

  return (
    <Card className="p-6 bg-card border-card-border">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-mono font-semibold text-foreground tabular-nums">
            {formatValue(value)}
          </p>
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              {trend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span className="font-mono">{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
