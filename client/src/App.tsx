import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalControls } from "@/components/global-controls";

// Pages
import PortfolioBuilder from "@/pages/portfolio-builder";
import CAPMTester from "@/pages/capm-tester";
import FactorAnalyzer from "@/pages/factor-analyzer";
import Performance from "@/pages/performance";
import UtilityExplorer from "@/pages/utility-explorer";
import FixedIncome from "@/pages/fixed-income";
import NotFound from "@/pages/not-found";

function Router({ globalState, setGlobalState }: any) {
  return (
    <div className="flex flex-col h-screen">
      <GlobalControls
        tickers={globalState.tickers}
        onTickersChange={(tickers) => setGlobalState({ ...globalState, tickers })}
        startDate={globalState.startDate}
        onStartDateChange={(date) => setGlobalState({ ...globalState, startDate: date })}
        endDate={globalState.endDate}
        onEndDateChange={(date) => setGlobalState({ ...globalState, endDate: date })}
        riskFreeRate={globalState.riskFreeRate}
        onRiskFreeRateChange={(rate) => setGlobalState({ ...globalState, riskFreeRate: rate })}
        marketProxy={globalState.marketProxy}
        onMarketProxyChange={(proxy) => setGlobalState({ ...globalState, marketProxy: proxy })}
      />
      <Switch>
        <Route path="/" component={PortfolioBuilder} />
        <Route path="/capm" component={CAPMTester} />
        <Route path="/factors" component={FactorAnalyzer} />
        <Route path="/performance" component={Performance} />
        <Route path="/utility" component={UtilityExplorer} />
        <Route path="/fixed-income" component={FixedIncome} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  // Global state for all modules
  const [globalState, setGlobalState] = useState({
    tickers: ["AAPL", "MSFT", "META", "TSLA", "NVDA", "^GSPC"],
    startDate: "2018-01-01",
    endDate: new Date().toISOString().split("T")[0],
    riskFreeRate: 0.02,
    marketProxy: "^GSPC",
  });

  // Custom sidebar width
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <Router globalState={globalState} setGlobalState={setGlobalState} />
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
