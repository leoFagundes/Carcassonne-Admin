"use client";

import "./siteTheme.css";
import type { SiteThemeId } from "@/types";
import { THEME_THUMBNAILS } from "./kitLoaders";

/** Miniatura de cada tema (só animações de CSS), para os cards do admin. */
export default function ThemeThumbnail({ theme }: { theme: SiteThemeId }) {
  if (theme === "default") {
    return (
      <div
        className="st-thumb flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(230,197,107,0.18), transparent 60%), linear-gradient(135deg, #0a0a0a, #1a1a1a, #121111)",
        }}
      >
        <img
          src="/images/logo-gold-2.png"
          alt=""
          className="h-16 w-16 object-contain drop-shadow-[0_0_12px_rgba(230,197,107,0.35)]"
        />
      </div>
    );
  }
  const Thumbnail = THEME_THUMBNAILS[theme];
  return <Thumbnail />;
}
