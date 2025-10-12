import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PortfolioConfigSidebar } from "@/components/portfolio-config-sidebar";
import { GlobalStateProvider } from "@/contexts/global-state-context";

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
  return (
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
              <PortfolioConfigSidebar />
              <AppSidebar />
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </SidebarProvider>
        </GlobalStateProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
