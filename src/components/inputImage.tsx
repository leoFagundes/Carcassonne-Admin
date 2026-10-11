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
      {localPreview ? (
        // Prévia: passar o mouse mostra "Trocar"; o X fica no canto da foto
        <div className={`group relative ${width}`}>
          <img
            src={localPreview}
            alt="Pré-visualização"
            className={`block object-cover rounded-xl border border-primary-gold/25 cursor-pointer w-[100px] h-[100px] shadow-[0_10px_28px_rgba(0,0,0,0.45)] ${width}`}
            onClick={handleClick}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-primary-black/55 text-[11px] font-semibold text-primary-gold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <LuImagePlus size={18} />
            Trocar
          </div>
          <button
            type="button"
            aria-label="Remover imagem"
            onClick={() => {
              setLocalPreview(undefined);
              if (onCloseImage) onCloseImage();
            }}
            className="absolute right-1.5 top-1.5 z-10 flex items-center justify-center w-7 h-7 rounded-full border border-primary-gold/30 bg-primary-black/75 backdrop-blur-sm text-primary-gold/80 cursor-pointer transition-colors hover:border-invalid-color/60 hover:text-invalid-color"
          >
            <LuX size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`group flex flex-col gap-2 items-center justify-center min-w-[180px] px-6 py-5 rounded-xl border border-dashed border-primary-gold/30 bg-primary-black/40 cursor-pointer transition-colors hover:border-primary-gold/60 hover:bg-primary-gold/[0.04] ${width}`}
          onClick={handleClick}
        >
          <span className="flex items-center justify-center w-10 h-10 rounded-full border border-primary-gold/25 bg-primary-gold/10 text-primary-gold transition-transform duration-200 group-hover:scale-110">
            <LuImagePlus size={18} />
          </span>
          <span className="text-sm font-semibold">Selecionar imagem</span>
          <span className="text-[10px] text-primary-gold/40">
            JPG, PNG ou foto do celular
          </span>
        </button>
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
