"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const img = new Image();
    img.src = url;
    img.onload = () => setImageLoaded(true);
  }, [url]);

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
      const hideUntil = new Date(Date.now() + 5 * 60 * 60 * 1000);
      localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    }
    onClose();
  };

  if (!initialized || !shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-[4px] px-4"
      onClick={handleClose}
    >
      <div
        className="relative flex flex-col bg-secondary-black/95 border border-primary-gold/20 rounded-2xl min-h-[200px] shadow-[0_0_40px_rgba(0,0,0,0.6)] max-w-[400px] w-full max-h-[88vh] overflow-hidden animation-popup"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-4 py-3 border-b border-primary-gold/10 shrink-0">
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full border border-primary-gold/20 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/50 transition-all duration-200"
          >
            <LuX size={15} />
          </button>
        </div>

        {/* Image */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center w-full bg-black/20">
          {!imageLoaded && (
            <div className="absolute py-16">
              <Loader />
            </div>
          )}
          <img
            src={url}
            alt="Popup"
            className={`w-full h-auto object-contain max-h-[65vh] transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0 h-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Footer */}
        {imageLoaded && (
          <div className="px-4 py-3 border-t border-primary-gold/10 shrink-0">
            <Checkbox
              checked={isChecked}
              setChecked={(e) => setIsChecked(e.target.checked)}
              label="Ocultar por hoje"
              withoutBackground
            />
          </div>
        )}
      </div>
    </div>
  );
}
