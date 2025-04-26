"use client";

import React, { useState, useEffect } from "react";
import { FaArrowUp } from "react-icons/fa";

export default function ScrollUp() {
  const [isVisible, setIsVisible] = useState(false);

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
      className={`duration-300 ease-in-out backdrop-blur-[2px] p-2 rounded-md flex flex-col items-center justify-center ${
        isVisible ? "opacity-100 hover:cursor-pointer" : "opacity-0"
      } fixed bottom-2 right-2 z-10 `}
      onClick={scrollToTop}
    >
      <FaArrowUp size={"20px"} className="text-primary" />
      <p className="sm:block hidden text-xs font-semibold text-primary">
        Ir ao topo
      </p>
    </div>
  );
}
