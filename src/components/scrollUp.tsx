"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FaArrowUp, FaInfoCircle, FaStar } from "react-icons/fa";

export default function ScrollUp() {
  const [isVisible, setIsVisible] = useState(false);

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
      <FaInfoCircle
        size={"20px"}
        className="text-primary cursor-pointer"
        onClick={() => router.push("/rulesAndRegulations")}
      />
    </div>
  );
}
