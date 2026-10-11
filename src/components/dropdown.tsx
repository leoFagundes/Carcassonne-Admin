import React from "react";
import { LuChevronDown } from "react-icons/lu";

interface DropdownType {
  options: string[];
  value: string;
  setValue: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  firstLabel: string;
  variant?: boolean;
  label?: string;
  width?: string;
}

export default function Dropdown({
  value,
  setValue,
  options,
  firstLabel,
  label,

  variant = false,
  width = "w-auto",
}: DropdownType) {
  return (
    <div className={`relative max-w-[400px] min-w-[200px] ${width} w-full`}>
      {label && value && (
        <span className="ui-float-label absolute bottom-[calc(100%+5px)] left-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70 pointer-events-none">
          {label}
        </span>
      )}

      <select
        className={`peer cursor-pointer appearance-none w-full outline-none rounded-xl border bg-primary-black text-sm py-2.5 sm:py-3 pl-3 sm:pl-3.5 pr-10 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-primary-gold/40 focus:border-primary-gold/70 focus:shadow-[0_0_0_3px_rgba(230,197,107,0.12)] [&>option]:bg-secondary-black [&>option]:text-primary-white ${
          value ? "text-primary-white" : "text-primary-gold/45"
        } ${variant ? "border-primary-gold/30" : "border-primary-gold/15"}`}
        value={value}
        onChange={(e) => setValue(e)}
      >
        <option value={""}>{firstLabel}</option>
        {options.map((option, index) => (
          <option value={option} key={index}>
            {option}
          </option>
        ))}
      </select>
      <LuChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary-gold/50 transition-colors peer-hover:text-primary-gold/80 peer-focus:text-primary-gold"
      />
    </div>
  );
}
