"use client";

import React, { ComponentProps, ReactNode, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface InputProps extends ComponentProps<"input"> {
  value: string;
  setValue: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  icon?: ReactNode;
  placeholder: string;
  label?: string;
  variant?: boolean;
  multiline?: boolean;
  options?: string[];
  rows?: number;
  width?: string;
}

export default function Input({
  value,
  setValue,
  icon,
  type = "text",
  placeholder,
  label,
  variant = false,
  multiline = false,
  options,
  rows = 5,
  width = "w-auto",
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [inFocus, setInFocus] = useState(false);

  const filteredOptions =
    options?.filter((option) =>
      option.toLowerCase().includes(value.toLowerCase())
    ) || [];

  function highlightMatch(text: string, search: string = "") {
    if (!search) return <>{text}</>;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <span key={i} className="text-secondary-gold">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  }

  return (
    <div
      className={`relative flex items-center max-w-[400px] min-w-[200px] ${width} bg-primary-black/80 py-2 px-3 sm:py-3 sm:px-4 rounded-sm text-sm gap-2 w-full shadow-card ${
        variant && "border border-primary-gold"
      } ${multiline ? "items-start" : "items-center"}`}
    >
      {label && value && (
        <span className="absolute bottom-full left-1 text-xs text-gradient-gold font-semibold">
          {label}
        </span>
      )}
      {icon && icon}
      {multiline ? (
        <textarea
          {...(props as ComponentProps<"textarea">)}
          rows={rows}
          className="px-1 w-full h-full rounded-md text-white placeholder:text-primary-gold/60 outline-none resize-none bg-transparent"
          value={value}
          onChange={(e) => setValue(e)}
          placeholder={placeholder}
        />
      ) : (
        <input
          {...props}
          autoComplete="off"
          className="px-1 w-full h-full rounded-md text-white placeholder:text-primary-gold/60 outline-none bg-transparent"
          value={value}
          onChange={(e) => setValue(e)}
          placeholder={placeholder}
          onFocus={() => setInFocus(true)}
          onBlur={() =>
            setTimeout(() => {
              setInFocus(false);
            }, 150)
          }
          type={isPasswordVisible ? "text" : type}
        />
      )}
      {!multiline && type === "password" && (
        <div
          className="cursor-pointer text-primary-gold"
          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
        >
          {isPasswordVisible ? <FiEye /> : <FiEyeOff />}
        </div>
      )}
      {filteredOptions.length > 0 && !options?.includes(value) && inFocus && (
        <div className="flex flex-col gap-2 max-h-[120px] overflow-y-scroll absolute top-full z-50 border w-full left-0 rounded shadow-card p-2 bg-primary-black">
          {filteredOptions.map((option, index) => (
            <div
              className="py-1 px-2 rounded-sm border border-dashed cursor-pointer hover:text-secondary-gold transition-all duration-200 ease-in"
              key={index}
              onClick={() =>
                setValue({
                  target: { value: option },
                } as React.ChangeEvent<HTMLInputElement>)
              }
            >
              <span>{highlightMatch(option, value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
