import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Home,
  BarChart3,
  LineChart,
  Network,
  Activity,
  TrendingUp,
  Building2,
} from "lucide-react";

const modules = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    description: "Welcome & Get Started",
  },
  {
    title: "Portfolio Builder",
    url: "/portfolio",
    icon: BarChart3,
    description: "Mean-Variance Optimization & CML",
  },
  {
    title: "Model Tester",
    url: "/capm",
    icon: LineChart,
    description: "CAPM & SML Analysis",
  },
  {
    title: "Factor Analyzer",
    url: "/factors",
    icon: Network,
    description: "Multi-Factor Models",
  },
  {
    title: "Risk & Performance",
    url: "/performance",
    icon: Activity,
    description: "Metrics & Higher Moments",
  },
  {
    title: "Utility Explorer",
    url: "/utility",
    icon: TrendingUp,
    description: "Utility Functions & SDF",
  },
  {
    title: "Fixed Income",
    url: "/fixed-income",
    icon: Building2,
    description: "Yield Curves & Spreads",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider px-4 mb-2 text-muted-foreground">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((module) => (
                <SidebarMenuItem key={module.url}>
                  <SidebarMenuButton
                    asChild
                    data-testid={`link-${module.title.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    className={
                      location === module.url
                        ? "border-l-4 border-l-primary bg-sidebar-accent"
                        : "border-l-4 border-l-transparent"
                    }
                  >
                    <Link href={module.url} className="flex items-center gap-3 px-4 py-2.5">
                      <module.icon className="h-5 w-5" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{module.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {module.description}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
