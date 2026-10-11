"use client";

import { useAlert } from "@/contexts/alertProvider";
import React, { useState } from "react";
import { LuCheck, LuSendHorizontal, LuX } from "react-icons/lu";

interface OptionsInputType {
  values: string[] | undefined;
  setValues: (values: string[]) => void;
  variant?: boolean;
  width?: string;
  placeholder: string;
  label?: string;
  limit?: number;
  options?: string[];
  withIndex?: boolean;
}

export default function OptionsInput({
  values,
  setValues,
  placeholder,
  label,
  variant = false,
  width = "w-auto",
  limit = 9999999999999,
  options,
  withIndex = true,
}: OptionsInputType) {
  const [inFocus, setInFocus] = useState(false);
  const [useCommaSeparator, setUseCommaSeparator] = useState(true);

  const { addAlert } = useAlert();

  const [value, setValue] = useState("");

  function sendValueToList() {
    if (!values || value.trim() === "") return;

    const newItems = useCommaSeparator
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "")
      : [value.trim()];

    if (values.length + newItems.length > limit) {
      addAlert(`O limite é de ${limit} itens!`);
      return;
    }

    setValues([...values, ...newItems]);
    setValue("");
  }

  function removeValueFromList(indexByProps: number) {
    if (!values) return;

    const newValues = values.filter((_, index) => index !== indexByProps);
    setValues(newValues);
  }

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
    // Com label, o botão de vírgula é mais alto que um label comum: o mt
    // evita que ele encoste no campo de cima
    <div className={label ? "mt-2.5" : ""}>
      <div
        className={`group relative flex items-center max-w-[400px] min-w-[200px] ${width} w-full rounded-xl border text-sm gap-2 py-2 pl-3 pr-2 sm:pl-3.5 bg-primary-black/55 transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary-gold/40 focus-within:border-primary-gold/70 focus-within:bg-primary-black/80 focus-within:shadow-[0_0_0_3px_rgba(230,197,107,0.12)] ${
          variant ? "border-primary-gold/30" : "border-primary-gold/15"
        }`}
      >
        {label && (
          <div className="absolute bottom-[calc(100%+5px)] left-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
              {label}
            </span>
            {/* Separar por vírgula: liga/desliga */}
            <button
              type="button"
              onClick={() => setUseCommaSeparator(!useCommaSeparator)}
              title={
                useCommaSeparator
                  ? "Vírgula separa os itens — clique para desligar"
                  : "Vírgula faz parte do texto — clique para ligar"
              }
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] leading-none transition-colors cursor-pointer ${
                useCommaSeparator
                  ? "border-primary-gold/35 text-primary-gold/70 hover:border-primary-gold/60"
                  : "border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/40"
              }`}
            >
              {useCommaSeparator ? <LuCheck size={10} /> : <LuX size={10} />}
              {useCommaSeparator ? "vírgula habilitada" : "vírgula desabilitada"}
            </button>
          </div>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Enter também adiciona o que foi digitado
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendValueToList();
            }
          }}
          type="text"
          placeholder={placeholder}
          onFocus={() => setInFocus(true)}
          onBlur={() =>
            setTimeout(() => {
              setInFocus(false);
            }, 150)
          }
          className="w-full h-full py-0.5 sm:py-1 text-primary-white placeholder:text-primary-gold/35 caret-primary-gold outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => sendValueToList()}
          aria-label="Adicionar"
          title="Adicionar (ou aperte Enter)"
          className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-lg border transition-colors cursor-pointer ${
            value.trim()
              ? "border-primary-gold/50 bg-primary-gold/15 text-primary-gold hover:bg-primary-gold/25"
              : "border-transparent text-primary-gold/35 hover:text-primary-gold/70"
          }`}
        >
          <LuSendHorizontal size={16} />
        </button>
        {filteredOptions.length > 0 &&
          inFocus &&
          (!value.includes(",") || useCommaSeparator) && (
            <div className="absolute top-[calc(100%+6px)] left-0 z-50 flex flex-col gap-0.5 w-full max-h-[180px] overflow-y-auto p-1 rounded-xl border border-primary-gold/25 bg-secondary-black/95 backdrop-blur-md shadow-[0_14px_36px_rgba(0,0,0,0.55)]">
              {filteredOptions.map((option, index) => (
                <div
                  className="px-3 py-2 rounded-lg text-sm text-primary-gold/75 cursor-pointer hover:bg-primary-gold/10 hover:text-primary-gold transition-colors"
                  key={index}
                  onClick={() => {
                    setValue(option);
                  }}
                >
                  <span>{highlightMatch(option, value)}</span>
                </div>
              ))}
            </div>
          )}
      </div>
      {values && values.length > 0 && (
        <div
          className={`flex gap-1.5 flex-wrap mt-2 w-full max-h-[120px] overflow-y-auto ${width}`}
        >
          {values.map((value, index) => (
            <button
              type="button"
              key={index}
              onClick={() => removeValueFromList(index)}
              title="Clique para remover"
              className="group/chip flex items-center gap-1.5 rounded-full border border-primary-gold/25 bg-primary-gold/[0.07] py-1 pl-2.5 pr-1.5 text-xs text-primary-gold/85 cursor-pointer transition-colors hover:border-invalid-color/50 hover:bg-invalid-color/10 hover:text-invalid-color"
            >
              <span>
                {withIndex && (
                  <span className="text-primary-gold/45 group-hover/chip:text-invalid-color/70">
                    {index + 1}.{" "}
                  </span>
                )}
                {value}
              </span>
              <LuX size={12} className="shrink-0 opacity-60 group-hover/chip:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
