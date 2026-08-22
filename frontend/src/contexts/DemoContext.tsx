import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface DemoContextValue {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

const DEMO_MODE_KEY = 'baticrm_demo_mode';

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  setDemoMode: () => undefined,
});

interface DemoProviderProps {
  children: ReactNode;
}

export const DemoProvider = ({ children }: DemoProviderProps) => {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem(DEMO_MODE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    localStorage.setItem(DEMO_MODE_KEY, JSON.stringify(enabled));
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, setDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
