"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LuExpand,
  LuImage,
  LuMinimize2,
  LuPencil,
  LuPlus,
  LuText,
  LuTrash,
  LuX,
} from "react-icons/lu";
import Input from "@/components/input";
import { patternCarcaImage } from "@/utils/patternValues";
import CarcaImageRepository from "@/services/repositories/CarcaImageRepository";
import { useAlert } from "@/contexts/alertProvider";
import { CarcaImageType } from "@/types";
import InputImage from "@/components/inputImage";
import { uploadImageToFirebase } from "@/services/repositories/FirebaseImageUtils";
import Loader from "@/components/loader";

export const DragCards = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCarcaImage, setNewCarcaImage] = useState(patternCarcaImage);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [carcaImages, setCarcaImages] = useState<CarcaImageType[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedImage, setExpandedImage] = useState<CarcaImageType | null>(
    null,
  );
  const [editingImage, setEditingImage] = useState<CarcaImageType | null>(
    null,
  );
  const [editingDescription, setEditingDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);

  const { addAlert } = useAlert();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("createimage") === "true") setIsModalOpen(true);
  }, []);

  useEffect(() => {
    CarcaImageRepository.getAll()
      .then(setCarcaImages)
      .catch(() => addAlert("Erro ao carregar imagens."));
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleFullscreen = () => {
    if (!isFullscreen && sectionRef.current?.requestFullscreen) {
      sectionRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleAdd = async () => {
    if (!newCarcaImage.src.trim() && !imageFile) {
      addAlert("Adicione uma imagem.");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = newCarcaImage.src || "";
      if (imageFile) {
        const { url } = await uploadImageToFirebase(imageFile, "carca-images");
        imageUrl = url;
      }
      await CarcaImageRepository.create({
        ...newCarcaImage,
        src: imageUrl,
        top: "0",
        left: "0",
        rotate: "0",
      });
      const updated = await CarcaImageRepository.getAll();
      setCarcaImages(updated);
      addAlert("Foto adicionada com sucesso!");
      setIsModalOpen(false);
      setNewCarcaImage(patternCarcaImage);
      setImageFile(null);
    } catch (error) {
      addAlert(`Erro ao adicionar: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const openEditDescription = (img: CarcaImageType) => {
    setEditingImage(img);
    setEditingDescription(img.description ?? "");
  };

  const handleSaveDescription = async () => {
    if (!editingImage?.id) return;
    setSavingDescription(true);
    try {
      await CarcaImageRepository.update(editingImage.id, {
        description: editingDescription,
      });
      setCarcaImages((prev) =>
        prev.map((img) =>
          img.id === editingImage.id
            ? { ...img, description: editingDescription }
            : img,
        ),
      );
      addAlert("Descrição atualizada.");
      setEditingImage(null);
    } catch {
      addAlert("Erro ao atualizar descrição.");
    } finally {
      setSavingDescription(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (!confirm("Remover esta foto do mural?")) return;
    try {
      await CarcaImageRepository.delete(id);
      setCarcaImages((prev) => prev.filter((img) => img.id !== id));
      addAlert("Foto removida.");
    } catch {
      addAlert("Erro ao remover foto.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45 flex items-center gap-2">
        <LuImage size={13} /> Mural de Fotos
      </span>

      <div
        ref={sectionRef}
        className="rounded-xl border border-primary-gold/15 bg-secondary-black/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary-gold/10">
          <span className="text-sm text-primary-gold/60">
            {carcaImages.length}{" "}
            {carcaImages.length === 1 ? "foto" : "fotos"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDescriptions(!showDescriptions)}
              title="Mostrar descrições"
              className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                showDescriptions
                  ? "border-primary-gold/50 text-primary-gold bg-primary-gold/10"
                  : "border-primary-gold/20 text-primary-gold/45 hover:border-primary-gold/40 hover:text-primary-gold"
              }`}
            >
              <LuText size={13} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              title="Adicionar foto"
              className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/45 hover:text-primary-gold transition-all duration-200 cursor-pointer"
            >
              <LuPlus size={13} />
            </button>
            <button
              onClick={handleFullscreen}
              title={isFullscreen ? "Sair do fullscreen" : "Fullscreen"}
              className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/45 hover:text-primary-gold transition-all duration-200 cursor-pointer"
            >
              {isFullscreen ? <LuMinimize2 size={13} /> : <LuExpand size={13} />}
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div
          className={`p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${
            isFullscreen ? "overflow-y-auto max-h-[calc(100vh-80px)] pb-8" : "min-h-[200px]"
          }`}
        >
          {carcaImages.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-primary-gold/25">
              <LuImage size={28} />
              <p className="text-sm">Nenhuma foto no mural ainda.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                Adicionar primeira foto
              </button>
            </div>
          ) : (
            carcaImages.map((img, index) => (
              <div
                key={img.id || index}
                className="group flex flex-col rounded-xl overflow-hidden border border-primary-gold/15 hover:border-primary-gold/45 transition-all duration-300"
              >
                {/* Image — always square */}
                <div
                  onClick={() => setExpandedImage(img)}
                  className="relative overflow-hidden shrink-0 cursor-pointer"
                  style={{ aspectRatio: "1" }}
                >
                  <img
                    src={img.src}
                    alt={img.description}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Hover overlay — expand hint + description + delete (desktop only) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-black via-primary-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:flex flex-col justify-end p-2.5 gap-1.5">
                    <LuExpand
                      size={18}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-gold/90"
                    />
                    {!showDescriptions && img.description && (
                      <p className="text-[10px] text-primary-gold/85 leading-relaxed">
                        {img.description}
                      </p>
                    )}
                    <div className="self-end flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDescription(img);
                        }}
                        className="p-1.5 rounded-lg bg-primary-gold/15 border border-primary-gold/35 text-primary-gold/80 hover:bg-primary-gold/25 hover:text-primary-gold transition-all cursor-pointer"
                      >
                        <LuPencil size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(img.id);
                        }}
                        className="p-1.5 rounded-lg bg-invalid-color/15 border border-invalid-color/35 text-invalid-color/80 hover:bg-invalid-color/25 hover:text-invalid-color transition-all cursor-pointer"
                      >
                        <LuTrash size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full description below image when toggled */}
                {showDescriptions && (
                  <div className="px-2.5 py-2 bg-primary-black/40 border-t border-primary-gold/10">
                    <p className="text-[10px] text-primary-gold/65 leading-relaxed">
                      {img.description || <span className="italic text-primary-gold/25">Sem descrição</span>}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add photo modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] px-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-secondary-black/95 border border-primary-gold/20 rounded-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-primary-gold/10 shrink-0">
              <div className="w-full text-center">
                <h2 className="text-lg text-gradient-gold">Adicionar foto ao mural</h2>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setNewCarcaImage(patternCarcaImage); setImageFile(null); }}
                className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all shrink-0 ml-2"
              >
                <LuX size={14} />
              </button>
            </div>

            {/* Modal content */}
            <div className="flex flex-col sm:flex-row gap-5 p-5 overflow-y-auto">
              {/* Left: inputs */}
              <div className="flex flex-col gap-4 flex-1">
                <div className="rounded-xl border border-primary-gold/15 overflow-hidden">
                  <InputImage
                    onChange={(file, previewUrl) => {
                      if (file) {
                        setImageFile(file);
                        setNewCarcaImage({
                          ...newCarcaImage,
                          src: previewUrl ?? "",
                        });
                      }
                    }}
                    onCloseImage={() => {
                      setImageFile(null);
                      setNewCarcaImage({ ...newCarcaImage, src: "" });
                    }}
                    width={`!w-full ${!imageFile ? "!h-[120px]" : "!min-h-[200px]"}`}
                    previewUrl={newCarcaImage.src}
                  />
                </div>

                {!imageFile && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-primary-gold/15" />
                      <span className="text-[11px] text-primary-gold/30">ou URL</span>
                      <div className="flex-1 h-px bg-primary-gold/15" />
                    </div>
                    <Input
                      label="Link da imagem"
                      placeholder="https://..."
                      value={newCarcaImage.src ?? ""}
                      setValue={(e) => setNewCarcaImage({ ...newCarcaImage, src: e.target.value })}
                      variant
                      width="!w-full"
                    />
                  </>
                )}

                <Input
                  multiline
                  rows={2}
                  placeholder="Descrição da foto (opcional)"
                  label="Descrição"
                  setValue={(e) => setNewCarcaImage({ ...newCarcaImage, description: e.target.value })}
                  value={newCarcaImage.description}
                  variant
                  width="!w-full"
                />

              </div>

              {/* Right: preview */}
              {newCarcaImage.src && (
                <div className="flex flex-col gap-2 items-center shrink-0">
                  <span className="text-[10px] uppercase tracking-widest text-primary-gold/40">
                    Pré-visualização
                  </span>
                  <div className="rounded-xl overflow-hidden border border-primary-gold/20 w-[120px] h-[120px]">
                    <img
                      src={newCarcaImage.src}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-center gap-3 px-5 py-3 border-t border-primary-gold/10 shrink-0">
              <button
                onClick={() => { setIsModalOpen(false); setNewCarcaImage(patternCarcaImage); setImageFile(null); }}
                className="px-4 py-2 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/60 hover:border-primary-gold/40 hover:text-primary-gold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-5 py-2 text-sm rounded-lg border border-primary-gold/50 bg-primary-gold/10 text-primary-gold hover:bg-primary-gold/15 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader /> : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-[6px] px-4"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="flex flex-col items-center gap-3 max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={expandedImage.src}
                alt={expandedImage.description}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-xl border border-primary-gold/20 shadow-2xl"
              />
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-3 -right-3 p-1.5 rounded-full bg-secondary-black border border-primary-gold/30 text-primary-gold/70 hover:text-primary-gold hover:border-primary-gold/60 transition-all cursor-pointer"
              >
                <LuX size={14} />
              </button>
            </div>
            {expandedImage.description && (
              <p className="text-sm text-primary-gold/80 text-center max-w-[500px]">
                {expandedImage.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Edit description modal */}
      {editingImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[4px] px-4"
          onClick={() => setEditingImage(null)}
        >
          <div
            className="bg-secondary-black/95 border border-primary-gold/20 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-primary-gold/10 shrink-0">
              <div className="w-full text-center">
                <h2 className="text-lg text-gradient-gold">Editar descrição</h2>
              </div>
              <button
                onClick={() => setEditingImage(null)}
                className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all shrink-0 ml-2 cursor-pointer"
              >
                <LuX size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="rounded-xl overflow-hidden border border-primary-gold/15 w-full aspect-video">
                <img
                  src={editingImage.src}
                  alt={editingImage.description}
                  className="w-full h-full object-cover"
                />
              </div>
              <Input
                multiline
                rows={3}
                placeholder="Descrição da foto"
                label="Descrição"
                value={editingDescription}
                setValue={(e) => setEditingDescription(e.target.value)}
                variant
                width="!w-full"
              />
            </div>

            <div className="flex justify-center gap-3 px-5 py-3 border-t border-primary-gold/10 shrink-0">
              <button
                onClick={() => setEditingImage(null)}
                className="px-4 py-2 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/60 hover:border-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDescription}
                disabled={savingDescription}
                className="px-5 py-2 text-sm rounded-lg border border-primary-gold/50 bg-primary-gold/10 text-primary-gold hover:bg-primary-gold/15 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingDescription ? <Loader /> : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
