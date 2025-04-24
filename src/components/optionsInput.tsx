"use client";

import React, { useState } from "react";
import { LuSendHorizontal, LuX } from "react-icons/lu";

interface OptionsInputType {
  values: string[] | undefined;
  setValues: (values: string[]) => void;
  variant?: boolean;
  width?: string;
  placeholder: string;
  label?: string;
  limit?: number;
}

export default function OptionsInput({
  values,
  setValues,
  placeholder,
  label,
  variant = false,
  width = "w-auto",
  limit = 9999999999999,
}: OptionsInputType) {
  const [value, setValue] = useState("");

  function sendValueToList() {
    if (!values || value.trim() === "") return;

    if (values.length + 1 > limit) return;

    setValues([...values, value]);
    setValue("");
  }

  function removeValueFromList(indexByProps: number) {
    if (!values) return;

    const newValues = values.filter((_, index) => index !== indexByProps);
    setValues(newValues);
  }

  return (
    <div>
      <div
        className={`relative flex items-center max-w-[400px] min-w-[200px] ${width} bg-primary-black/80 py-2 px-3 sm:py-3 sm:px-4 rounded-sm text-sm gap-2 w-full shadow-card ${
          variant && "border border-primary-gold"
        }`}
      >
        {label && (
          <span className="absolute bottom-full left-1 text-xs text-gradient-gold font-semibold">
            {label}
          </span>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="text"
          placeholder={placeholder}
          className="px-1 w-full h-full rounded-md text-white placeholder:text-primary-gold/60 outline-none bg-transparent"
        />
        <LuSendHorizontal
          onClick={() => sendValueToList()}
          size={"20px"}
          className="cursor-pointer"
        />
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
