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
import LoaderFullscreen from "@/components/loaderFullscreen";
import Input from "@/components/input";
import OptionsInput from "@/components/optionsInput";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const createimage = params.get("createimage");

    if (createimage === "true") {
      muralRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
    <section className="flex flex-col gap-5 w-full h-full pb-20 overflow-y-auto outline-none">
      {loading && <LoaderFullscreen />}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 w-full">
          <LuSettings size={32} className="text-primary-gold/70 shrink-0" />
          <h1 className="text-3xl font-semibold text-primary-gold">
            Configurações
          </h1>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      {/* Configs */}
      <section className="flex flex-col items-center gap-4 text-primary-gold">
        <div className="flex flex-col w-full gap-4 max-w-[720px]">
          {/* Database info */}
          <div className="rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Banco de dados
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-0.5 bg-primary-black/30 rounded-lg p-3 col-span-2 sm:col-span-3">
                <span className="text-[10px] text-primary-gold/40 uppercase tracking-widest">
                  Usuário ativo
                </span>
                <span className="text-sm text-primary-gold/80 truncate">
                  {databaseInfo.currentUserEmail || "Não identificado"}
                </span>
              </div>
              {[
                { label: "Jogos", value: databaseInfo.boardgamesQuantity },
                {
                  label: "Itens cardápio",
                  value: databaseInfo.menuItemsQuantity,
                },
                { label: "Avisos", value: databaseInfo.menuInfosQuantity },
                { label: "Combos", value: databaseInfo.menuCombosQuantity },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 bg-primary-black/30 rounded-lg p-3"
                >
                  <span className="text-[10px] text-primary-gold/40 uppercase tracking-widest">
                    {label}
                  </span>
                  <span className="text-xl font-semibold text-primary-gold">
                    <Counter targetValue={value} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mouse effects */}
          <div className="rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Efeitos de mouse
            </span>
            <div className="flex flex-col gap-2">
              <Checkbox
                checked={localGeneralConfigs?.clickEffect}
                setChecked={(e) =>
                  setLocalGeneralConfigs({
                    ...localGeneralConfigs,
                    clickEffect: e.target.checked,
                  })
                }
                label="Ativar efeito de clique"
                variant
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
                variant
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
                variant
              />
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 pb-6 w-full">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
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
                    (day) => daysArray[day],
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
          {/* <div
            ref={muralRef}
            className="w-full flex flex-col items-center gap-1"
          >
            <span className="text-center font-semibold text-lg">
              Mural de fotos do Carcassonne
            </span>
            <DragCards />
          </div> */}
        </div>
        {/* Save footer */}
        <div className="absolute w-fit mx-auto px-6 bottom-0 left-0 right-0 flex justify-center py-3 bg-primary-black/80 backdrop-blur-[6px] border-t border-primary-gold/10 z-50">
          <Button onClick={saveGeneralConfigs}>Salvar configurações</Button>
        </div>
      </section>
    </section>
  );
}
