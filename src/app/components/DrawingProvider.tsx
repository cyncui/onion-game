"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface DrawingContextValue {
  drawingDataURL: string | null;
  isDrawing: boolean;
  setDrawingDataURL: (url: string) => void;
  setIsDrawing: (v: boolean) => void;
}

const DrawingContext = createContext<DrawingContextValue | null>(null);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [drawingDataURL, setDrawingDataURL] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  return (
    <DrawingContext.Provider
      value={{ drawingDataURL, isDrawing, setDrawingDataURL, setIsDrawing }}
    >
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawingContext() {
  const ctx = useContext(DrawingContext);
  if (!ctx) {
    throw new Error("useDrawingContext must be used within DrawingProvider");
  }
  return ctx;
}
