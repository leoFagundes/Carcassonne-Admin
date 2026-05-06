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
      className="group relative flex flex-col w-[210px] rounded-xl border border-primary-gold/20 hover:border-primary-gold/50 bg-secondary-black/40 p-4 cursor-pointer transition-all duration-200 gap-3 text-primary-gold"
    >
      <div className="p-2 rounded-lg bg-primary-gold/10 border border-primary-gold/15 w-fit group-hover:bg-primary-gold/15 transition-all">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold leading-tight">{title}</h2>
        <p className="text-xs text-primary-gold/50 font-light leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
