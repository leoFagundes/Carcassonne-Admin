"use client";

import { LuVegan } from "react-icons/lu";
import DetailSheet from "@/components/showcase/detailSheet";
import type { MenuItemType } from "@/types";

const PLACEHOLDER_IMAGE = "/images/placeholder-menu.svg";

/** Detalhe de um item do cardápio (gaveta no celular, cartão no computador). */
export default function ItemSheet({
  item,
  origin,
  onClosed,
}: {
  item: MenuItemType;
  /** Foto do card tocado — de onde a foto sai voando. */
  origin: HTMLElement | null;
  onClosed: () => void;
}) {
  return (
    <DetailSheet
      image={item.image}
      placeholder={PLACEHOLDER_IMAGE}
      title={item.name}
      subtitle={item.value || undefined}
      origin={origin}
      onClosed={onClosed}
      badges={
        <>
          {item.isFocus && (
            <span className="px-2 py-0.5 bg-primary-gold text-primary-black text-xs font-bold rounded-full">
              Destaque
            </span>
          )}
          {item.isVegan && (
            <div className="p-1.5 bg-primary-black/70 backdrop-blur-sm rounded-full border border-primary-gold/30 w-fit">
              <LuVegan size={18} className="text-primary-gold" />
            </div>
          )}
        </>
      }
    >
      {item.description && (
        <p className="text-sm text-primary-gold/85 whitespace-pre-line leading-relaxed">
          {item.description}
        </p>
      )}

      {item.sideDish && item.sideDish.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
            Acompanhamentos
          </span>
          <ul className="flex flex-col gap-1.5">
            {item.sideDish.map((dish, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-primary-gold/80">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                {dish}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.observation && (item.observation.length > 0 || item.isVegan) && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
            Observações
          </span>
          <ul className="flex flex-col gap-1.5">
            {item.observation.map((observation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-primary-gold/80">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                {observation}
              </li>
            ))}
            {item.isVegan && (
              <li className="flex items-start gap-2 text-sm text-primary-gold/80">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                Item vegano
              </li>
            )}
          </ul>
        </div>
      )}
    </DetailSheet>
  );
}
