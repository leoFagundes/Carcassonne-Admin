"use client";

import Button from "@/components/button";
import Input from "@/components/input";
import Loader from "@/components/loader";
import { useAlert } from "@/contexts/alertProvider";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { ReserveType } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuCalendar, LuClock } from "react-icons/lu";

export default function CancelReserve() {
  const [code, setCode] = useState("");
  const [allReserves, setAllReserves] = useState<ReserveType[]>([]);
  const [reserve, setReserve] = useState<ReserveType>();
  const [componentLoading, setcomponentLoading] = useState(false);

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

  useEffect(() => {
    const findReserve = allReserves.filter(
      (reserve) =>
        reserve.code.replace(/^#/, "").toLowerCase() ===
        code.replace(/^#/, "").toLowerCase()
    );

    if (findReserve.length >= 1) {
      setReserve(findReserve[0]);
    } else {
      setReserve(undefined);
    }
  }, [code]);

  async function handleCancelReserve() {
    const normalizedCode = code.trim().replace(/^#/, "").toLowerCase();

    const reserveFound = allReserves.find(
      (reserve) => reserve.code.toLowerCase() === normalizedCode
    );

    if (!reserveFound) {
      addAlert("Nenhuma reserva encontrada com esse código.");
      return;
    }
    setcomponentLoading(true);
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
    } finally {
      setcomponentLoading(false);
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
        {reserve ? (
          <div>
            <div className="flex flex-col gap-2 p-3 border border-dashed rounded">
              <span className="font-semibold">#{reserve.code}</span>
              <span className="flex items-center gap-2">
                <LuCalendar size={18} className="min-w-[18px]" />
                Reserva de {reserve.name}
              </span>
              <span className="flex items-center gap-2">
                <LuClock size={18} className="min-w-[18px]" />
                <span className="text-primary-gold">
                  {reserve.bookingDate.day}/{reserve.bookingDate.month}/
                  {reserve.bookingDate.year} - {reserve.time}
                </span>
              </span>
            </div>
          </div>
        ) : code ? (
          <span>Nenhuma reserva encontrada...</span>
        ) : (
          ""
        )}

        <div className="flex gap-2">
          <Button onClick={() => router.push("/reserve")}>Voltar</Button>
          <Button onClick={handleCancelReserve}>
            {componentLoading ? <Loader /> : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
