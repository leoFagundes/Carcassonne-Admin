"use client";

import Tooltip from "@/components/Tooltip";
import { useRouter } from "next/navigation";
import React from "react";
import { LuLink, LuMusic } from "react-icons/lu";

export default function MusicRecommendationPage() {
  const router = useRouter();

  return (
    <section className="flex flex-col gap-8 w-full h-full overflow-y-scroll overflow-x-hidden outline-none px-3">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuMusic size={"48px"} className="min-w-[48px]" />
        <h2 className="sm:text-5xl text-3xl text-primary-gold text-center">
          Recomendações de Música
        </h2>

        <Tooltip direction="bottom" content="Ir para visão do cliente">
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuLink
              onClick={() => router.push("/clientMusicRecommendation")}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
      </section>
    </section>
  );
}
