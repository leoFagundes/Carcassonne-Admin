"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuImagePlus, LuX } from "react-icons/lu";

interface InputImageProps {
  onChange: (file: File | null) => void;
  previewUrl?: string;
  width?: string;
  onCloseImage?: VoidFunction;
}

export default function InputImage({
  onChange,
  previewUrl,
  width = "w-auto",
  onCloseImage,
}: InputImageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localPreview, setLocalPreview] = useState<string | undefined>(
    previewUrl
  );

  useEffect(() => {
    setLocalPreview(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setLocalPreview(imageUrl);
      onChange(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`relative flex flex-col items-center gap-2 text-primary-gold w-full ${width}`}
    >
      {localPreview && (
        <>
          <div
            onClick={() => {
              setLocalPreview(undefined);
              onCloseImage && onCloseImage();
            }}
            className="absolute right-2 top-2 rounded-full p-1 bg-primary-black/60 cursor-pointer border border-transparent hover:border-primary-gold/60 transition-all"
          >
            <LuX size={"16px"} />
          </div>
        </>
      )}
      {localPreview ? (
        <img
          src={localPreview}
          alt="Pré-visualização"
          className={`object-cover rounded-lg border cursor-pointer w-[100px] h-[100px] shadow-card ${width}`}
          onClick={handleClick}
        />
      ) : (
        <div
          className={`rounded-lg flex flex-col gap-2 items-center justify-center cursor-pointer border border-dashed p-3 ${width}`}
          onClick={handleClick}
        >
          <LuImagePlus size={"22px"} />
          <span>Selecionar imagem</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
    </div>
  );
}
