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
    <div>
      <div
        className={`relative flex items-center max-w-[400px] min-w-[200px] ${width} bg-primary-black/80 py-2 px-3 sm:py-3 sm:px-4 rounded-sm text-sm gap-2 w-full shadow-card ${
          variant && "border border-primary-gold"
        }`}
      >
        {label && (
          <div className="absolute bottom-full left-1 text-xs text-gradient-gold font-semibold flex items-center gap-2">
            <span>{label}</span>
            <label className="flex items-center gap-1 cursor-pointer text-[10px]">
              {useCommaSeparator && (
                <div
                  className="flex items-center gap-1 border-transparent border-x hover:border-primary-gold px-1 rounded-sm"
                  onClick={() => setUseCommaSeparator(false)}
                >
                  <LuCheck size={12} />
                  <span>vírgula habilitada</span>
                </div>
              )}
              {!useCommaSeparator && (
                <div
                  className="flex items-center gap-1 border-transparent border-x hover:border-primary-gold px-1 rounded-sm"
                  onClick={() => setUseCommaSeparator(true)}
                >
                  <LuX size={12} />
                  <span>vírgula desabilitada</span>
                </div>
              )}
            </label>
          </div>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="text"
          placeholder={placeholder}
          onFocus={() => setInFocus(true)}
          onBlur={() =>
            setTimeout(() => {
              setInFocus(false);
            }, 150)
          }
          className="px-1 w-full h-full rounded-md text-white placeholder:text-primary-gold/60 outline-none bg-transparent"
        />
        <LuSendHorizontal
          onClick={() => sendValueToList()}
          size={"20px"}
          className="cursor-pointer"
        />
        {filteredOptions.length > 0 &&
          inFocus &&
          (!value.includes(",") || useCommaSeparator) && (
            <div className="flex flex-col gap-2 max-h-[120px] overflow-y-scroll absolute top-full z-50 border w-full left-0 rounded shadow-card p-2 bg-primary-black">
              {filteredOptions.map((option, index) => (
                <div
                  className="py-1 px-2 rounded-sm border border-dashed cursor-pointer hover:text-secondary-gold transition-all duration-200 ease-in"
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
          className={`flex gap-4 flex-wrap border border-t-0 rounded p-2 w-full max-h-[120px] overflow-y-scroll ${width}`}
        >
          {values.map((value, index) => (
            <div
              key={index}
              onClick={() => removeValueFromList(index)}
              className="hover:text-invalid-color cursor-pointer transition-all duration-100 ease-in flex items-center gap-1 border-dashed border rounded py-1 px-2"
            >
              <span>
                {index + 1}- {value}
              </span>
              <LuX size={"16px"} className="min-w-[16px]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
