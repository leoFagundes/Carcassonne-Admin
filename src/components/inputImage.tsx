"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuImagePlus, LuX } from "react-icons/lu";
import {
  isHeicFile,
  convertHeicToJpeg,
} from "@/services/repositories/FirebaseImageUtils";

interface InputImageProps {
  // previewUrl (2º argumento) já vem pronto pra exibir — pode ser diferente
  // do arquivo original (ex: convertido de HEIC pra JPEG só pra preview).
  onChange: (file: File | null, previewUrl?: string) => void;
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fotos HEIC/HEIF (padrão do iPhone) não renderizam em <img> na maioria
    // dos navegadores — sem isso, a pré-visualização fica em branco mesmo
    // quando o envio (que já converte pra JPEG) funciona normalmente.
    try {
      const previewSource = isHeicFile(file)
        ? await convertHeicToJpeg(file)
        : file;
      const imageUrl = URL.createObjectURL(previewSource);
      setLocalPreview(imageUrl);
      onChange(file, imageUrl);
    } catch (error) {
      console.error("Erro ao gerar pré-visualização da imagem:", error);
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
              if (onCloseImage) onCloseImage();
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
