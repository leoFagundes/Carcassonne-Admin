"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import type { GeneralConfigsType, PubInfo } from "@/types";
import { mergePubInfo } from "@/utils/generalSettings";
import { siteLogo, type SiteLogo } from "@/utils/siteLogo";

/**
 * Configurações gerais ao vivo para qualquer página (site e admin): aviso no
 * topo, áreas desligadas, informações do pub, selo "Aberto agora", sessão e
 * efeitos. Uma assinatura só, no layout raiz.
 */
const SiteConfigContext = createContext<GeneralConfigsType | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useState<GeneralConfigsType | null>(null);
  useEffect(() => GeneralConfigsRepository.subscribe(setConfigs), []);
  return <SiteConfigContext.Provider value={configs}>{children}</SiteConfigContext.Provider>;
}

/** Configurações gerais (null enquanto carrega). */
export function useSiteConfig(): GeneralConfigsType | null {
  return useContext(SiteConfigContext);
}

/** Logo padrão (Configurações → Geral → Logo); a atual enquanto carrega. */
export function useSiteLogo(): SiteLogo {
  const configs = useSiteConfig();
  return siteLogo(configs?.siteLogo);
}

/** Endereço, contatos e horário — com os valores padrão enquanto carrega. */
export function usePubInfo(): PubInfo {
  const configs = useSiteConfig();
  return useMemo(() => mergePubInfo(configs?.pubInfo), [configs?.pubInfo]);
}
