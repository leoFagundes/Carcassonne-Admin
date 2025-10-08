"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { PrintProps } from "./page";
import { LuPrinter, LuSkipBack, LuX } from "react-icons/lu";

interface PrintModalProps {
  isOpen: boolean;
  onClose: VoidFunction;
  children: ReactNode;
  printConfigs: PrintProps;
  setPrintConfigs: React.Dispatch<React.SetStateAction<PrintProps>>;
}

export default function PrintModal({
  isOpen,
  onClose,
  children,
  printConfigs,
  setPrintConfigs,
}: PrintModalProps) {
  useEffect(() => {
    const saved = localStorage.getItem("printConfigs");
    if (saved) {
      setPrintConfigs(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("printConfigs", JSON.stringify(printConfigs));
  }, [printConfigs]);

  const handleOpacityChange = (value: string) => {
    const num = Math.min(1, Math.max(0, parseFloat(value) || 0));
    setPrintConfigs({
      ...printConfigs,
      printWaterMarkOpacity: num,
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed top-0 left-0 w-screen h-screen bg-primary-white z-[9999] flex flex-col ${printConfigs.printPosition === "top" ? "justify-start" : "justify-center"}  p-8`}
    >
      {/* Marca d'água */}
      {printConfigs.printWaterMark && (
        <img
          src="images/logo-clean.png"
          alt="logo"
          className="absolute top-0 left-0 w-full h-full object-contain opacity-4 pointer-events-none"
          style={{ opacity: printConfigs.printWaterMarkOpacity }}
        />
      )}

      {/* Conteúdo do modal */}
      <div
        className="text-black p-6 rounded-md flex justify-center items-center z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {printConfigs.printTime && (
        <div className="absolute left-2 bottom-2 flex gap-2">
          <span className="font-semibold">Mesas disponíveis:</span>
        </div>
      )}

      {!printConfigs.printTime && (
        <div className="absolute bottom-0 left-0 p-2 w-full flex gap-2 md:gap-4 text-black justify-center z-50 backdrop-blur-2xl">
          <div className="flex flex-wrap gap-1 justify-center">
            <label className="flex items-center gap-2 cursor-pointer text-black px-2 border rounded shadow-md text-sm">
              <input
                type="checkbox"
                checked={printConfigs.printIncludeObservation}
                onChange={() =>
                  setPrintConfigs({
                    ...printConfigs,
                    printIncludeObservation:
                      !printConfigs.printIncludeObservation,
                  })
                }
                className="w-4 h-4"
              />
              Incluir observação
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-black px-2 border rounded shadow-md text-sm">
              <input
                type="checkbox"
                checked={printConfigs.printIncludeChecks}
                onChange={() =>
                  setPrintConfigs({
                    ...printConfigs,
                    printIncludeChecks: !printConfigs.printIncludeChecks,
                  })
                }
                className="w-4 h-4"
              />
              Incluir checks
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-black px-2 border rounded shadow-md text-sm">
              <input
                type="checkbox"
                checked={printConfigs.printSeparateByAge}
                onChange={() =>
                  setPrintConfigs({
                    ...printConfigs,
                    printSeparateByAge: !printConfigs.printSeparateByAge,
                  })
                }
                className="w-4 h-4"
              />
              Separar Adultos e Crianças
            </label>

            <select
              value={printConfigs.printPosition}
              onChange={(e) =>
                setPrintConfigs({
                  ...printConfigs,
                  printPosition: e.target.value as "top" | "center",
                })
              }
              className="border rounded shadow-md text-sm px-2 cursor-pointer"
            >
              <option value="top">Topo</option>
              <option value="center">Centro</option>
            </select>

            <select
              value={printConfigs.printFontSize}
              onChange={(e) =>
                setPrintConfigs({
                  ...printConfigs,
                  printFontSize: e.target.value as "small" | "medium" | "large",
                })
              }
              className="border rounded shadow-md text-sm px-2 cursor-pointer"
            >
              <option value="small">Fonte Pequena</option>
              <option value="medium">Fonte Média</option>
              <option value="large">Fonte Grande</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer text-black px-2 border rounded shadow-md text-sm">
              <input
                type="checkbox"
                checked={printConfigs.printWaterMark}
                onChange={() =>
                  setPrintConfigs({
                    ...printConfigs,
                    printWaterMark: !printConfigs.printWaterMark,
                  })
                }
                className="w-4 h-4"
              />
              Marca d{"'"}água
            </label>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={printConfigs.printWaterMarkOpacity}
                onChange={(e) => handleOpacityChange(e.target.value)}
                className="w-24 cursor-grab"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={printConfigs.printWaterMarkOpacity}
                onChange={(e) => handleOpacityChange(e.target.value)}
                className="w-16 text-center border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <div
              onClick={() => {
                setPrintConfigs({
                  ...printConfigs,
                  printTime: true,
                });
                setTimeout(() => {
                  window.print();
                  onClose();
                  setPrintConfigs({
                    ...printConfigs,
                    printTime: false,
                  });
                }, 200);
              }}
              className="gap-1 text-cyan-900 p-2 cursor-pointer border rounded shadow-md w-28 h-8 flex justify-center items-center z-10"
            >
              <LuPrinter /> Imprimir
            </div>

            <div
              onClick={() => {
                setTimeout(() => {
                  setPrintConfigs({
                    ...printConfigs,
                    printTime: false,
                    printIncludeChecks: false,
                    printIncludeObservation: false,
                    printPosition: "center",
                    printWaterMark: true,
                    printWaterMarkOpacity: 0.04,
                    printFontSize: "small",
                    printSeparateByAge: false,
                  });
                }, 200);
              }}
              className="gap-1 text-cyan-900 p-2 cursor-pointer border rounded shadow-md w-28 h-8 flex justify-center items-center z-10"
            >
              <LuSkipBack /> Resetar
            </div>

            <div
              onClick={() => {
                onClose();
                setPrintConfigs({
                  ...printConfigs,
                  printTime: false,
                });
              }}
              className="gap-1 p-2 cursor-pointer border rounded shadow-md w-28 h-8 flex justify-center items-center z-10 text-invalid-color"
            >
              <LuX /> Fechar
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
