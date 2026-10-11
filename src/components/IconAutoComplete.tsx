/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { normalizeIconName } from "@/utils/utilFunctions";
import * as Icons from "lucide-react";
import { useMemo, useState } from "react";
import Input from "./input";
import { LuSmile } from "react-icons/lu";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function IconAutocomplete({ value, onChange }: Props) {
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalized = normalizeIconName(search).toLowerCase();

    return Object.keys(Icons)
      .filter((name) => name.toLowerCase().includes(normalized))
      .slice(0, 20);
  }, [search]);

  return (
    <div className="flex flex-col gap-2 w-[250px] relative">
      <Input
        icon={<LuSmile size={20} />}
        variant
        label="ícone"
        setValue={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        value={search}
        placeholder="Buscar ícone..."
        className="bg-transparent border px-3 py-2 rounded"
      />

      {open && search && (
        <div className="absolute top-[calc(100%+6px)] w-full max-h-60 overflow-y-auto p-1 flex flex-col gap-0.5 rounded-xl border border-primary-gold/25 bg-secondary-black/95 backdrop-blur-md shadow-[0_14px_36px_rgba(0,0,0,0.55)] z-[999]">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-primary-gold/40">
              Nenhum ícone encontrado
            </div>
          )}

          {filtered.map((name) => {
            const Icon = (Icons as any)[name];

            return (
              <div
                key={name}
                onClick={() => {
                  onChange(name);
                  setSearch(name);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-primary-gold/75 hover:bg-primary-gold/10 hover:text-primary-gold cursor-pointer transition-colors"
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-sm">{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
