"use client";

import { usePDFContext } from "@/contexts/PDFPageContext";
import { useEffect, useRef, useState } from "react";

export default function PDFItemWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { registerHeight } = usePDFContext();
  const [breakBefore, setBreakBefore] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const height = ref.current.offsetHeight;
    const shouldBreak = registerHeight(height);

    if (shouldBreak) setBreakBefore(true);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        pageBreakBefore: breakBefore ? "always" : "auto",
        breakBefore: breakBefore ? "page" : "auto",
      }}
    >
      {children}
    </div>
  );
}
