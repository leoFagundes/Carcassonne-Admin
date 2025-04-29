"use client";

import React, { useState, useEffect } from "react";
import { FaArrowUp, FaInfoCircle } from "react-icons/fa";

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
      className={`duration-300 ease-in-out backdrop-blur-[2px] p-2 rounded-md gap-4 flex flex-col items-center justify-center ${
        isVisible ? "opacity-100 hover:cursor-pointer" : "opacity-0"
      } fixed bottom-2 right-2 z-10 `}
    >
      <FaArrowUp onClick={scrollToTop} size={"20px"} className="text-primary" />
      <FaInfoCircle size={"20px"} className="text-primary" />
    </div>
  );
}
