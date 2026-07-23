"use client";

import { useEffect, useRef, useState } from "react";
import { LuCamera, LuImageUp, LuImages, LuTrash2, LuX } from "react-icons/lu";
import { uploadImageToFirebase } from "@/services/repositories/FirebaseImageUtils";
import CarcaImageRepository from "@/services/repositories/CarcaImageRepository";
import { CarcaImageType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Modal from "./modal";

interface FreelancerPhotoPickerProps {
  photoUrl?: string;
  onChange: (
    photo: { url: string; source: "upload" | "mural" } | null
  ) => void;
  size?: number;
}

export default function FreelancerPhotoPicker({
  photoUrl,
  onChange,
  size = 76,
}: FreelancerPhotoPickerProps) {
  const { addAlert } = useAlert();
  const [menuOpen, setMenuOpen] = useState(false);
  const [muralModal, setMuralModal] = useState(false);
  const [muralImages, setMuralImages] = useState<
    (CarcaImageType & { id: string })[]
  >([]);
  const [muralLoading, setMuralLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMenuOpen(false);
    setUploading(true);
    try {
      const { url } = await uploadImageToFirebase(file, "freelancers");
      onChange({ url, source: "upload" });
    } catch (error) {
      console.error("Erro ao enviar foto do freelancer:", error);
      addAlert("Erro ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }

  async function openMural() {
    setMenuOpen(false);
    setMuralModal(true);
    setMuralLoading(true);
    try {
      const images = await CarcaImageRepository.getAll();
      setMuralImages(images);
    } catch (error) {
      console.error("Erro ao carregar mural:", error);
      addAlert("Erro ao carregar as imagens do mural.");
    } finally {
      setMuralLoading(false);
    }
  }

  function selectMuralImage(image: CarcaImageType) {
    onChange({ url: image.src, source: "mural" });
    setMuralModal(false);
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          disabled={uploading}
          style={{ width: size, height: size }}
          className="relative rounded-full overflow-hidden border border-dashed border-primary-gold/40 hover:border-primary-gold flex items-center justify-center bg-primary-black/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Foto do freelancer"
              className="w-full h-full object-cover"
            />
          ) : (
            <LuCamera size={22} className="text-primary-gold/50" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-primary-black/70 flex items-center justify-center">
              <span className="text-[8px] text-primary-gold">enviando</span>
            </div>
          )}
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 bg-secondary-black border border-primary-gold/20 rounded-lg shadow-xl p-1 flex flex-col gap-0.5 w-[190px] max-w-[80vw]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded hover:bg-primary-gold/10 text-left cursor-pointer transition-colors text-primary-gold/90 whitespace-nowrap"
            >
              <LuImageUp size={14} /> Enviar nova foto
            </button>
            <button
              type="button"
              onClick={openMural}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded hover:bg-primary-gold/10 text-left cursor-pointer transition-colors text-primary-gold/90 whitespace-nowrap"
            >
              <LuImages size={14} /> Usar foto do mural
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded hover:bg-invalid-color/10 text-left cursor-pointer transition-colors text-invalid-color/90 whitespace-nowrap"
              >
                <LuTrash2 size={14} /> Remover foto
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Modal
        isOpen={muralModal}
        onClose={() => setMuralModal(false)}
        noPadding
        patternCloseButton={false}
      >
        <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-2xl w-[95vw] max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-primary-gold/10 shrink-0">
            <span className="text-sm font-semibold text-primary-gold/70">
              Escolher foto do mural
            </span>
            <button
              type="button"
              onClick={() => setMuralModal(false)}
              className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuX size={15} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {muralLoading ? (
              <span className="text-sm text-primary-gold/50">
                Carregando...
              </span>
            ) : muralImages.length === 0 ? (
              <span className="text-sm text-primary-gold/50">
                Nenhuma imagem no mural ainda.
              </span>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {muralImages.map((image) => (
                  <button
                    type="button"
                    key={image.id}
                    onClick={() => selectMuralImage(image)}
                    className="aspect-square rounded-lg overflow-hidden border border-primary-gold/15 hover:border-primary-gold transition-all cursor-pointer"
                    title={image.description}
                  >
                    <img
                      src={image.src}
                      alt={image.description}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
