import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GlobalControls } from "@/components/global-controls";
import { GlobalStateProvider, useGlobalState } from "@/contexts/global-state-context";

// Pages
import Landing from "@/pages/landing";
import PortfolioBuilder from "@/pages/portfolio-builder";
import CAPMTester from "@/pages/capm-tester";
import FactorAnalyzer from "@/pages/factor-analyzer";
import Performance from "@/pages/performance";
import UtilityExplorer from "@/pages/utility-explorer";
import FixedIncome from "@/pages/fixed-income";
import NotFound from "@/pages/not-found";

function Router() {
  const { globalState, updateGlobalState } = useGlobalState();
  
  return (
    <div className="flex flex-col h-screen">
      <GlobalControls
        tickers={globalState.tickers}
        onTickersChange={(tickers) => updateGlobalState({ tickers })}
        startDate={globalState.startDate}
        onStartDateChange={(date) => updateGlobalState({ startDate: date })}
        endDate={globalState.endDate}
        onEndDateChange={(date) => updateGlobalState({ endDate: date })}
        riskFreeRate={globalState.riskFreeRate}
        onRiskFreeRateChange={(rate) => updateGlobalState({ riskFreeRate: rate })}
        marketProxy={globalState.marketProxy}
        onMarketProxyChange={(proxy) => updateGlobalState({ marketProxy: proxy })}
      />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/portfolio" component={PortfolioBuilder} />
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
  // Custom sidebar width
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalStateProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <Router />
            </div>
          </SidebarProvider>
        </GlobalStateProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
