"use client";

import React, { ComponentProps, ReactNode, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface InputProps extends ComponentProps<"input"> {
  placeholder: string;
  value: string;
  setValue: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: ReactNode;
  label?: string;
  variant?: boolean;
}

export default function Input({
  placeholder,
  value,
  setValue,
  icon,
  type = "text",
  label,
  variant = false,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <div
      className={`relative flex items-center max-w-[400px] bg-primary-black/80 py-1 px-3 sm:py-3 sm:px-4 rounded-sm text-sm gap-2 w-full shadow-card ${
        variant && "border border-primary-gold"
      }`}
    >
      {label && (
        <span className="absolute bottom-full left-1 text-xs text-gradient-gold font-semibold">
          {label}
        </span>
      )}
      {icon && icon}
      <input
        {...props}
        autoComplete="off"
        className="w-full rounded-md text-white placeholder:text-primary-gold outline-none"
        value={value}
        onChange={(e) => setValue(e)}
        placeholder={placeholder}
        type={isPasswordVisible ? "text" : type}
      />
      {type === "password" && (
        <div
          className="cursor-pointer text-primary-gold"
          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
        >
          {isPasswordVisible ? <FiEye /> : <FiEyeOff />}
        </div>
      )}
    </div>
  );
}
