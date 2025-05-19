import React, { ComponentProps, ReactNode } from "react";

interface ButtonProps extends ComponentProps<"button"> {
  children: ReactNode;
  isHoverInvalid?: boolean;
}

export default function Button({
  children,
  isHoverInvalid = false,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={` flex items-center gap-2 justify-center min-w-[120px] transition-all ease-in duration-75 cursor-pointer border shadow-card text-primary-gold hover:text-primary-gold/80 rounded-sm px-2 py-1 w-full ${
        isHoverInvalid && "hover:!text-invalid-color"
      }`}
    >
      {children}
    </button>
  );
}
