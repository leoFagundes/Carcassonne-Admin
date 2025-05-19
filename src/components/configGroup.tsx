"use client";

import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import React, { ReactNode, useEffect, useState } from "react";
import ClickSpark from "./mage-ui/cursor-effects/click-spark";
import FollowCursor from "./mage-ui/cursor-effects/follow-cursor";
import CanvasCursor from "./mage-ui/cursor-effects/canvas-cursor-effect";

export default function ConfigGroup({ children }: { children: ReactNode }) {
  const [isClickSparkActive, setIsClickSparkActive] = useState(false);
  const [isFollowCursorActive, setIsFollowCursorActive] = useState(false);
  const [isCanvasCursorActive, setIsCanvasCursorActive] = useState(false);

  useEffect(() => {
    const fetchGeneralConfigs = async () => {
      try {
        const generalConfigs = await GeneralConfigsRepository.get();

        if (!generalConfigs || !generalConfigs._id) {
          console.error("ID Inválido.");
          return;
        }

        setIsClickSparkActive(generalConfigs.clickEffect);
        setIsFollowCursorActive(generalConfigs.followCursor);
        setIsCanvasCursorActive(generalConfigs.canvasCursor);
      } catch (error) {
        console.error(`Erro ao alterar configurações: ${error}`);
      }
    };

    fetchGeneralConfigs();
  }, [isClickSparkActive]);

  return (
    <ClickSpark isActive={isClickSparkActive}>
      {isFollowCursorActive && <FollowCursor color="#e6c56b9d" />}
      {isCanvasCursorActive && <CanvasCursor />}

      {children}
    </ClickSpark>
  );
}
