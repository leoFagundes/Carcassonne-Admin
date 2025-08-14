"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import Checkbox from "./checkbox";
import Loader from "./loader";

interface PopupProps {
  isOpen: boolean;
  onClose: VoidFunction;
  url: string;
}

const STORAGE_KEY = "popupHiddenUntil";

export default function Popup({ isOpen, onClose, url }: PopupProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Precarregando a imagem
  useEffect(() => {
    const img = new Image();
    img.src = url;
    img.onload = () => setImageLoaded(true);
  }, [url]);

  // Verifica se deve exibir o popup baseado no localStorage
  useEffect(() => {
    const hiddenUntil = localStorage.getItem(STORAGE_KEY);

    if (hiddenUntil) {
      const hiddenDate = new Date(hiddenUntil);
      const now = new Date();

      if (now < hiddenDate) {
        setShouldRender(false);
        setInitialized(true);
        return;
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setShouldRender(isOpen);
    setInitialized(true);
  }, [isOpen]);

  const handleClose = () => {
    if (isChecked) {
      const hideUntil = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 horas à frente
      localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    }

    onClose();
  };

  if (!initialized || !shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary-black/40 backdrop-blur-[2px]"
      onClick={handleClose}
    >
      <button
        onClick={handleClose}
        className="absolute flex items-center gap-2 top-2 right-2 bg-secondary-black/50 backdrop-blur-[4px] rounded-lg p-2 shadow-card cursor-pointer z-10"
      >
        Fechar <LuX className="min-w-[18px]" size={18} />
      </button>

      <div
        ref={contentRef}
        className="fixed inset-0 flex items-center justify-center p-4 overflow-auto bg-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3 relative rounded-lg max-w-full max-h-full p-4 animation-popup">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
              <Loader />
            </div>
          )}

          <img
            src={url}
            alt="Popup"
            className={`max-w-full max-h-[90vh] w-auto h-auto rounded-md object-contain shadow-card transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />

          {imageLoaded && (
            <Checkbox
              checked={isChecked}
              setChecked={(e) => setIsChecked(e.target.checked)}
              label="Ocultar por hoje"
              withoutBackground
            />
          )}
        </div>
      </div>
    </div>
  );
}
