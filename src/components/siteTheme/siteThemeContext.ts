"use client";

import { createContext, useContext } from "react";
import type { SiteThemeId, SiteThemeStyle } from "@/types";
import type { PendingThemeReminder, SiteThemeReminders, SiteThemeStyles } from "@/utils/siteThemes";

export const SiteThemeContext = createContext<SiteThemeId>("default");

/** Tema ativo no site (fora do provider, sempre "default"). */
export const useSiteTheme = () => useContext(SiteThemeContext);

export interface SiteThemeStyleValue {
  /** Versão do tema que está no ar. */
  style: SiteThemeStyle;
  /** Versão escolhida para cada tema (para a aba Temas do admin). */
  styles: SiteThemeStyles;
}

export const SiteThemeStyleContext = createContext<SiteThemeStyleValue>({
  style: "full",
  styles: {},
});

/** Versão (completa ou minimalista) do tema no ar e de cada tema. */
export const useSiteThemeStyle = () => useContext(SiteThemeStyleContext);

export interface SiteThemeRemindersValue {
  /** Avisos configurados, por tema. */
  reminders: SiteThemeReminders;
  /** Avisos que estão valendo agora: ligados, no período e com o tema fora do ar. */
  pending: PendingThemeReminder[];
  /** Data usada para os avisos ("YYYY-MM-DD"), atualizada a cada minuto. */
  today: string;
}

export const SiteThemeRemindersContext = createContext<SiteThemeRemindersValue>({
  reminders: {},
  pending: [],
  today: "",
});

/** Avisos de tema em tempo real (para o menu do admin e a aba Temas). */
export const useSiteThemeReminders = () => useContext(SiteThemeRemindersContext);
