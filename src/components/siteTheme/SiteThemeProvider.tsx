"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import type { SiteThemeId } from "@/types";
import {
  SITE_THEME_CACHE_KEY,
  normalizeReminders,
  normalizeSiteTheme,
  pendingThemeReminders,
  todayISO,
  type SiteThemeReminders,
} from "@/utils/siteThemes";
import { SiteThemeContext, SiteThemeRemindersContext } from "./siteThemeContext";
import { SiteThemeDefs } from "./ink";

const ThemeScene = dynamic(() => import("./ThemeScene"), { ssr: false });

// Tempo para as decorações do tema anterior sumirem (igual ao CSS)
const LEAVE_MS = 1000;

type MountedScene = { theme: SiteThemeId; leaving: boolean };

/**
 * Aplica em todas as páginas (site e admin) o tema escolhido em
 * Configurações → Temas: marca o <html> com data-site-theme (cores de
 * destaque via CSS) e desenha as decorações animadas. Fica escutando o banco,
 * então a troca de tema chega na hora em quem está com a página aberta.
 */
export default function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteThemeId>("default");
  const [scenes, setScenes] = useState<MountedScene[]>([]);
  const [reminders, setReminders] = useState<SiteThemeReminders>({});
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    // O último tema visto neste aparelho aparece na hora; o banco confirma
    // (ou troca) logo em seguida.
    try {
      setTheme(normalizeSiteTheme(localStorage.getItem(SITE_THEME_CACHE_KEY)));
    } catch {
      // localStorage indisponível (navegação anônima restrita): segue o banco
    }

    return GeneralConfigsRepository.subscribe((configs) => {
      if (!configs) return;
      const saved = normalizeSiteTheme(configs.siteTheme);
      setTheme(saved);
      setReminders(normalizeReminders(configs.siteThemeReminders));
      try {
        localStorage.setItem(SITE_THEME_CACHE_KEY, saved);
      } catch {
        // sem cache, sem problema
      }
    });
  }, []);

  // A data muda à meia-noite: os avisos começam e terminam sem recarregar
  useEffect(() => {
    const interval = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const remindersValue = useMemo(
    () => ({ reminders, pending: pendingThemeReminders(reminders, theme, today), today }),
    [reminders, theme, today],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.siteTheme = theme;
    return () => {
      delete root.dataset.siteTheme;
    };
  }, [theme]);

  // Troca de tema: o anterior continua montado só para sumir suavemente
  // enquanto o novo aparece.
  useEffect(() => {
    setScenes((current) => {
      const leaving = current
        .filter((scene) => scene.theme !== theme)
        .map((scene) => ({ ...scene, leaving: true }));
      return theme === "default"
        ? leaving
        : [...leaving, { theme, leaving: false }];
    });
    const timeout = setTimeout(
      () => setScenes((current) => current.filter((scene) => !scene.leaving)),
      LEAVE_MS,
    );
    return () => clearTimeout(timeout);
  }, [theme]);

  return (
    <SiteThemeContext.Provider value={theme}>
      <SiteThemeRemindersContext.Provider value={remindersValue}>
        {/* Hachuras e gradientes usados pelos desenhos de todos os temas */}
        <SiteThemeDefs />
        {children}
        {scenes.map((scene) => (
          <ThemeScene key={scene.theme} theme={scene.theme} leaving={scene.leaving} />
        ))}
      </SiteThemeRemindersContext.Provider>
    </SiteThemeContext.Provider>
  );
}
