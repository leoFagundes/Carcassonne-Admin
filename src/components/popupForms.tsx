"use client";

import React, { useEffect, useState } from "react";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "./loaderFullscreen";
import { GeneralConfigsType } from "@/types";
import InputImage from "./inputImage";
import Button from "./button";
import Loader from "./loader";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import Tooltip from "./Tooltip";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
  uploadImageToFirebase,
} from "@/services/repositories/FirebaseImageUtils";

interface DescriptionTypeFormsProps {
  currentConfig: GeneralConfigsType;
  setCurrentConfig: React.Dispatch<
    React.SetStateAction<GeneralConfigsType | undefined>
  >;
  closeForms: VoidFunction;
}

export default function PopupForms({
  currentConfig,
  setCurrentConfig,
  closeForms,
}: DescriptionTypeFormsProps) {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchedPopup, setFecthedPopup] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const { addAlert } = useAlert();

  console.log(imageFile);

  useEffect(() => {
    const fetchGeneralConfigs = async () => {
      setFetchLoading(true);
      try {
        const configs = await GeneralConfigsRepository.get();

        if (configs?.popUpImage) {
          setFecthedPopup(configs?.popUpImage);
        }
      } catch (error) {
        addAlert(`Erro ao carregar configurações gerais: ${error}`);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchGeneralConfigs();
  }, []);

  const handleSavePopup = async () => {
    if (!currentConfig.popUpImage && !imageFile) {
      addAlert("Adicione uma imagem antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = currentConfig.popUpImage || "";

      if (imageFile) {
        const { url } = await uploadImageToFirebase(imageFile, "popup");
        imageUrl = url;
      }

      const updatedConfig = {
        ...currentConfig,
        popUpImage: imageUrl,
      };

      await GeneralConfigsRepository.update(updatedConfig);
      setCurrentConfig(updatedConfig);
      addAlert(`Popup salvo com sucesso!`);
      closeForms();
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao salvar Popup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePopup = async () => {
    setLoading(true);

    try {
      const imageUrl = currentConfig.popUpImage;

      if (imageUrl) {
        const imagePath = getPathFromFirebaseUrl(imageUrl);
        if (imagePath) {
          await deleteImageFromFirebase(imagePath);
        }
      }

      const generalConfigsWithNoPopup = {
        ...currentConfig,
        popUpImage: "",
      };

      await GeneralConfigsRepository.update(generalConfigsWithNoPopup);
      setCurrentConfig(generalConfigsWithNoPopup);
      closeForms();
      addAlert(`Popup deletado com sucesso!`);
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao deletar Popup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center overflow-y-scroll px-2">
      {fetchLoading && <LoaderFullscreen />}
      <h1 className="text-4xl text-gradient-gold text-center">
        {fetchedPopup ? "Popup ativo" : "Adicionar um novo Popup"}
      </h1>

      {!fetchedPopup ? (
        <>
          <div className="flex flex-col gap-6 my-6 text-primary-gold">
            <InputImage
              onChange={(file) => {
                if (file) {
                  setImageFile(file);
                  setCurrentConfig({
                    ...currentConfig,
                    popUpImage: URL.createObjectURL(file),
                  });
                }
              }}
              onCloseImage={() => {
                setImageFile(null);
                setCurrentConfig({
                  ...currentConfig,
                  popUpImage: "",
                });
              }}
              width={`!min-w-[250px]   ${
                !imageFile ? "!h-[100px]" : "!min-h-[250px]"
              }`}
              previewUrl={currentConfig.popUpImage}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 my-6 text-primary-gold max-w-[400px] overflow-auto">
          <img src={fetchedPopup} alt="popup" className="w-[200px]" />
          <a
            href={fetchedPopup}
            className="italic text-center hover:underline break-all"
            target="_blank"
          >
            {fetchedPopup}
          </a>
        </div>
      )}
      <div className="flex gap-2 m-2">
        {!fetchedPopup ? (
          <Button onClick={handleSavePopup} disabled={loading}>
            {loading ? <Loader /> : "Salvar"}
          </Button>
        ) : (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button
              onClick={handleDeletePopup}
              isHoverInvalid
              disabled={loading}
            >
              {loading ? <Loader /> : "Excluir"}
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
