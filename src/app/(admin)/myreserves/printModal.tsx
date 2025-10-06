import { ReactNode } from "react";
import { createPortal } from "react-dom";

interface PrintModalProps {
  isOpen: boolean;
  onClose: VoidFunction;
  children: ReactNode;
  printTime: boolean;
  printIncludeChecks: boolean;
  printIncludeObservation: boolean;
  setPrintTime: React.Dispatch<React.SetStateAction<boolean>>;
  setPrintIncludeChecks: React.Dispatch<React.SetStateAction<boolean>>;
  setPrintIncludeObservation: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function PrintModal({
  isOpen,
  onClose,
  children,
  printTime,
  printIncludeChecks,
  printIncludeObservation,
  setPrintTime,
  setPrintIncludeChecks,
  setPrintIncludeObservation,
}: PrintModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen bg-primary-white z-[9999] flex flex-col justify-center p-8">
      {/* Marca d'água */}
      <img
        src="images/logo-clean.png"
        alt="logo"
        className="absolute top-0 left-0 w-full h-full object-contain opacity-4 pointer-events-none"
      />

      {/* Conteúdo do modal */}
      <div
        className="text-black p-6 rounded-md flex justify-center items-center z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {printTime && (
        <div className="absolute left-2 bottom-2 flex gap-2">
          <span className="font-semibold">Mesas disponíveis:</span>
        </div>
      )}

      {!printTime && (
        <div className="absolute right-2 bottom-2 flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-black px-2 border rounded shadow-md text-sm">
            <input
              type="checkbox"
              checked={printIncludeObservation}
              onChange={() =>
                setPrintIncludeObservation(!printIncludeObservation)
              }
              className="w-4 h-4"
            />
            Incluir observação
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-black px-2 border rounded shadow-md text-sm">
            <input
              type="checkbox"
              checked={printIncludeChecks}
              onChange={() => setPrintIncludeChecks(!printIncludeChecks)}
              className="w-4 h-4"
            />
            Incluir checks
          </label>

          {/* Botão imprimir */}
          <div
            onClick={() => {
              setPrintTime(true);

              setTimeout(() => {
                window.print();
                onClose();
                setPrintTime(false);
                setPrintIncludeChecks(false);
                setPrintIncludeObservation(false);
              }, 200);
            }}
            className="text-black p-2 cursor-pointer border rounded shadow-md w-fit h-6 flex justify-center items-center z-10"
          >
            imprimir
          </div>

          {/* Botão fechar */}
          <div
            onClick={onClose}
            className=" text-black p-2 cursor-pointer border rounded shadow-md w-6 h-6 flex justify-center items-center z-10"
          >
            X
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
