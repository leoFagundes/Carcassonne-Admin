"use client";

import React, { ComponentProps, ReactNode, useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";

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
  smallInput?: boolean;
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
  smallInput = false,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [inFocus, setInFocus] = useState(false);
  // Foco/saída de quem usa o campo também são chamados (ex: abrir sugestões)
  const { onFocus, onBlur, ...inputProps } = props;

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
            <span key={i} className="text-primary-gold font-semibold">
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
      className={`group relative flex gap-2.5 w-full max-w-[400px] ${width} rounded-xl border text-sm bg-primary-black/55 transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary-gold/40 focus-within:border-primary-gold/70 focus-within:bg-primary-black/80 focus-within:shadow-[0_0_0_3px_rgba(230,197,107,0.12)] ${
        variant ? "border-primary-gold/30" : "border-primary-gold/15"
      } ${
        smallInput
          ? "py-[5px] px-2.5"
          : "py-2.5 sm:py-3 px-3 sm:px-3.5 min-w-[200px]"
      } ${multiline ? "items-start" : "items-center"}`}
    >
      {label && value && (
        <span className="ui-float-label absolute bottom-[calc(100%+5px)] left-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70 pointer-events-none">
          {label}
        </span>
      )}
      {icon && (
        <span
          className={`flex shrink-0 text-primary-gold/45 transition-colors group-focus-within:text-primary-gold ${
            multiline ? "mt-0.5" : ""
          }`}
        >
          {icon}
        </span>
      )}
      {multiline ? (
        <textarea
          {...(props as ComponentProps<"textarea">)}
          rows={rows}
          className="w-full h-full text-primary-white placeholder:text-primary-gold/35 caret-primary-gold outline-none resize-none bg-transparent leading-relaxed"
          value={value}
          onChange={(e) => setValue(e)}
          placeholder={placeholder}
        />
      ) : (
        <input
          {...inputProps}
          autoComplete="off"
          className="w-full h-full text-primary-white placeholder:text-primary-gold/35 caret-primary-gold outline-none bg-transparent"
          value={value}
          onChange={(e) => setValue(e)}
          placeholder={placeholder}
          onFocus={(e) => {
            setInFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setTimeout(() => {
              setInFocus(false);
            }, 150);
            onBlur?.(e);
          }}
          type={isPasswordVisible ? "text" : type}
        />
      )}
      {!multiline && type === "password" && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={isPasswordVisible ? "Esconder a senha" : "Mostrar a senha"}
          className="flex shrink-0 cursor-pointer text-primary-gold/50 hover:text-primary-gold transition-colors"
          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
        >
          {isPasswordVisible ? <LuEye size={16} /> : <LuEyeOff size={16} />}
        </button>
      )}
      {filteredOptions.length > 0 && !options?.includes(value) && inFocus && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 flex flex-col gap-0.5 w-full max-h-[180px] overflow-y-auto p-1 rounded-xl border border-primary-gold/25 bg-secondary-black/95 backdrop-blur-md shadow-[0_14px_36px_rgba(0,0,0,0.55)]">
          {filteredOptions.map((option, index) => (
            <div
              className="px-3 py-2 rounded-lg text-sm text-primary-gold/75 cursor-pointer hover:bg-primary-gold/10 hover:text-primary-gold transition-colors"
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
