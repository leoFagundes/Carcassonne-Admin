import { ReactNode } from "react";
import { createPortal } from "react-dom";

interface PrintModalProps {
  isOpen: boolean;
  onClose: VoidFunction;
  children: ReactNode;
}

export default function PrintModal({
  isOpen,
  onClose,
  children,
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

      {/* Botão fechar */}
      <div
        onClick={onClose}
        className="absolute right-2 bottom-2 text-black p-2 cursor-pointer border rounded shadow-md w-6 h-6 flex justify-center items-center z-10"
      >
        X
      </div>

      {/* Botão imprimir */}
      <div
        onClick={() => {
          window.print();
          onClose();
        }}
        className="absolute right-10 bottom-2 text-black p-2 cursor-pointer border rounded shadow-md w-fit h-6 flex justify-center items-center z-10"
      >
        imprimir
      </div>
    </div>,
    document.body
  );
}
