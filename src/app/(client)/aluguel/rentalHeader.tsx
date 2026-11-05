"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { LuShoppingBag } from "react-icons/lu";
import { auth } from "@/services/firebaseConfig";

/** Barra de atalhos do aluguel: regras, conta e o contador do pedido. */
export default function RentalHeader({ cartCount }: { cartCount: number }) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => setLoggedIn(!!user)), []);

  const link =
    "flex items-center h-8 px-3 rounded-full border border-primary-gold/20 hover:border-primary-gold/50 text-xs text-primary-gold/75 hover:text-primary-gold transition-colors";

  return (
    <nav
      aria-label="Aluguel de jogos"
      className="flex items-center justify-between gap-2 w-full max-w-3xl mx-auto px-4 pb-1.5"
    >
      <span className="font-cinzel text-[11px] tracking-[0.25em] uppercase text-primary-gold/60 truncate">
        Aluguel de jogos
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <Link href="/aluguel/regras" className={link}>
          Regras
        </Link>
        <Link href={loggedIn ? "/aluguel/minha-conta" : "/aluguel/entrar"} className={link}>
          {loggedIn ? "Minha conta" : "Entrar"}
        </Link>
        <Link
          href="/aluguel/pedido"
          aria-label={`Pedido: ${cartCount} ${cartCount === 1 ? "jogo" : "jogos"}`}
          className={`${link} relative gap-1.5 !px-2.5`}
        >
          <LuShoppingBag size={14} />
          {cartCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-gold text-primary-black text-[10px] font-bold">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
