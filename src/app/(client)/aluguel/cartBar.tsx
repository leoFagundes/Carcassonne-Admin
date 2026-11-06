"use client";

import Link from "next/link";
import { LuArrowRight, LuShoppingBag } from "react-icons/lu";
import { formatBRL } from "@/rental/money";

/** Barra fixa no catálogo quando há jogos escolhidos: leva direto ao pedido. */
export default function CartBar({ count, total }: { count: number; total: number }) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 left-3 right-16 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 sm:w-[420px]">
      <Link
        href="/aluguel/pedido"
        className="flex items-center gap-3 h-14 pl-4 pr-3 rounded-2xl bg-primary-gold text-primary-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:brightness-105 transition"
      >
        <span className="relative flex items-center justify-center">
          <LuShoppingBag size={20} />
          <span className="absolute -top-2 -right-2.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-black text-primary-gold text-[10px] font-bold">
            {count}
          </span>
        </span>
        <span className="flex flex-col leading-tight min-w-0 ml-1">
          <span className="text-sm font-bold truncate">Ver pedido</span>
          <span className="text-[11px] opacity-75 truncate">
            {count} {count === 1 ? "jogo" : "jogos"} · {formatBRL(total)}
          </span>
        </span>
        <LuArrowRight size={18} className="ml-auto shrink-0" />
      </Link>
    </div>
  );
}
