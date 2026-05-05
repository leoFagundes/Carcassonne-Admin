import { InfoType } from "@/types";
import React, { ComponentProps, Fragment } from "react";
import { FiArrowRight } from "react-icons/fi";

interface InfoCardProps extends ComponentProps<"div"> {
  info: InfoType;
}

export default function InfoCard({ info, ...props }: InfoCardProps) {
  return (
    <div
      {...props}
      className="group w-full mb-3 rounded-xl border border-primary-gold/20 bg-primary-black/30 hover:border-primary-gold/40 hover:bg-primary-black/50 transition-all duration-300 overflow-hidden"
    >
      <div className="flex">
        {/* Accent left bar */}
        <div
          className="w-[3px] shrink-0 rounded-l-xl"
          style={{
            background: "linear-gradient(to bottom, #e6c56b, #d4af37)",
          }}
        />
        <div className="flex flex-col gap-1.5 px-4 py-3 flex-1">
          <span className="font-bold text-base sm:text-lg leading-tight">
            {info.name}
          </span>
          {info.description && (
            <p className="text-xs sm:text-sm text-primary-gold/65 leading-relaxed">
              {info.description}
            </p>
          )}
          {info.values.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              {info.values.map((value, index) => (
                <Fragment key={index}>
                  <span
                    className={`font-semibold ${
                      info.values.length === 2 && index === 0
                        ? "text-sm text-primary-gold/50"
                        : "text-lg text-primary-gold"
                    }`}
                  >
                    {value}
                  </span>
                  {info.values.length === 2 && index === 0 && (
                    <FiArrowRight
                      className="text-primary-gold/60 shrink-0"
                      size="15px"
                    />
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
