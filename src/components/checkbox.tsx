import React, { ReactNode } from "react";
import { LuCheck } from "react-icons/lu";

interface CheckboxType {
  checked: boolean;
  setChecked: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  variant?: boolean;
  width?: string;
  withoutBackground?: boolean;
  /** Ícone à direita, dentro do campo (ex: olho, destaque, vegano) */
  icon?: ReactNode;
}

export default function Checkbox({
  checked,
  setChecked,
  label,
  variant = false,
  width = "w-auto",
  withoutBackground = false,
  icon,
}: CheckboxType) {
  return (
    <label
      htmlFor={label}
      className={`group relative flex items-center gap-3 max-w-[400px] min-w-[200px] ${width} w-full cursor-pointer select-none rounded-xl text-sm text-primary-gold transition-[border-color,background-color] duration-200 ${
        withoutBackground
          ? "bg-transparent"
          : variant && checked
            ? "bg-primary-gold/[0.07]"
            : "bg-primary-black/55"
      } ${
        variant
          ? `border px-3.5 py-2.5 sm:py-3 ${
              checked
                ? "border-primary-gold/50"
                : "border-primary-gold/20 hover:border-primary-gold/40"
            }`
          : withoutBackground
            ? "py-2"
            : "px-3 py-2 sm:py-2.5"
      }`}
    >
      <input
        name={label}
        id={label}
        className="peer sr-only"
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e)}
      />
      {/* Caixinha: fica dourada com o check quando marcada */}
      <span
        aria-hidden="true"
        className="flex items-center justify-center w-5 h-5 shrink-0 rounded-md border border-primary-gold/40 bg-primary-black/60 transition-all duration-200 group-hover:border-primary-gold/75 peer-checked:bg-primary-gold peer-checked:border-primary-gold peer-focus-visible:shadow-[0_0_0_3px_rgba(230,197,107,0.25)]"
      >
        <LuCheck
          size={13}
          strokeWidth={3.5}
          className={`text-primary-black transition-transform duration-200 ${
            checked ? "scale-100" : "scale-0"
          }`}
        />
      </span>
      <span className="leading-snug">{label}</span>
      {icon && (
        // key: reanima quando marca/desmarca (o ícone pode trocar junto)
        <span
          key={String(checked)}
          aria-hidden="true"
          className={`ui-pop ml-auto flex items-center justify-center shrink-0 w-7 h-7 -my-1 rounded-lg transition-colors ${
            checked
              ? "bg-primary-gold/15 text-primary-gold"
              : "text-primary-gold/40"
          }`}
        >
          {icon}
        </span>
      )}
    </label>
  );
}
