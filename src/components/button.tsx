import React, { ComponentProps, ReactNode } from "react";

interface ButtonProps extends ComponentProps<"button"> {
  children: ReactNode;
}

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className="hover:scale-[98%] transition-all ease-in duration-75 cursor-pointer border shadow-card text-primary-gold rounded-sm px-2 py-1 w-full"
    >
      {children}
    </button>
  );
}
