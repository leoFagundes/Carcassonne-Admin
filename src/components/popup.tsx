import React, { useRef } from "react";
import { LuX } from "react-icons/lu";

interface PopupProps {
  isOpen: boolean;
  onClose: VoidFunction;
  url: string;
}

export default function Popup({ isOpen, onClose, url }: PopupProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
    if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-secondary-black/40 backdrop-blur-[2px]"
      onClick={handleClickOutside}
    >
      <button
        onClick={onClose}
        className="absolute flex items-center gap-2 top-2 right-2 bg-secondary-black rounded-lg p-2 shadow-card cursor-pointer"
      >
        Fechar <LuX className="min-w-[18px]" size={"18px"} />
      </button>
      <div
        ref={contentRef}
        className="relative rounded-lg shadow-lg max-w-md w-full p-4 "
      >
        <img
          src={url}
          alt="Popup"
          className="w-full h-auto rounded-md object-contain shadow-card"
        />
      </div>
    </div>
  );
}
