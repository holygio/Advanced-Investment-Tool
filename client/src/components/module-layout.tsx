import { useState } from "react";
import { cn } from "@/lib/utils";

interface ModuleLayoutProps {
  title: string;
  children: React.ReactNode;
  theory: React.ReactNode;
}

export function ModuleLayout({ title, children, theory }: ModuleLayoutProps) {
  const [activeTab, setActiveTab] = useState<"practice" | "theory">("practice");

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border bg-card px-8 py-4">
        <h1 className="text-3xl font-semibold text-foreground mb-4">{title}</h1>
        <div className="flex gap-6">
          <button
            data-testid="tab-practice"
            onClick={() => setActiveTab("practice")}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative",
              activeTab === "practice"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Practice
          </button>
          <button
            data-testid="tab-theory"
            onClick={() => setActiveTab("theory")}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative",
              activeTab === "theory"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Theory
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        {activeTab === "practice" ? (
          <div className="max-w-7xl mx-auto space-y-8">{children}</div>
        ) : (
          <div className="max-w-4xl mx-auto prose prose-slate prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground">{theory}</div>
        )}
      </div>
    </div>
  );
}
