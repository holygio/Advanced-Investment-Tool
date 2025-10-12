import { ReactNode } from "react";
import { ModuleTabs } from "./module-tabs";

interface ModuleLayoutWrapperProps {
  children: ReactNode;
  showTabs?: boolean;
}

export function ModuleLayoutWrapper({ children, showTabs = true }: ModuleLayoutWrapperProps) {
  return (
    <div className="flex flex-col h-full">
      {showTabs && <ModuleTabs />}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
