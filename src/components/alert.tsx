"use client";

import { useAlert } from "@/contexts/alertProvider";

export default function PageExample() {
  const { addAlert } = useAlert();

  return (
    <div className="p-8">
      <button
        onClick={() => addAlert("Novo alerta enviado!")}
        className="bg-primary-gold text-black px-4 py-2 rounded-md"
      >
        Mostrar Alerta
      </button>
    </div>
  );
}
