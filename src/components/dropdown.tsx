import React, { ReactNode } from "react";
import { IoIosArrowDown } from "react-icons/io";

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
    <div className={` relative max-w-[400px] min-w-[200px] ${width} w-full`}>
      {label && (
        <span className="absolute bottom-full left-1 text-xs text-gradient-gold font-semibold">
          {label}
        </span>
      )}

      <select
        className={`cursor-pointer appearance-none flex items-center w-full outline-none text-primary-gold bg-primary-black py-2 px-3 sm:py-3 sm:px-4 rounded-sm text-sm gap-2 shadow-card ${
          variant && "border border-primary-gold"
        }`}
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
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-primary-gold">
        <IoIosArrowDown />
      </div>
    </div>
  );
}
