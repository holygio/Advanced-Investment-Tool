import { createContext, useContext, useState, ReactNode } from "react";

interface GlobalState {
  tickers: string[];
  startDate: string;
  endDate: string;
  riskFreeRate: number;
  marketProxy: string;
  lookbackYears: number;
  allowShortSelling: boolean;
  maxWeight: number;
}

interface GlobalStateContextType {
  globalState: GlobalState;
  setGlobalState: (state: GlobalState) => void;
  updateGlobalState: (updates: Partial<GlobalState>) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [globalState, setGlobalState] = useState<GlobalState>({
    tickers: ["SPY", "TLT", "GLD", "VNQ", "EEM", "QQQ", "IWM", "EFA", "AGG", "DBC"],  // Diversified portfolio: US stocks, tech, small-cap, bonds, gold, real estate, emerging markets, international, commodities
    startDate: "2018-01-01",
    endDate: new Date().toISOString().split("T")[0],
    riskFreeRate: 0.025,
    marketProxy: "^GSPC",
    lookbackYears: 5,
    allowShortSelling: false,
    maxWeight: 0.5,
  });

  const updateGlobalState = (updates: Partial<GlobalState>) => {
    setGlobalState(prev => ({ ...prev, ...updates }));
  };

  return (
    <GlobalStateContext.Provider value={{ globalState, setGlobalState, updateGlobalState }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within GlobalStateProvider");
  }
  return context;
}
