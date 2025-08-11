import React, { ComponentProps, ReactNode } from "react";

interface ButtonProps extends ComponentProps<"button"> {
  children: ReactNode;
  isHoverInvalid?: boolean;
  disabled?: boolean;
}

export default function Button({
  children,
  isHoverInvalid = false,
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`border-primary-gold flex items-center gap-2 justify-center min-w-[120px] transition-all ease-in duration-75 cursor-pointer border shadow-card text-primary-gold hover:text-primary-gold/80 rounded-sm px-2 py-1 w-full ${
        isHoverInvalid && "hover:!text-invalid-color"
      } ${disabled && "opacity-50 pointer-events-none select-none "}`}
    >
      {children}
    </button>
  );
}
