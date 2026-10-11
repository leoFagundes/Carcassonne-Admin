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
      className={`flex items-center gap-2 justify-center min-w-[120px] w-full px-4 py-2 rounded-xl border border-primary-gold/45 bg-primary-gold/10 text-sm font-semibold text-primary-gold shadow-card cursor-pointer transition-all duration-150 hover:bg-primary-gold/20 hover:border-primary-gold/70 active:scale-[0.98] ${
        isHoverInvalid
          ? "hover:!text-invalid-color hover:!border-invalid-color/60 hover:!bg-invalid-color/10"
          : ""
      } ${disabled ? "opacity-50 pointer-events-none select-none" : ""}`}
    >
      {children}
    </button>
  );
}
