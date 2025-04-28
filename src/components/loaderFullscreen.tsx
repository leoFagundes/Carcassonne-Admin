"use client";

import React, { useEffect, useState } from "react";

const messages = [
  "Adicionando jogos...",
  "Verificando se a pizza já está pronta...",
  "Jogando dados...",
  "Quase pronto...",
  "Eu sou o Duque e pego 3...",
];

export default function LoaderFullscreen() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setCurrentMessageIndex(
          (prevIndex) => (prevIndex + 1) % messages.length
        );
        setFade(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 flex flex-col justify-center items-center w-full h-screen z-50 backdrop-blur-[8px] bg-primary-black/60">
      <div className="flex flex-row gap-2 mb-6">
        <div className="w-4 h-4 rounded-full bg-primary-gold animate-bounce"></div>
        <div className="w-4 h-4 rounded-full bg-primary-gold animate-bounce [animation-delay:-.3s]"></div>
        <div className="w-4 h-4 rounded-full bg-primary-gold animate-bounce [animation-delay:-.5s]"></div>
      </div>
      <p
        className={`text-primary-gold text-md italic transition-opacity duration-500 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        {messages[currentMessageIndex]}
      </p>
    </div>
  );
}
