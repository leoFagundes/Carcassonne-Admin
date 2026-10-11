"use client";

import { InfoType } from "@/types";
import { ComponentProps, useEffect, useRef, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { prefersReducedMotion } from "@/components/showcase/motion";

interface InfoCardProps extends ComponentProps<"div"> {
  info: InfoType;
}

interface ParsedPrice {
  prefix: string;
  suffix: string;
  decimals: number;
  value: number;
}

/** "R$ 1.250,90" → prefixo, valor e casas decimais (para animar a contagem). */
function parsePrice(text: string): ParsedPrice | null {
  const match = text.trim().match(/^(\D*?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(\D*)$/);
  if (!match) return null;
  const [, prefix, integer, cents = "", suffix] = match;
  return {
    prefix,
    suffix,
    decimals: cents.length,
    value: Number(integer.replace(/\./g, "")) + (cents ? Number(cents) / 10 ** cents.length : 0),
  };
}

function formatPrice(value: number, { prefix, suffix, decimals }: ParsedPrice) {
  const number = value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${number}${suffix}`;
}

/**
 * Preço de promoção (de → por): quando o aviso aparece na tela, um risco
 * passa no preço antigo e o novo surge "descendo" até o valor final.
 */
function PromoPrice({ from, to }: { from: string; to: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setPlayed(true);
      return;
    }

    let frame = 0;
    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setPlayed(true);

        const start = parsePrice(from);
        const end = parsePrice(to);
        const element = valueRef.current;
        if (!start || !end || !element || start.value === end.value) return;
        // Começa do preço antigo e desce até o novo, depois que o risco passa
        element.textContent = formatPrice(start.value, end);
        timer = window.setTimeout(() => {
          const startedAt = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - startedAt) / 1100);
            const eased = 1 - Math.pow(1 - t, 3);
            element.textContent =
              t < 1 ? formatPrice(start.value + (end.value - start.value) * eased, end) : to;
            if (t < 1) frame = requestAnimationFrame(step);
          };
          frame = requestAnimationFrame(step);
        }, 450);
      },
      { threshold: 0.6 },
    );
    observer.observe(box);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [from, to]);

  return (
    <div
      ref={boxRef}
      className={`cm-promo ${played ? "cm-promo-on" : ""} flex items-center gap-2 mt-1`}
    >
      <span className="cm-promo-old relative font-semibold text-sm text-primary-gold/50">
        {from}
      </span>
      <FiArrowRight className="cm-promo-arrow text-primary-gold/60 shrink-0" size="15px" />
      <span className="cm-promo-new font-semibold text-lg text-primary-gold tabular-nums">
        {/* key: se o valor mudar, o texto animado é recriado */}
        <span key={to} ref={valueRef}>
          {to}
        </span>
      </span>
    </div>
  );
}

export default function InfoCard({ info, ...props }: InfoCardProps) {
  return (
    <div
      {...props}
      className="group w-full mb-3 rounded-xl border border-primary-gold/20 bg-primary-black/30 hover:border-primary-gold/40 hover:bg-primary-black/50 transition-all duration-300 overflow-hidden"
    >
      <div className="flex">
        {/* Accent left bar */}
        <div
          className="w-[3px] shrink-0 rounded-l-xl"
          style={{
            background: "linear-gradient(to bottom, #e6c56b, #d4af37)",
          }}
        />
        <div className="flex flex-col gap-1.5 px-4 py-3 flex-1">
          <span className="font-bold text-base sm:text-lg leading-tight">
            {info.name}
          </span>
          {info.description && (
            <p className="text-xs sm:text-sm text-primary-gold/65 leading-relaxed">
              {info.description}
            </p>
          )}
          {info.values.length === 2 ? (
            <PromoPrice from={info.values[0]} to={info.values[1]} />
          ) : (
            info.values.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                {info.values.map((value, index) => (
                  <span key={index} className="font-semibold text-lg text-primary-gold">
                    {value}
                  </span>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
