"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { LuCheck, LuX } from "react-icons/lu";
import Modal from "./modal";
import { getCroppedImageFile } from "@/utils/cropImage";

interface ImageCropperModalProps {
  isOpen: boolean;
  file: File | null;
  onCancel: VoidFunction;
  onConfirm: (croppedFile: File) => void;
}

export default function ImageCropperModal({
  isOpen,
  file,
  onCancel,
  onConfirm,
}: ImageCropperModalProps) {
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!file) {
      setImgSrc("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result?.toString() ?? "");
    reader.readAsDataURL(file);
    setCrop(undefined);
    setCompletedCrop(undefined);
  }, [file]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Recorte inicial: quadrado centralizado, 80% da menor dimensão — o
    // usuário é livre pra arrastar as bordas e ajustar do jeito que quiser.
    const size = Math.min(width, height) * 0.8;
    const initialCrop = centerCrop(
      {
        unit: "px",
        width: size,
        height: size,
        x: (width - size) / 2,
        y: (height - size) / 2,
      },
      width,
      height
    );
    setCrop(initialCrop);
    setCompletedCrop(initialCrop as PixelCrop);
  }

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop || !file) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImageFile(
        imgRef.current,
        completedCrop,
        file.name
      );
      onConfirm(cropped);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} noPadding patternCloseButton={false}>
      <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-2xl w-[95vw] max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-primary-gold/10 shrink-0">
          <span className="text-sm font-semibold text-primary-gold/80">
            Ajustar recorte
          </span>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer"
          >
            <LuX size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 bg-primary-black/40">
          {imgSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img
                ref={imgRef}
                src={imgSrc}
                onLoad={onImageLoad}
                alt="Imagem para recorte"
                className="max-h-[60vh] max-w-full"
              />
            </ReactCrop>
          )}
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-primary-gold/10 shrink-0">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <div className="flex-1" />
          <button
            onClick={handleConfirm}
            disabled={processing || !completedCrop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40"
          >
            <LuCheck size={13} /> {processing ? "Aplicando..." : "Aplicar recorte"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
