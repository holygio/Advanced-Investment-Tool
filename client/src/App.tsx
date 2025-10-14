import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortfolioConfigSidebar } from "@/components/portfolio-config-sidebar";
import { ModuleLayoutWrapper } from "@/components/module-layout-wrapper";
import { GlobalStateProvider } from "@/contexts/global-state-context";
import { ModeProvider } from "@/contexts/mode-context";

// Pages
import AccessGateway from "@/pages/access-gateway";
import Landing from "@/pages/landing";
import PortfolioBuilder from "@/pages/portfolio-builder";
import CAPMTester from "@/pages/capm-tester";
import FactorAnalyzer from "@/pages/factor-analyzer";
import Performance from "@/pages/performance";
import UtilityExplorer from "@/pages/utility-explorer";
import FixedIncome from "@/pages/fixed-income";
import InformationLab from "@/pages/information-lab";
import StudyFlashcards from "@/pages/study-flashcards";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <AccessGateway />
      </Route>
      <Route path="/dashboard">
        <ModuleLayoutWrapper>
          <Landing />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/portfolio">
        <ModuleLayoutWrapper>
          <PortfolioBuilder />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/capm">
        <ModuleLayoutWrapper>
          <CAPMTester />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/factors">
        <ModuleLayoutWrapper>
          <FactorAnalyzer />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/performance">
        <ModuleLayoutWrapper>
          <Performance />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/utility">
        <ModuleLayoutWrapper>
          <UtilityExplorer />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/fixed-income">
        <ModuleLayoutWrapper>
          <FixedIncome />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/information">
        <ModuleLayoutWrapper>
          <InformationLab />
        </ModuleLayoutWrapper>
      </Route>
      <Route path="/study/flashcards">
        <ModuleLayoutWrapper>
          <StudyFlashcards />
        </ModuleLayoutWrapper>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ModeProvider>
          <GlobalStateProvider>
            <div className="flex h-screen w-full">
              <PortfolioConfigSidebar />
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </GlobalStateProvider>
          <Toaster />
        </ModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
