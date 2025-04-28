"use client";

import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth } from "@/services/firebaseConfig";
import { useRouter } from "next/navigation";
import LoaderFullscreen from "@/components/loaderFullscreen";

export default function VerifyAuthState() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        setLoading(false);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <div>{loading && <LoaderFullscreen />}</div>;
}
