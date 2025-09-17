"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuExpand, LuImage, LuMinimize2, LuPlus, LuText } from "react-icons/lu";
import Modal from "@/components/modal";
import Button from "@/components/button";
import Input from "@/components/input";
import { patternCarcaImage } from "@/utils/patternValues";
import CarcaImageRepository from "@/services/repositories/CarcaImageRepository";
import { useAlert } from "@/contexts/alertProvider";
import { CarcaImageType } from "@/types";
import random from "random";
import InputImage from "@/components/inputImage";
import { uploadImageToFirebase } from "@/services/repositories/FirebaseImageUtils";
import Tooltip from "@/components/Tooltip";
import { useSearchParams } from "next/navigation";

export const DragCards = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCarcaImage, setNewCarcaImage] = useState(patternCarcaImage);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [allDescriptionsVisible, setAllDescriptionsVisible] = useState(false);
  const [carcaImages, setCarcaImages] = useState<CarcaImageType[]>([]);

  const { addAlert } = useAlert();

  const searchParams = useSearchParams();
  const createimage = searchParams.get("createimage");

  useEffect(() => {
    if (createimage === "true") {
      setIsModalOpen(true);
    }
  }, []);

  // Alterna fullscreen
  const handleFullscreen = () => {
    if (!isFullscreen && sectionRef.current?.requestFullscreen) {
      sectionRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

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
  }, []);

  const addCarcaImage = async () => {
    if (!newCarcaImage.src.trim() && !imageFile) {
      addAlert("Adicione uma imagem!");
      return;
    }

    try {
      let imageUrl = newCarcaImage.src || "";

      if (imageFile) {
        const { url } = await uploadImageToFirebase(imageFile, "carca-images");
        imageUrl = url;
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
      console.error(error);
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
      style={{
        backgroundImage: "url('images/black-cardboard-texture.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "repeat",
      }}
      ref={sectionRef}
      className={`${isModalOpen && "border"} saturate-110 relative grid min-h-[600px] sm:max-w-[90%] w-full place-content-center bg-dark-black rounded-lg shadow-card`}
    >
      <div className="absolute z-40 top-4 right-4 flex gap-2">
        <button
          onClick={() => setAllDescriptionsVisible(!allDescriptionsVisible)}
          className="cursor-pointer p-2 text-sm bg-primary-gold text-primary-black font-semibold rounded hover:bg-primary-gold/80 transition"
        >
          <LuText size={18} />
        </button>
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
      {allDescriptionsVisible && (
        <div className="absolute top-0 left-0 flex gap-2 flex-col sm:p-4 py-16 px-4 bg-dark-black/30 backdrop-blur-[4px] z-30 rounded max-h-full overflow-y-auto">
          {carcaImages.map(({ description }, index) => (
            <span
              className="p-2 max-w-[500px] rounded-lg border border-dashed bg-dark-black"
              key={index}
            >
              {description}
            </span>
          ))}
        </div>
      )}
      {/* <h1 className="text-5xl opacity-25 text-center p-6">Carcassonne Pub</h1> */}

      <div
        className={`relative w-full p-16 flex flex-wrap gap-5 justify-center ${isFullscreen && "overflow-y-auto"}`}
      >
        {" "}
        {carcaImages.map((carcaImage, index) => (
          <div
            style={{
              transform: `rotate(${(Math.random() * 4 - 2).toFixed(2)}deg)`,
            }}
            key={index}
            className={`relative flex justify-center bg-primary-white w-fit h-fit p-2 pb-6 shadow-card`}
          >
            <img
              className="absolute z-20 w-8 -translate-y-6 translate-x-4"
              src="svg/map_pin.svg"
              alt="map_pin"
            />
            <div
              style={{
                backgroundImage: `url(images/black-cardboard-texture.jpg)`,
              }}
              className="absolute z-10 p-1 rounded-full w-3 h-3 translate-x-1 border border-primary-black shadow-card "
            ></div>
            <Tooltip
              textWrap
              clickToStay
              contentNode={carcaImage.description}
              direction="top"
            >
              <img
                key={carcaImage.id || index}
                src={carcaImage.src}
                alt={carcaImage.description}
                className="shadow-card-light border border-primary-black/50"
                style={{
                  width: carcaImage.width,
                  height: carcaImage.height,
                  minWidth: carcaImage.width,
                }}
              />
            </Tooltip>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setNewCarcaImage(patternCarcaImage);
          }}
        >
          <h2 className="text-3xl text-center">Adicionar uma nova foto</h2>
          <section className="flex justify-center gap-6 w-full my-6 flex-wrap overflow-y-auto">
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
