"use client";

import { createContext, useContext, useRef } from "react";

const A4_HEIGHT_PX = Math.floor(297 * 3.78);
const PAGE_PADDING_PX = Math.floor(18 * 3.78) * 2;

type ContextType = {
  registerHeight: (height: number) => boolean;
};

const PDFContext = createContext<ContextType | null>(null);

export function PDFProvider({ children }: { children: React.ReactNode }) {
  const currentHeight = useRef(0);

  function registerHeight(height: number) {
    if (currentHeight.current + height > A4_HEIGHT_PX - PAGE_PADDING_PX) {
      currentHeight.current = height;
      return true;
    }

    currentHeight.current += height;
    return false;
  }

  return (
    <PDFContext.Provider value={{ registerHeight }}>
      {children}
    </PDFContext.Provider>
  );
}

export function usePDFContext() {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("PDFContext not found");
  return ctx;
}
