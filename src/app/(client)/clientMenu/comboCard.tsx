import { ComboType } from "@/types";
import React, { ComponentProps } from "react";

interface ComboCardProps extends ComponentProps<"div"> {
  combo: ComboType;
}

export default function ComboCard({ combo, ...props }: ComboCardProps) {
  return (
    <div {...props} className="mb-4 w-full">
      <span className="font-bold text-xl">{combo.name}</span>
      <p className="italic text-sm">{combo.description}</p>
      <ul className="flex items-center gap-2 my-2 font-semibold text-xl ">
        <li>{combo.value}</li>
      </ul>
    </div>
  );
}
