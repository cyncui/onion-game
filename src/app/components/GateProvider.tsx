"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type GateAnswer = "yes" | "no" | null;

interface GateContextValue {
  gateAnswer: GateAnswer;
  setGateAnswer: (answer: GateAnswer) => void;
}

const GateContext = createContext<GateContextValue | null>(null);

export function GateProvider({ children }: { children: ReactNode }) {
  const [gateAnswer, setGateAnswer] = useState<GateAnswer>(null);

  return (
    <GateContext.Provider value={{ gateAnswer, setGateAnswer }}>
      {children}
    </GateContext.Provider>
  );
}

export function useGateContext() {
  const ctx = useContext(GateContext);
  if (!ctx) {
    throw new Error("useGateContext must be used within GateProvider");
  }
  return ctx;
}
