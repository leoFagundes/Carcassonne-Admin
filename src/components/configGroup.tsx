"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useSiteConfig } from "@/contexts/siteConfigProvider";
import { effectsAllowed, mergeEffectsPrefs, sparkSettings } from "@/utils/generalSettings";
import ClickSpark from "./mage-ui/cursor-effects/click-spark";
import FollowCursor from "./mage-ui/cursor-effects/follow-cursor";
import CanvasCursor from "./mage-ui/cursor-effects/canvas-cursor-effect";

/** Este aparelho pediu menos movimento / é tela de toque? (atualiza se mudar) */
function useDevice() {
  const [device, setDevice] = useState({ reducedMotion: false, touch: false });
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () => setDevice({ reducedMotion: reduced.matches, touch: coarse.matches });
    update();
    reduced.addEventListener("change", update);
    coarse.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
    };
  }, []);
  return device;
}

/** Efeitos de mouse do admin (Configurações → Geral → Efeitos de mouse). */
export default function ConfigGroup({ children }: { children: ReactNode }) {
  const configs = useSiteConfig();
  const device = useDevice();
  const prefs = mergeEffectsPrefs(configs?.effectsPrefs);
  const allowed = effectsAllowed(prefs, device);

  return (
    <ClickSpark isActive={allowed && !!configs?.clickEffect} {...sparkSettings(prefs.intensity)}>
      {allowed && configs?.followCursor && <FollowCursor color="#e6c56b9d" />}
      {allowed && configs?.canvasCursor && <CanvasCursor />}

      {children}
    </ClickSpark>
  );
}
