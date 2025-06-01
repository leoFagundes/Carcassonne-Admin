"use client";

import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth } from "@/services/firebaseConfig";
import { useRouter } from "next/navigation";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { useAlert } from "@/contexts/alertProvider";

export default function AuthStateRequired() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { addAlert } = useAlert();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        setLoading(false);
      } else {
        addAlert("Você precisa estar logado para acessar esta página.");
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  return <div>{loading && <LoaderFullscreen />}</div>;
}
