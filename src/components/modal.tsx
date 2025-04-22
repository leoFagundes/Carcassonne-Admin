import React, { ReactNode } from "react";
import { FiSkipBack } from "react-icons/fi";

interface ModalProps {
  isOpen: boolean;
  onClose: VoidFunction;
  children: ReactNode;
}

export default function Modal({ children, isOpen, onClose }: ModalProps) {
  return (
    <>
      {isOpen && (
        <div className="flex justify-center items-center absolute top-0 left-0 w-full h-full rounded backdrop-blur-[5px] z-50">
          <div className="bg-primary-black w-full h-full rounded p-12 flex flex-col items-center">
            <span
              onClick={onClose}
              className="absolute flex items-center gap-2 cursor-pointer top-5 left-5"
            >
              <FiSkipBack /> Voltar
            </span>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
