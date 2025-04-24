import React, { ComponentProps, ReactNode } from "react";

interface CardProps extends ComponentProps<"div"> {
  title: string;
  description: string;
  icon: ReactNode;
}

export default function Card({
  title,
  description,
  icon,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className="overflow-visible relative flex flex-col w-[250px] h-[130px] outline hover:outline-primary-gold outline-transparent border border-primary-gold transition-all duration-200 ease-in scrollbar-none gap-2 items-center bg-primary-black/80 p-4 rounded text-primary-gold shadow-card cursor-pointer"
    >
      <h2 className="text-2xl text-center">{title}</h2>
      <p className="text-center font-light text-sm italic">{description}</p>
      <div className="absolute p-2 rounded-full bg-primary-black -bottom-3 -right-3">
        {icon}
      </div>
    </div>
  );
}
