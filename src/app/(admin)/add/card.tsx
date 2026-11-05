import React, { ReactNode } from "react";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";

interface CardProps {
  title: string;
  description: string;
  icon: ReactNode;
  /** Página (com o formulário já aberto, quando houver) para onde o atalho leva. */
  href: string;
  /** Nome da página de destino, mostrado no rodapé do card. */
  destination: string;
}

export default function Card({ title, description, icon, href, destination }: CardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col w-[210px] rounded-xl border border-primary-gold/20 hover:border-primary-gold/50 bg-secondary-black/40 p-4 cursor-pointer transition-all duration-200 gap-3 text-primary-gold"
    >
      <div className="p-2 rounded-lg bg-primary-gold/10 border border-primary-gold/15 w-fit group-hover:bg-primary-gold/15 transition-all">
        {icon}
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        <p className="text-xs text-primary-gold/50 font-light leading-relaxed">{description}</p>
      </div>
      <span className="flex items-center gap-1 text-[11px] text-primary-gold/40 group-hover:text-primary-gold/75 transition-colors">
        Em {destination}
        <LuArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
