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
      className={`${
        isHoverInvalid && "hover:text-invalid-color"
      } flex items-center gap-2 justify-center min-w-[120px] hover:scale-[98%] transition-all ease-in duration-75 cursor-pointer border shadow-card text-primary-gold rounded-sm px-2 py-1 w-full`}
    >
      {children}
    </button>
  );
}
