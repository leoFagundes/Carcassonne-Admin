import { InfoType } from "@/types";
import React, { ComponentProps, Fragment } from "react";
import { FiArrowRight } from "react-icons/fi";

interface InfoCardProps extends ComponentProps<"div"> {
  info: InfoType;
}

export default function InfoCard({ info, ...props }: InfoCardProps) {
  return (
    <div {...props} className="mb-4 w-full">
      <span className="font-bold text-xl">{info.name}</span>
      <p className="italic text-sm">{info.description}</p>
      <ul className="flex items-center gap-2 my-2 font-semibold text-xl ">
        {info.values.map((value, index) => (
          <Fragment key={index}>
            <li>{value}</li>
            {info.values.length === 2 && index === 0 && <FiArrowRight />}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
