import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, BarChart3, LineChart, Network, Activity, TrendingUp, Building2 } from "lucide-react";

const modules = [
  { title: "Home", path: "/", icon: Home },
  { title: "Portfolio", path: "/portfolio", icon: BarChart3 },
  { title: "CAPM", path: "/capm", icon: LineChart },
  { title: "Factors", path: "/factors", icon: Network },
  { title: "Risk", path: "/performance", icon: Activity },
  { title: "Utility", path: "/utility", icon: TrendingUp },
  { title: "Fixed Income", path: "/fixed-income", icon: Building2 },
];

export function ModuleTabs() {
  const [location, setLocation] = useLocation();
  
  // Ensure we have a valid tab value
  const currentTab = modules.some(m => m.path === location) ? location : modules[0].path;

  return (
    <div className="border-b border-border bg-card">
      <div className="px-6">
        <Tabs value={currentTab} onValueChange={(path) => setLocation(path)} className="w-full">
          <TabsList className="h-12 bg-transparent border-0 justify-center gap-1">
            {modules.map((module) => (
              <TabsTrigger
                key={module.path}
                value={module.path}
                className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-b-primary rounded-none bg-transparent"
                data-testid={`tab-${module.title.toLowerCase().replace(/ /g, '-')}`}
              >
                <module.icon className="h-4 w-4" />
                {module.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
