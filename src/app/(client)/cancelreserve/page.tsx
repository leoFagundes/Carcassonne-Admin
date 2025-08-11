"use client";

import Button from "@/components/button";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { ReserveType } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CancelReserve() {
  const [code, setCode] = useState("");
  const [allReserves, setAllReserves] = useState<ReserveType[]>([]);

  const { addAlert } = useAlert();
  const router = useRouter();

  useEffect(() => {
    async function fetchReserves() {
      try {
        const reserves = await ReserveRepository.getAll();
        setAllReserves(reserves);
        console.log(reserves);
      } catch (error) {
        console.error(error);
      }
    }

    fetchReserves();
  }, []);

  async function handleCancelReserve() {
    const normalizedCode = code.trim().replace(/^#/, "").toLowerCase();

    const reserveFound = allReserves.find(
      (reserve) => reserve.code.toLowerCase() === normalizedCode
    );

    if (!reserveFound) {
      addAlert("Nenhuma reserva encontrada com esse código.");
      return;
    }

    try {
      await ReserveRepository.update(reserveFound.id!, {
        ...reserveFound,
        status: "canceled",
      });

      setAllReserves((prev) =>
        prev.map((r) =>
          r.id === reserveFound.id ? { ...r, status: "canceled" } : r
        )
      );

      addAlert(`Reserva ${reserveFound.code} cancelada com sucesso.`);
      setCode("");
    } catch (error) {
      console.error(error);
      addAlert("Erro ao cancelar a reserva. Tente novamente.");
    }
  }

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center text-primary-gold">
      <div className="flex flex-col gap-4 max-w-[400px] p-4">
        <span className="sm:text-2xl text-xl text-center font-semibold">
          CANCELAR UMA RESERVA
        </span>
        <span className="text-center text-xs">
          Para cancelar uma reserva digite o código da reserva recebido por
          email. Ex: AAA0123
        </span>
        <Input
          label="Código da reserva"
          placeholder="Código da reserva"
          value={code}
          setValue={(e) => setCode(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={() => router.push("/reserve")}>Voltar</Button>
          <Button onClick={handleCancelReserve}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}
