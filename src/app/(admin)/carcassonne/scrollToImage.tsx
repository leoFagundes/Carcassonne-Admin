"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ScrollMural({
  muralRef,
}: {
  muralRef: React.RefObject<HTMLDivElement | null>;
}) {
  const searchParams = useSearchParams();
  const createimage = searchParams.get("createimage");

  useEffect(() => {
    if (createimage === "true") {
      muralRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [createimage]);

  return null;
}
