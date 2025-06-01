"use client";

import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";
import {
  LuExpand,
  LuImage,
  LuMinimize2,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import Modal from "@/components/modal";
import Button from "@/components/button";
import Input from "@/components/input";
import { patternCarcaImage } from "@/utils/patternValues";
import CarcaImageRepository from "@/services/repositories/CarcaImageRepository";
import { useAlert } from "@/contexts/alertProvider";
import { CarcaImageType } from "@/types";
import random from "random";
import {
  deleteImageFromCloudinary,
  extractPublicIdFromUrl,
  uploadImageToCloudinary,
} from "@/services/repositories/cloudinaryImagesService";
import InputImage from "@/components/inputImage";

const UPLOAD_PRESET = process.env
  .NEXT_PUBLIC_CLOUDNINARY_UPLOAD_PRESET as string;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDNINARY_CLOUD_NAME as string;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDNINARY_API_KEY as string;
const API_SECRET = process.env.NEXT_PUBLIC_CLOUDNINARY_API_SECRET as string;

export const DragCards = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCarcaImage, setNewCarcaImage] = useState(patternCarcaImage);
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const { addAlert } = useAlert();

  // Alterna fullscreen
  const handleFullscreen = () => {
    if (!isFullscreen && sectionRef.current?.requestFullscreen) {
      sectionRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const addCarcaImage = async () => {
    if (!newCarcaImage.src.trim()) {
      addAlert("Adicione uma url a imagem!");
      return;
    }

    try {
      let imageUrl = newCarcaImage.src || "";
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(
          imageFile,
          UPLOAD_PRESET,
          CLOUD_NAME
        );
      }

      const top = `${random.int(10, 60)}%`;
      const left = `${random.int(10, 60)}%`;
      const rotate = `${(Math.random() * 32 - 16).toFixed(2)}deg`;

      await CarcaImageRepository.create({
        ...newCarcaImage,
        top,
        left,
        rotate,
        src: imageUrl,
      });
      addAlert("Imagem criada com sucesso");
      setIsModalOpen(false);
      setNewCarcaImage(patternCarcaImage);
    } catch (error) {
      addAlert(`Erro ao adicionar imagem: ${error}`);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="border relative grid min-h-[600px] max-w-[900px] w-full place-content-center overflow-hidden bg-dark-black rounded-lg shadow-card"
    >
      <div className="absolute z-20 top-4 right-4 flex gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer p-2 text-sm bg-primary-gold text-primary-black font-semibold rounded hover:bg-primary-gold/80 transition"
        >
          <LuPlus size={18} />
        </button>
        <button
          onClick={handleFullscreen}
          className="cursor-pointer p-2 text-sm bg-primary-gold text-primary-black font-semibold rounded hover:bg-primary-gold/80 transition"
        >
          {isFullscreen ? <LuMinimize2 size={18} /> : <LuExpand size={18} />}
        </button>
      </div>
      <h1 className="text-5xl opacity-25 text-center">Carcassonne Pub</h1>

      <Cards />

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setNewCarcaImage(patternCarcaImage);
          }}
        >
          <h2 className="text-3xl text-center">Adicionar uma nova foto</h2>
          <section className="flex justify-center gap-6 w-full my-6">
            <div className="flex flex-col items-center gap-5 p-2">
              <div className="flex flex-col gap-1 border p-1 rounded shadow-card border-dashed border-primary-gold/20">
                <InputImage
                  onChange={(file) => {
                    if (file) {
                      setImageFile(file);
                      setNewCarcaImage({
                        ...newCarcaImage,
                        src: URL.createObjectURL(file),
                      });
                    }
                  }}
                  onCloseImage={() => {
                    setImageFile(null);
                    setNewCarcaImage({
                      ...newCarcaImage,
                      src: "",
                    });
                  }}
                  width="!w-[250px]"
                  previewUrl={newCarcaImage.src}
                />

                {!imageFile && (
                  <>
                    <span className="w-full text-center text-primary-gold/80 italic">
                      ou
                    </span>

                    <Input
                      label="Link da imagem"
                      placeholder="URL da imagem"
                      value={newCarcaImage.src ?? ""}
                      setValue={(e) =>
                        setNewCarcaImage({
                          ...newCarcaImage,
                          src: e.target.value,
                        })
                      }
                      variant
                      icon={<LuImage size={"18px"} />}
                      width="!w-[250px]"
                    />
                  </>
                )}
              </div>
              <Input
                multiline
                placeholder="descrição da imagem"
                label="descrição da imagem"
                setValue={(e) =>
                  setNewCarcaImage({
                    ...newCarcaImage,
                    description: e.target.value,
                  })
                }
                value={newCarcaImage.description}
                variant
                width="!w-[250px]"
              />
              <div className="flex gap-4 w-full justify-center">
                <div
                  onClick={() =>
                    setNewCarcaImage({
                      ...newCarcaImage,
                      width: "320px",
                      height: "224px",
                    })
                  }
                  className="flex items-center justify-center w-12 h-8 border cursor-pointer hover:text-primary-gold/80 border-dashed"
                >
                  1
                </div>
                <div
                  onClick={() =>
                    setNewCarcaImage({
                      ...newCarcaImage,
                      width: "224px",
                      height: "300px",
                    })
                  }
                  className="flex items-center justify-center w-8 h-12 border cursor-pointer hover:text-primary-gold/80 border-dashed"
                >
                  2
                </div>
                <div
                  onClick={() =>
                    setNewCarcaImage({
                      ...newCarcaImage,
                      width: "224px",
                      height: "224px",
                    })
                  }
                  className="flex items-center justify-center  w-8 h-8 border cursor-pointer hover:text-primary-gold/80 border-dashed"
                >
                  3
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-center p-2">
              <span className="font-semibold text-xl">Pré-visualização</span>
              <img
                style={{
                  width: newCarcaImage.width,
                  height: newCarcaImage.height,
                }}
                className={`text-primary-gold border w-48 ${
                  newCarcaImage.src ? "bg-primary-white" : "bg-primary-black "
                } p-1 pb-4`}
                src={newCarcaImage.src || "images/mascote-3.png"}
                alt={"preview carcaimage"}
              />
            </div>
          </section>
          <div>
            <Button onClick={addCarcaImage}>Adicionar</Button>
          </div>
        </Modal>
      )}
    </section>
  );
};

const Cards = () => {
  const [carcaImages, setCarcaImages] = useState<CarcaImageType[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchCarcaImages = async () => {
      try {
        const fetchedCarcaImages = await CarcaImageRepository.getAll();
        setCarcaImages(fetchedCarcaImages);
      } catch (error) {
        addAlert(`Erro ao carregar imagens: ${error}`);
      }
    };

    fetchCarcaImages();
  });

  return (
    <div className="absolute inset-0 z-10" ref={containerRef}>
      {carcaImages.map(
        (carcaImage, index) =>
          carcaImage.id && (
            <Card
              key={index}
              id={carcaImage.id}
              containerRef={containerRef}
              src={carcaImage.src}
              alt={`carcaimage ${index}`}
              description={carcaImage.description}
              rotate={carcaImage.rotate}
              top={carcaImage.top}
              left={carcaImage.left}
              width={carcaImage.width}
              height={carcaImage.height}
            />
          )
      )}
    </div>
  );
};

interface Props {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  id: string;
  src: string;
  alt: string;
  top: string;
  left: string;
  rotate: string;
  width: string;
  height: string;
  description?: string;
}

const Card = ({
  containerRef,
  id,
  src,
  alt,
  top,
  left,
  rotate,
  width,
  height,
  description = "",
}: Props) => {
  const [zIndex, setZIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [opacityLow, setOpacityLow] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null); // Adapte para receber como prop se necessário

  const updateZIndex = () => {
    const els = document.querySelectorAll(".drag-elements");
    let maxZIndex = -Infinity;
    els.forEach((el) => {
      const zIndex = parseInt(
        window.getComputedStyle(el).getPropertyValue("z-index")
      );
      if (!isNaN(zIndex) && zIndex > maxZIndex) {
        maxZIndex = zIndex;
      }
    });
    setZIndex(maxZIndex + 1);
  };

  const checkDropInZone = async () => {
    const img = imgRef.current;
    const zone = dropZoneRef.current;
    if (!img || !zone) return;

    const imgRect = img.getBoundingClientRect();
    const zoneRect = zone.getBoundingClientRect();

    const isInside =
      imgRect.left < zoneRect.right &&
      imgRect.right > zoneRect.left &&
      imgRect.top < zoneRect.bottom &&
      imgRect.bottom > zoneRect.top;

    if (isInside) {
      const confirmDelete = window.confirm(
        "Deseja realmente deletar esta imagem?"
      );
      if (confirmDelete) {
        setOpacityLow(true);
        console.log("Imagem caiu na zona! Executando função...", img.id);

        const publicIdToDelete = extractPublicIdFromUrl(img.src);
        if (publicIdToDelete) {
          await deleteImageFromCloudinary(
            publicIdToDelete,
            API_KEY,
            API_SECRET,
            CLOUD_NAME
          );
        }
        await CarcaImageRepository.delete(img.id);
        window.location.reload();
      } else {
        setOpacityLow(false);
      }
    } else {
      setOpacityLow(false);
    }
  };

  return (
    <>
      {isMouseOver && (
        <div className="absolute top-4 left-4 p-2 max-w-[200px] rounded-lg border border-dashed z-20 bg-dark-black">
          {description}
        </div>
      )}
      <div
        ref={dropZoneRef}
        className="flex items-center justify-center absolute bottom-4 text-primary-gold/60 left-4 w-20 h-20 border border-dashed rounded-md"
      >
        <LuTrash2 size={32} className="opacity-25" />
      </div>
      <motion.img
        id={id}
        ref={imgRef}
        onMouseDown={updateZIndex}
        onMouseOver={() => setIsMouseOver(true)}
        onMouseLeave={() => setIsMouseOver(false)}
        style={{
          top,
          left,
          rotate,
          zIndex,
          width,
          height,
          cursor: isDragging ? "grabbing" : "grab",
          opacity: opacityLow ? 0.4 : 1, // muda a opacidade ao soltar na zona
        }}
        className={twMerge(
          "drag-elements absolute w-48 bg-primary-white p-1 pb-4 transition-opacity duration-300"
        )}
        src={src}
        alt={alt}
        drag
        whileTap={{ cursor: "grabbing", scale: 0.98 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
          setIsDragging(false);
          checkDropInZone();
        }}
        dragConstraints={containerRef}
        dragElastic={0.65}
      />
    </>
  );
};
