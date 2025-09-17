"use client";

import Button from "@/components/button";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import { GeneralConfigsType } from "@/types";
import {
  daysArray,
  daysMap,
  patternGeneralConfigs,
} from "@/utils/patternValues";
import { auth } from "@/services/firebaseConfig";

import React, { useEffect, useRef, useState } from "react";
import { LuSettings } from "react-icons/lu";
import { onAuthStateChanged } from "firebase/auth";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import ComboRepository from "@/services/repositories/ComboRepository";
import Counter from "@/components/mage-ui/text/counter";
import { DragCards } from "@/app/(admin)/carcassonne/drag-cards";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Input from "@/components/input";
import OptionsInput from "@/components/optionsInput";
import ScrollMural from "./scrollToImage";

export default function SettingsPage() {
  const [localGeneralConfigs, setLocalGeneralConfigs] =
    useState<GeneralConfigsType>(patternGeneralConfigs);
  const [loading, setLoading] = useState(true);

  const [databaseInfo, setDatabaseInfo] = useState({
    currentUserEmail: "",
    boardgamesQuantity: 0,
    menuItemsQuantity: 0,
    menuInfosQuantity: 0,
    menuCombosQuantity: 0,
  });

  const { addAlert } = useAlert();

  const muralRef = useRef<HTMLDivElement>(null);

  const getCurrentUserEmail = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // para evitar múltiplas execuções
        if (user && user.email) {
          resolve(user.email);
        } else {
          reject("Usuário não autenticado.");
        }
      });
    });
  };

  useEffect(() => {
    const fetchGeneralConfigs = async () => {
      try {
        const generalConfigs = await GeneralConfigsRepository.get();

        if (!generalConfigs || !generalConfigs._id) {
          addAlert("ID Inválido.");
          return;
        }

        setLocalGeneralConfigs(generalConfigs);
      } catch (error) {
        addAlert(`Erro ao buscar configurações: ${error}`);
      }
    };

    const fetchDatabaseInfos = async () => {
      setLoading(true);

      try {
        const userEmail = await getCurrentUserEmail();
        const boardgames = await BoardgameRepository.getAll();
        const menuItems = await MenuItemRepository.getAll();
        const menuInfos = await InfoRepository.getAll();
        const menuCombos = await ComboRepository.getAll();

        setDatabaseInfo({
          currentUserEmail: userEmail,
          boardgamesQuantity: boardgames.length,
          menuItemsQuantity: menuItems.length,
          menuInfosQuantity: menuInfos.length,
          menuCombosQuantity: menuCombos.length,
        });
      } catch (error) {
        addAlert(`Erro ao buscar informações do banco de dados: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDatabaseInfos();
    fetchGeneralConfigs();
  }, []);

  const saveGeneralConfigs = async () => {
    try {
      if (!localGeneralConfigs || !localGeneralConfigs._id) {
        addAlert("ID Inválido.");
        return;
      }

      await GeneralConfigsRepository.update({
        ...localGeneralConfigs,
      });

      window.location.reload();
    } catch (error) {
      addAlert(`Erro ao alterar configurações: ${error}`);
    }
  };

  return (
    <section className="flex flex-col gap-8 w-full h-full px-3 pb-8 overflow-y-scroll outline-none">
      {loading && <LoaderFullscreen />}
      <ScrollMural muralRef={muralRef} />

      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuSettings size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold text-center">Extras</h2>
      </section>

      {/* Configs */}
      <section className="flex flex-col items-center flex-wrap gap-4 text-primary-gold">
        <div className="flex flex-wrap w-full gap-3 justify-center pb-12">
          <div className="p-3 rounded-lg shadow-card border w-full sm:max-w-[80%] flex flex-col gap-2">
            {" "}
            <span className="text-lg font-semibold">Banco de dados</span>
            <ul className="list-disc list-inside text-sm flex flex-col gap-1">
              <li>
                <span className="font-semibold">Usuário ativo:</span>{" "}
                {databaseInfo.currentUserEmail || "Não identificado"}
              </li>
              <li>
                <span className="font-semibold">Acervo de jogos:</span>{" "}
                <Counter targetValue={databaseInfo.boardgamesQuantity} />
              </li>
              <li>
                <span className="font-semibold">Itens do cardápio:</span>{" "}
                <Counter targetValue={databaseInfo.menuItemsQuantity} />
              </li>
              <li>
                <span className="font-semibold">Avisos do cardápio:</span>{" "}
                <Counter targetValue={databaseInfo.menuInfosQuantity} />
              </li>
              <li>
                <span className="font-semibold">Combos do cardápio:</span>{" "}
                <Counter targetValue={databaseInfo.menuCombosQuantity} />
              </li>
            </ul>
          </div>
          <div className="p-3 rounded-lg shadow-card border w-full sm:max-w-[80%]">
            <span className="text-lg font-semibold">Efeitos de mouse</span>
            <Checkbox
              checked={localGeneralConfigs?.clickEffect}
              setChecked={(e) =>
                setLocalGeneralConfigs({
                  ...localGeneralConfigs,
                  clickEffect: e.target.checked,
                })
              }
              label="Ativar efeito de clique"
            />
            <Checkbox
              checked={localGeneralConfigs?.followCursor}
              setChecked={(e) =>
                setLocalGeneralConfigs({
                  ...localGeneralConfigs,
                  followCursor: e.target.checked,
                })
              }
              label="Ativar destaque de cursor"
            />
            <Checkbox
              checked={localGeneralConfigs?.canvasCursor}
              setChecked={(e) =>
                setLocalGeneralConfigs({
                  ...localGeneralConfigs,
                  canvasCursor: e.target.checked,
                })
              }
              label="Ativar efeito de cursor"
            />
          </div>
          <div className="flex flex-col items-center gap-6 p-3 pb-6 rounded-lg w-full sm:max-w-[80%] shadow-card border">
            <span className="text-lg font-semibold">
              Configurações de reserva
            </span>
            <div className="flex w-full gap-8 flex-wrap justify-center">
              <div className="flex flex-col gap-8">
                <OptionsInput
                  label="Horários disponíveis"
                  placeholder="Horários disponíveis"
                  values={localGeneralConfigs.enabledTimes}
                  setValues={(values) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      enabledTimes: values,
                    })
                  }
                  withIndex={false}
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <OptionsInput
                  label="Dias da semana inválidos"
                  placeholder="Dias da semana inválidos"
                  values={localGeneralConfigs.disabledDays.map(
                    (day) => daysArray[day]
                  )}
                  options={daysArray}
                  setValues={(values) => {
                    const validNumbers = values
                      .map((v) => {
                        if (typeof v === "string") {
                          const lower = v.toLowerCase();
                          if (daysMap.hasOwnProperty(lower)) {
                            return daysMap[lower];
                          } else {
                            addAlert(`Dia digitado é inválido: "${v}"`);
                            return null;
                          }
                        }
                        if (typeof v === "number" && v >= 0 && v <= 6) {
                          return v;
                        }
                        console.warn(`Número inválido digitado: "${v}"`);
                        return null;
                      })
                      .filter((v): v is number => v !== null);

                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      disabledDays: validNumbers,
                    });
                  }}
                  withIndex={false}
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
              </div>
              <div className="flex flex-col gap-8">
                <Input
                  placeholder="Capacidade máxima em um dia"
                  label="Capacidade máxima em um dia"
                  value={localGeneralConfigs.maxCapacityInDay.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      maxCapacityInDay: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <Input
                  placeholder="Capacidade máxima em uma reserva"
                  label="Capacidade máxima em uma reserva"
                  value={localGeneralConfigs.maxCapacityInReserve.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      maxCapacityInReserve: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <Input
                  placeholder="Permitido fazer reserva em até (meses)"
                  label="Permitido fazer reserva em até (meses)"
                  value={localGeneralConfigs.maxMonthsInAdvance.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      maxMonthsInAdvance: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <Input
                  placeholder="Aceitar reservas até (hora cheia)"
                  label="Aceitar reservas até (hora cheia)"
                  value={localGeneralConfigs.hoursToCloseReserve.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      hoursToCloseReserve: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
              </div>
            </div>
          </div>
          <div
            ref={muralRef}
            className="w-full flex flex-col items-center gap-1"
          >
            <span className="text-center font-semibold text-lg">
              Mural de fotos do Carcassonne
            </span>
            <DragCards />
          </div>
        </div>
        <div className="flex justify-center w-full absolute bg-primary-black/50 backdrop-blur-[5px] bottom-0 z-80 py-4 ">
          <div className="w-fit">
            <Button onClick={saveGeneralConfigs}>Salvar configurações</Button>
          </div>
        </div>
      </section>
    </section>
  );
}
