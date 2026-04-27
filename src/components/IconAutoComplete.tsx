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
        <div className="absolute top-[100%] mt-2 w-full max-h-60 overflow-y-auto bg-black border rounded z-[999]">
          {filtered.length === 0 && (
            <div className="p-2 text-sm text-gray-400">
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
                className="flex items-center gap-2 p-2 hover:bg-white/10 cursor-pointer"
              >
                <Icon size={18} />
                <span className="text-sm">{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
