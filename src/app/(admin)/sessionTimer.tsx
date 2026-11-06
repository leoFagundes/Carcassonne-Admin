"use client";

import { useEffect } from "react";
import { auth } from "@/services/firebaseConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useAlert } from "@/contexts/alertProvider";
import { useSiteConfig } from "@/contexts/siteConfigProvider";
import { DEFAULT_SESSION_HOURS, sessionHours } from "@/utils/generalSettings";

const ONE_HOUR = 60 * 60 * 1000;

/** Padrão (1 dia) enquanto a configuração não chega. */
export const SESSION_DURATION = DEFAULT_SESSION_HOURS * ONE_HOUR;

const DURATION_KEY = "session_duration_ms";

/**
 * Tempo sem uso até o login do admin expirar (Configurações → Geral → Sessão).
 * Guardado neste aparelho para valer já no próximo login, antes do banco responder.
 */
export function sessionDuration(): number {
  try {
    const saved = Number(localStorage.getItem(DURATION_KEY));
    if (Number.isFinite(saved) && saved > 0) return saved;
  } catch {
    // sem armazenamento: padrão
  }
  return SESSION_DURATION;
}

export default function SessionTimer() {
  const { addAlert } = useAlert();
  const configs = useSiteConfig();

  // Duração salva no admin; renova o prazo atual já com o valor novo.
  useEffect(() => {
    if (!configs) return;
    try {
      const ms = sessionHours(configs.adminSessionHours) * ONE_HOUR;
      localStorage.setItem(DURATION_KEY, String(ms));
      if (localStorage.getItem("session_expires_at")) {
        localStorage.setItem("session_expires_at", String(Date.now() + ms));
      }
    } catch {
      // sem armazenamento: segue o padrão
    }
  }, [configs]);

  useEffect(() => {
    const resetSessionTimer = () => {
      localStorage.setItem("session_expires_at", String(Date.now() + sessionDuration()));
    };

    const checkSessionExpiration = () => {
      const expiresAt = localStorage.getItem("session_expires_at");
      if (expiresAt && Date.now() > Number(expiresAt)) {
        signOut(auth);
        localStorage.removeItem("session_expires_at");
        addAlert("Sua sessão expirou.");
        return true;
      }
      return false;
    };

    if (checkSessionExpiration()) {
      return;
    }

    const activityEvents = ["mousemove", "keydown", "click", "scroll"];
    activityEvents.forEach((event) => window.addEventListener(event, resetSessionTimer));

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
      activityEvents.forEach((event) => window.removeEventListener(event, resetSessionTimer));
    };
  }, []);

  return null;
}
