"use client";

import React, { useEffect, useState } from "react";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "./loaderFullscreen";
import { PopupType } from "@/types";
import InputImage from "./inputImage";
import Button from "./button";
import Loader from "./loader";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
  uploadImageToFirebase,
} from "@/services/repositories/FirebaseImageUtils";
import PopupRepository from "@/services/repositories/PopupRepositoire";
import { patternPopup } from "@/utils/patternValues";
import Input from "./input";
import { LuX } from "react-icons/lu";

interface DescriptionTypeFormsProps {
  closeForms: VoidFunction;
}

export default function PopupForms({ closeForms }: DescriptionTypeFormsProps) {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [popups, setPopups] = useState<PopupType[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupType>(patternPopup);
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchGeneralConfigs = async () => {
      setFetchLoading(true);
      try {
        const fetchedPopups = await PopupRepository.getAll();

        setPopups(fetchedPopups);
      } catch (error) {
        addAlert(`Erro ao carregar popups: ${error}`);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchGeneralConfigs();
  }, []);

  const handleSavePopup = async () => {
    if (!currentPopup.label) {
      addAlert("Adicione um nome para a imagem antes de continuar.");
      return;
    }
    if (!currentPopup.src && !imageFile) {
      addAlert("Adicione uma imagem antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = currentPopup.src || "";

      if (imageFile) {
        const { url } = await uploadImageToFirebase(imageFile, "popups");
        imageUrl = url;
      }

      const updatedPopup = {
        ...currentPopup,
        src: imageUrl,
      };

      await PopupRepository.create(updatedPopup);
      setCurrentPopup(patternPopup);
      addAlert(`Popup criado com sucesso!`);
      closeForms();
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao criar Popup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePopup = async (id: string | undefined) => {
    if (!id) {
      addAlert("Recarregue a página e tente novamente...");
      return;
    }

    setFetchLoading(true);

    try {
      const allPopups = await PopupRepository.getAll();
      const popupToDelete = allPopups.find((p) => p.id === id);

      if (!popupToDelete) {
        addAlert("Popup não encontrado.");
        return;
      }

      // se tiver imagem associada, deleta no Storage
      if (popupToDelete.src) {
        const imagePath = getPathFromFirebaseUrl(popupToDelete.src);
        if (imagePath) {
          await deleteImageFromFirebase(imagePath);
        }
      }

      // remove o popup do Firestore
      await PopupRepository.delete(id);

      // atualiza o estado local
      setPopups(allPopups.filter((popup) => popup.id !== id));

      closeForms();
      addAlert("Popup deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar popup:", error);
      addAlert("Erro ao deletar Popup.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handlePopupStatus = async (id: string | undefined) => {
    if (!id) {
      addAlert("Recarregue a página e tente novamente...");
      return;
    }

    setFetchLoading(true);
    try {
      // busca todos os popups atuais no banco
      const allPopups = await PopupRepository.getAll();

      // acha o popup clicado
      const targetPopup = allPopups.find((p) => p.id === id);
      if (!targetPopup) {
        addAlert("Popup não encontrado.");
        return;
      }

      // se já estava ativo -> desativar todos
      if (targetPopup.isActive) {
        await Promise.all(
          allPopups.map((popup) =>
            popup.isActive
              ? PopupRepository.update(popup.id!, { isActive: false })
              : Promise.resolve(true)
          )
        );

        setPopups(allPopups.map((popup) => ({ ...popup, isActive: false })));
      } else {
        // se estava inativo -> ativar só ele e desativar os outros
        await Promise.all(
          allPopups.map((popup) =>
            PopupRepository.update(popup.id!, {
              isActive: popup.id === id,
            })
          )
        );

        setPopups(
          allPopups.map((popup) => ({
            ...popup,
            isActive: popup.id === id,
          }))
        );
      }
    } catch (error) {
      addAlert("Erro ao alterar status do popup.");
      console.error(error);
    } finally {
      setFetchLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center overflow-y-scroll px-2">
      {fetchLoading && <LoaderFullscreen />}
      <h1 className="text-4xl text-gradient-gold text-center">
        Adicionar um novo Popup
      </h1>

      <div className="p-3 rounded shadow-card my-6 gap-5 flex flex-col bg-dark-black">
        <div className="flex flex-col gap-6 text-primary-gold">
          <InputImage
            onChange={(file) => {
              if (file) {
                setImageFile(file);
                setCurrentPopup({
                  ...currentPopup,
                  src: URL.createObjectURL(file),
                });
              }
            }}
            onCloseImage={() => {
              setImageFile(null);
              setCurrentPopup({
                ...currentPopup,
                src: "",
              });
            }}
            width={`!min-w-[250px]   ${
              !imageFile ? "!h-[100px]" : "!min-h-[250px]"
            }`}
            previewUrl={currentPopup.src}
          />
          <Input
            placeholder="Nome da Imagem"
            label="Nome da Imagem"
            value={currentPopup.label}
            setValue={(e) =>
              setCurrentPopup({ ...currentPopup, label: e.target.value })
            }
            variant
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSavePopup} disabled={loading}>
            {loading ? <Loader /> : "Adicionar"}
          </Button>
        </div>
      </div>

      <h1 className="text-4xl text-gradient-gold text-center">
        Galeria de Popups
      </h1>

      <div className="p-3 rounded shadow-card my-6 gap-5 flex flex-wrap justify-center bg-dark-black">
        {popups.map((popup, index) => {
          return (
            <div className="flex flex-col items-center" key={index}>
              <span className="text-primary-gold text-lg text-center font-semibold">
                {popup.label}
              </span>
              <div className="relative">
                <div
                  onClick={() => handlePopupStatus(popup.id)}
                  className="flex gap-2 items-center absolute shadow-card top-2 right-2 backdrop-blur-[4px] bg-primary-black/20 px-2 py-1 rounded-full border border-transparent hover:border hover:border-primary-gold cursor-pointer"
                >
                  <span className="text-primary-gold font-semibold text-sm">
                    {popup.isActive ? "Ativo" : "Desativado"}
                  </span>
                  <div
                    className={`h-3 w-3 rounded-full border border-dashed border-primary-gold ${
                      popup.isActive && "bg-primary-gold"
                    }`}
                  />
                </div>

                <div
                  onClick={() => handleDeletePopup(popup.id)}
                  className="flex gap-2 items-center absolute shadow-card top-11 right-2 backdrop-blur-[4px] bg-primary-black/20 px-2 py-1 rounded-full cursor-pointer border border-transparent hover:border hover:border-primary-gold"
                >
                  <span className="text-primary-gold text-sm font-semibold">
                    Excluir
                  </span>
                  <LuX className="text-primary-gold w-4 h-4" />
                </div>

                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                    <Loader />
                  </div>
                )}

                <img
                  src={popup.src}
                  alt="popup"
                  className={`w-[200px] rounded shadow-card transition-opacity duration-300 ${
                    popup.isActive && "border border-primary-gold"
                  } ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
