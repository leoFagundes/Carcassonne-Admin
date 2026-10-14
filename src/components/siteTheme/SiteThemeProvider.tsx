"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import type { SiteThemeId, SiteThemeStyle } from "@/types";
import {
  SITE_THEME_CACHE_KEY,
  SITE_THEME_STYLE_CACHE_KEY,
  normalizeReminders,
  normalizeSiteTheme,
  normalizeThemeStyle,
  normalizeThemeStyles,
  pendingThemeReminders,
  todayISO,
  type SiteThemeReminders,
  type SiteThemeStyles,
} from "@/utils/siteThemes";
import {
  SiteThemeContext,
  SiteThemeRemindersContext,
  SiteThemeStyleContext,
} from "./siteThemeContext";
import { SiteThemeDefs } from "./ink";

const ThemeScene = dynamic(() => import("./ThemeScene"), { ssr: false });

// Tempo para as decorações do tema anterior sumirem (igual ao CSS)
const LEAVE_MS = 1000;

type MountedScene = { theme: SiteThemeId; style: SiteThemeStyle; leaving: boolean };

/**
 * Aplica em todas as páginas (site e admin) o tema escolhido em
 * Configurações → Temas: marca o <html> com data-site-theme (cores de
 * destaque via CSS) e data-site-theme-style (versão completa ou
 * minimalista) e desenha as decorações animadas. Fica escutando o banco,
 * então a troca de tema chega na hora em quem está com a página aberta.
 */
export default function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteThemeId>("default");
  // Versão do tema no ar vinda do cache, até o banco responder
  const [cachedStyle, setCachedStyle] = useState<SiteThemeStyle>("full");
  const [styles, setStyles] = useState<SiteThemeStyles | null>(null);
  const [scenes, setScenes] = useState<MountedScene[]>([]);
  const [reminders, setReminders] = useState<SiteThemeReminders>({});
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    // O último tema visto neste aparelho aparece na hora; o banco confirma
    // (ou troca) logo em seguida.
    try {
      setTheme(normalizeSiteTheme(localStorage.getItem(SITE_THEME_CACHE_KEY)));
      setCachedStyle(normalizeThemeStyle(localStorage.getItem(SITE_THEME_STYLE_CACHE_KEY)));
    } catch {
      // localStorage indisponível (navegação anônima restrita): segue o banco
    }

    return GeneralConfigsRepository.subscribe((configs) => {
      if (!configs) return;
      const saved = normalizeSiteTheme(configs.siteTheme);
      const savedStyles = normalizeThemeStyles(configs.siteThemeStyles);
      setTheme(saved);
      setStyles(savedStyles);
      setReminders(normalizeReminders(configs.siteThemeReminders));
      try {
        localStorage.setItem(SITE_THEME_CACHE_KEY, saved);
        localStorage.setItem(SITE_THEME_STYLE_CACHE_KEY, savedStyles[saved] ?? "full");
      } catch {
        // sem cache, sem problema
      }
    });
  }, []);

  const style: SiteThemeStyle = styles ? (styles[theme] ?? "full") : cachedStyle;

  // A data muda à meia-noite: os avisos começam e terminam sem recarregar
  useEffect(() => {
    const interval = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const remindersValue = useMemo(
    () => ({ reminders, pending: pendingThemeReminders(reminders, theme, today), today }),
    [reminders, theme, today],
  );

  const styleValue = useMemo(() => ({ style, styles: styles ?? {} }), [style, styles]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.siteTheme = theme;
    root.dataset.siteThemeStyle = style;
    return () => {
      delete root.dataset.siteTheme;
      delete root.dataset.siteThemeStyle;
    };
  }, [theme, style]);

  // Troca de tema (ou de versão): o anterior continua montado só para sumir
  // suavemente enquanto o novo aparece.
  useEffect(() => {
    setScenes((current) => {
      const leaving = current
        .filter((scene) => scene.theme !== theme || scene.style !== style)
        .map((scene) => ({ ...scene, leaving: true }));
      return theme === "default"
        ? leaving
        : [...leaving, { theme, style, leaving: false }];
    });
    const timeout = setTimeout(
      () => setScenes((current) => current.filter((scene) => !scene.leaving)),
      LEAVE_MS,
    );
    return () => clearTimeout(timeout);
  }, [theme, style]);

  return (
    <SiteThemeContext.Provider value={theme}>
      <SiteThemeStyleContext.Provider value={styleValue}>
        <SiteThemeRemindersContext.Provider value={remindersValue}>
          {/* Hachuras e gradientes usados pelos desenhos de todos os temas */}
          <SiteThemeDefs />
          {children}
          {scenes.map((scene) => (
            <ThemeScene
              key={`${scene.theme}:${scene.style}`}
              theme={scene.theme}
              minimal={scene.style === "minimal"}
              leaving={scene.leaving}
            />
          ))}
        </SiteThemeRemindersContext.Provider>
      </SiteThemeStyleContext.Provider>
    </SiteThemeContext.Provider>
  );
}
