"use client";

import { useEffect } from "react";
import { auth } from "@/services/firebaseConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useAlert } from "@/contexts/alertProvider";

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

const SESSION_DURATION = ONE_DAY;

export default function SessionTimer() {
  const { addAlert } = useAlert();

  useEffect(() => {
    let lastActivity = Date.now();

    const resetSessionTimer = () => {
      lastActivity = Date.now();
      localStorage.setItem(
        "session_expires_at",
        String(lastActivity + SESSION_DURATION)
      );
    };

    const checkSessionExpiration = () => {
      const expiresAt = localStorage.getItem("session_expires_at");
      if (expiresAt && Date.now() > Number(expiresAt)) {
        signOut(auth);
        localStorage.removeItem("session_expires_at");
        addAlert("Sua sessão expirou.");
        console.log("Sessão expirada por inatividade.");
        return true;
      }
      return false;
    };

    if (checkSessionExpiration()) {
      return;
    }

    const activityEvents = ["mousemove", "keydown", "click", "scroll"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, resetSessionTimer)
    );

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        resetSessionTimer();
      } else {
        localStorage.removeItem("session_expires_at");
      }
    });

    const interval = setInterval(checkSessionExpiration, 10 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetSessionTimer)
      );
    };
  }, []);

  return null;
}
