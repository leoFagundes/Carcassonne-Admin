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
    setLoading(true);

    try {
      const teste =
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_FnIe-JaWZxuyL5w727A-ytWlwoLG6dBaug&s";
      await GeneralConfigsRepository.update({
        ...currentConfig,
        popUpImage: teste,
      });
      addAlert(`Popup criado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao salvar Popup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePopup = async () => {
    setLoading(true);

    try {
      const generalConfigsWhitNoPopup = { ...currentConfig, popUpImage: "" };

      await GeneralConfigsRepository.update(generalConfigsWhitNoPopup);
      setCurrentConfig(generalConfigsWhitNoPopup);
      closeForms();
      addAlert(`Popup deletado com sucesso!`);
    } catch (error) {
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
              width="!min-w-[250px] !min-h-[250px]"
              previewUrl={currentConfig.popUpImage}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 my-6 text-primary-gold max-w-[400px]">
          <img src={fetchedPopup} alt="popup" className="w-[200px]" />
          <a
            href={fetchedPopup}
            className="italic text-center hover:underline"
            target="_blank"
          >
            {fetchedPopup}
          </a>
        </div>
      )}
      <div className="flex gap-2 m-2">
        {!fetchedPopup && (
          <Button onClick={handleSavePopup} disabled={loading}>
            {loading && !fetchedPopup ? <Loader /> : "Salvar"}
          </Button>
        )}

        {fetchedPopup && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button
              onClick={handleDeletePopup}
              isHoverInvalid
              disabled={loading}
            >
              {loading && fetchedPopup ? <Loader /> : "Excluir"}
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
