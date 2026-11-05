"use client";

import { useEffect, useState, type FormEvent, type MutableRefObject, type ReactNode } from "react";
import { FiCreditCard, FiPhone, FiUser } from "react-icons/fi";
import Input from "@/components/input";
import { AuthSubmit } from "@/components/authCard";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi } from "@/services/rentalApi";
import { isValidCpf, normalizeCpf } from "@/rental/cpf";
import { RulesLink } from "./rulesSheet";

export function maskPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCpf(input: string): string {
  const d = normalizeCpf(input).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function validateFields(
  f: { name: string; phone: string; cpf: string },
  requireCpf: boolean,
): string | null {
  if (f.name.trim().length < 3) return "Informe seu nome completo.";
  const phone = f.phone.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 11) return "Informe um WhatsApp válido com DDD.";
  if ((requireCpf || f.cpf) && !isValidCpf(f.cpf)) return "CPF inválido.";
  return null;
}

type Initial = { name?: string; phone?: string; cpf?: string };

/** Campos do cadastro do cliente; salva pela rota /api/rental/profile. */
export default function ProfileForm({
  initial,
  requireCpf,
  requireTerms,
  onSaved,
  submitLabel = "Salvar",
  extraFields,
  onBeforeSave,
  onSaveFailed,
  embedded = false,
  submitRef,
}: {
  initial?: Initial;
  requireCpf: boolean;
  requireTerms: boolean;
  onSaved: () => void;
  submitLabel?: string;
  /** Campos extras exibidos antes do aceite (ex.: e-mail e senha do cadastro). */
  extraFields?: ReactNode;
  /** Roda depois da validação e antes de salvar; false cancela o envio. */
  onBeforeSave?: () => Promise<boolean>;
  /** Chamado quando a rota recusa o cadastro (ex.: CPF em uso). */
  onSaveFailed?: () => void;
  /** Dentro de outro <form> (ex.: AuthCard): não cria um <form> aninhado. */
  embedded?: boolean;
  /** Em modo embutido, recebe a função de envio para o <form> pai chamar. */
  submitRef?: MutableRefObject<(() => void) | null>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(maskPhone(initial?.phone ?? ""));
  const [cpf, setCpf] = useState(maskCpf(initial?.cpf ?? ""));
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addAlert } = useAlert();

  async function submit() {
    const error = validateFields({ name, phone, cpf }, requireCpf);
    if (error) return addAlert(error);
    if (requireTerms && !accepted) return addAlert("Aceite as regras do aluguel para continuar.");
    setLoading(true);
    try {
      if (onBeforeSave && !(await onBeforeSave())) return;
      const result = await rentalApi.saveProfile({
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        cpf: normalizeCpf(cpf),
        acceptTerms: accepted,
      });
      if (!result.ok) {
        onSaveFailed?.();
        return addAlert(result.message);
      }
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!submitRef) return;
    submitRef.current = () => void submit();
  });

  const Wrapper = embedded ? "div" : "form";
  const wrapperProps = embedded
    ? {}
    : {
        noValidate: true,
        onSubmit: (e: FormEvent) => {
          e.preventDefault();
          void submit();
        },
      };

  return (
    <Wrapper className="flex flex-col gap-4" {...wrapperProps}>
      <Input
        icon={<FiUser size={17} />}
        label="Nome completo"
        placeholder="Nome completo"
        value={name}
        setValue={(e) => setName(e.target.value)}
      />
      <Input
        icon={<FiPhone size={17} />}
        label="WhatsApp"
        placeholder="WhatsApp"
        type="tel"
        inputMode="numeric"
        value={phone}
        setValue={(e) => setPhone(maskPhone(e.target.value))}
      />
      {(requireCpf || !!initial?.cpf) && (
        <Input
          icon={<FiCreditCard size={17} />}
          label="CPF"
          placeholder="CPF"
          inputMode="numeric"
          value={cpf}
          setValue={(e) => setCpf(maskCpf(e.target.value))}
        />
      )}
      {extraFields}
      {requireTerms && (
        <label className="flex items-start gap-2 pl-1 text-xs text-primary-gold/70 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-[#e6c56b]"
          />
          <span>
            Li e aceito as{" "}
            <RulesLink className="underline underline-offset-4 text-primary-gold hover:brightness-110 cursor-pointer">
              regras do aluguel
            </RulesLink>
          </span>
        </label>
      )}
      <AuthSubmit loading={loading}>{submitLabel}</AuthSubmit>
    </Wrapper>
  );
}
