"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FaArrowUp, FaInfoCircle, FaMusic, FaStar } from "react-icons/fa";
import Tooltip from "./Tooltip";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";

export default function ScrollUp() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMusicRecommendationEnable, setIsMusicRecommendationEnable] =
    useState(false);

  const router = useRouter();

  const handleScroll = () => {
    const scrollTop = window.scrollY;

    if (scrollTop > 100) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    async function fecthGeneralConfigs() {
      try {
        const GeneralConfigsFecthed = await GeneralConfigsRepository.get();
        if (GeneralConfigsFecthed) {
          setIsMusicRecommendationEnable(
            GeneralConfigsFecthed.isMusicRecommendationEnable
          );
        }
      } catch (error) {
        console.error(
          "Não foi possível carregar as configurações gerais.",
          error
        );
      }
    }

    fecthGeneralConfigs();
  }, []);

  return (
    <div
      className={`backdrop-blur-[2px] p-2 rounded-md gap-4 flex flex-col items-center justify-center fixed bottom-2 right-2 z-10 `}
    >
      <FaArrowUp
        onClick={scrollToTop}
        size={"20px"}
        className={`text-primary duration-300 ease-in-out ${
          isVisible ? "opacity-100 cursor-pointer" : "opacity-0"
        }`}
      />

      {isMusicRecommendationEnable && (
        <Tooltip direction="left" content="Recomende uma música">
          <FaMusic
            size={"20px"}
            className="text-primary cursor-pointer"
            onClick={() => router.push("/clientMusicRecommendation")}
          />
        </Tooltip>
      )}

      <Tooltip direction="left" content="Avalie-nos no Google">
        <FaStar
          size={"20px"}
          className="text-primary cursor-pointer"
          onClick={() =>
            window.open(
              "https://search.google.com/local/writereview?placeid=ChIJ534KOao7WpMRZ6NS_UuEtY4",
              "_blank"
            )
          }
        />
      </Tooltip>

      <Tooltip direction="left" content="Contato e regulamentos">
        <FaInfoCircle
          size={"20px"}
          className="text-primary cursor-pointer"
          onClick={() => router.push("/rulesAndRegulations")}
        />
      </Tooltip>
    </div>
  );
}
