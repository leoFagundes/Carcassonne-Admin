"use client";

import { useEffect, useState } from "react";
import {
  LuBookOpenText,
  LuClock,
  LuDices,
  LuDollarSign,
  LuEye,
  LuEyeClosed,
  LuImage,
  LuPackage,
  LuUserRoundMinus,
  LuUserRoundPlus,
  LuCalendarDays,
} from "react-icons/lu";
import type { BoardgameType, RentalGameType } from "@/types";
import Input from "@/components/input";
import Dropdown from "@/components/dropdown";
import Checkbox from "@/components/checkbox";
import OptionsInput from "@/components/optionsInput";
import FormCard from "@/components/formCard";
import { useAlert } from "@/contexts/alertProvider";
import { difficultiesOptions } from "@/utils/patternValues";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import { uploadImageToFirebase } from "@/services/repositories/FirebaseImageUtils";
import { formatBRL, parseBRL } from "@/rental/money";
import { todaySP } from "@/rental/dates";
import { withLiveBookings } from "@/rental/payments";
import UnitsEditor from "./unitsEditor";
import DiscountEditor from "./discountEditor";
import { discountFromDraft, draftFromDiscount } from "@/rental/discounts";

export const emptyRentalGame: RentalGameType = {
  name: "",
  description: "",
  image: "",
  difficulty: "",
  minPlayers: 1,
  maxPlayers: 4,
  playTime: 30,
  types: [],
  price: 0,
  rentalDays: 7,
  isActive: true,
  units: [{ id: "new-1", label: "Cópia 1", status: "active" }],
  bookings: [],
};

export default function RentalGameForm({
  game,
  closeForms,
  pendingCheck,
  live,
}: {
  /** Sem `id` = novo jogo. */
  game: RentalGameType;
  closeForms: VoidFunction;
  /**
   * O mesmo jogo como está agora no banco (atualiza sozinho). As reservas mudam
   * com o formulário aberto, e uma devolução pode tirar uma cópia de circulação.
   */
  live?: RentalGameType;
  /** Cópias devolvidas e ainda sem conferir (id da cópia → texto). */
  pendingCheck?: ReadonlyMap<string, string>;
}) {
  const isEdit = !!game.id;
  const { addAlert } = useAlert();
  const [local, setLocal] = useState<RentalGameType>(() =>
    isEdit ? game : { ...game, units: [{ ...game.units[0], id: crypto.randomUUID() }] },
  );
  const [priceText, setPriceText] = useState(game.price > 0 ? formatBRL(game.price) : "");
  const [promo, setPromo] = useState(() => draftFromDiscount(game.discount));
  const [loading, setLoading] = useState(false);
  const [pubGames, setPubGames] = useState<BoardgameType[]>([]);
  const [importId, setImportId] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    BoardgameRepository.getAll()
      .then(setPubGames)
      .catch((error) => addAlert(`Erro ao carregar o acervo: ${error}`));
  }, []);

  const typeOptions = Array.from(new Set(pubGames.flatMap((g) => g.types)));

  // Rótulos com o nome do jogo; nomes repetidos ganham "(2)", "(3)"...
  const pubLabels = pubGames.map((g, i) => {
    const before = pubGames.slice(0, i).filter((o) => o.name === g.name).length;
    return before ? `${g.name} (${before + 1})` : g.name;
  });

  const importFromPub = (label: string) => {
    setImportId(label);
    const id = pubGames[pubLabels.indexOf(label)]?.id;
    const source = pubGames.find((g) => g.id === id);
    if (!source) return;
    setLocal((prev) => ({
      ...prev,
      name: source.name,
      description: source.description,
      image: source.image,
      difficulty: source.difficulty,
      minPlayers: source.minPlayers,
      maxPlayers: source.maxPlayers,
      playTime: source.playTime,
      types: source.types,
      sourceBoardgameId: source.id,
    }));
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImageToFirebase(file, "rental-games");
      setLocal((prev) => ({ ...prev, image: url }));
    } catch (error) {
      addAlert(`Erro ao enviar a imagem: ${error instanceof Error ? error.message : error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Salvar grava as cópias inteiras: se elas mudaram por fora (ex.: devolução
    // com avaria marcou uma cópia como indisponível), salvar desfaria isso.
    if (isEdit && live && JSON.stringify(live.units) !== JSON.stringify(game.units)) {
      addAlert(
        "As cópias deste jogo mudaram enquanto o formulário estava aberto (ex.: uma devolução tirou uma cópia de circulação). Feche e abra o jogo de novo para não desfazer essa mudança.",
      );
      return;
    }
    const price = parseBRL(priceText);
    if (!local.name.trim() || !local.description.trim() || !local.difficulty) {
      addAlert("Preencha todos os campos.");
      return;
    }
    if (local.minPlayers < 1 || local.maxPlayers < local.minPlayers || local.playTime < 1) {
      addAlert("Confira o número de jogadores e o tempo de jogo.");
      return;
    }
    if (price === null || price <= 0) {
      addAlert("Informe um preço válido, maior que zero.");
      return;
    }
    if (!Number.isInteger(local.rentalDays) || local.rentalDays < 1 || local.rentalDays > 60) {
      addAlert("O prazo deve ser um número inteiro de 1 a 60 dias.");
      return;
    }
    const promoResult = discountFromDraft(promo, todaySP(), { price });
    if (!promoResult.ok) {
      addAlert(promoResult.error);
      return;
    }

    // Firestore recusa `undefined`: monta o payload só com chaves definidas
    const units = local.units.map((u) => {
      const { note, ...rest } = u;
      const trimmed = note?.trim();
      return trimmed ? { ...rest, note: trimmed } : rest;
    });
    const data = {
      name: local.name.trim(),
      description: local.description.trim(),
      image: local.image,
      difficulty: local.difficulty,
      minPlayers: local.minPlayers,
      maxPlayers: local.maxPlayers,
      playTime: local.playTime,
      types: local.types,
      price,
      rentalDays: local.rentalDays,
      isActive: local.isActive,
      units,
      // null = sem promoção própria (apaga a anterior)
      discount: promoResult.discount,
      ...(local.sourceBoardgameId ? { sourceBoardgameId: local.sourceBoardgameId } : {}),
    };

    setLoading(true);
    try {
      const ok = isEdit
        ? await RentalGameRepository.update(game.id!, data)
        : !!(await RentalGameRepository.create(data));
      if (!ok) {
        addAlert("Não foi possível salvar o jogo. Tente novamente.");
        return;
      }
      addAlert(`Jogo ${data.name} ${isEdit ? "editado" : "criado"} com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao salvar jogo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (withLiveBookings(live ?? game, Date.now()).bookings.length > 0) {
      addAlert("Há aluguéis em aberto para este jogo.");
      return;
    }
    setLoading(true);
    try {
      const ok = await RentalGameRepository.delete(game.id!);
      if (!ok) {
        addAlert("Não foi possível excluir o jogo. Tente novamente.");
        return;
      }
      addAlert(`Jogo ${game.name} excluído com sucesso!`);
      closeForms();
    } finally {
      setLoading(false);
    }
  };

  const set = <K extends keyof RentalGameType>(key: K, value: RentalGameType[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const full = "!w-full !max-w-none !min-w-0";
  const pricePreview = parseBRL(priceText);
  const activeCopies = local.units.filter((u) => u.status === "active").length;

  return (
    <FormCard
      title={local.name || "Novo jogo"}
      subtitle={isEdit ? "Editar jogo de aluguel" : "Adicionar jogo para aluguel"}
      icon={<LuPackage size={18} />}
      onClose={closeForms}
      maxWidth="sm:max-w-[680px]"
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Salvar alterações" : "Criar jogo"}
      submitDisabled={uploading}
      onDelete={isEdit ? handleDelete : undefined}
      loading={loading}
    >
      <div className="flex flex-col gap-4 text-primary-gold w-full">
        {!isEdit && (
          <Section
            title="Começar pelo acervo"
            hint="Escolha um jogo da ludoteca para preencher nome, descrição, imagem, jogadores e tipo. Depois é só ajustar o que quiser."
          >
            <div className="pt-5">
              <Dropdown
                label="Importar do acervo do pub"
                options={pubLabels}
                firstLabel="Importar do acervo do pub (opcional)"
                value={importId}
                setValue={(e) => importFromPub(e.target.value)}
                variant
                width={full}
              />
            </div>
          </Section>
        )}

        <Section title="Sobre o jogo">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-x-4 gap-y-1">
            <div className="flex flex-col gap-1 min-w-0">
              <Input
                labelSpace
                label="Nome"
                placeholder="Ex.: Catan"
                value={local.name}
                setValue={(e) => set("name", e.target.value)}
                variant
                icon={<LuDices size={"20px"} />}
                width={full}
              />
              <Input
                labelSpace
                label="Descrição"
                placeholder="O que o cliente lê no detalhe do jogo"
                value={local.description}
                setValue={(e) => set("description", e.target.value)}
                variant
                multiline
                rows={4}
                icon={<LuBookOpenText size={"20px"} />}
                width={full}
              />
            </div>
            {/* Capa ao lado do nome: o que o cliente vê no card */}
            <div className="flex flex-col gap-2 pt-7">
              {local.image ? (
                <img
                  src={local.image}
                  alt={local.name}
                  className="w-full aspect-[4/3] object-cover rounded-xl border border-primary-gold/20"
                />
              ) : (
                <div className="flex w-full aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-primary-gold/25 text-primary-gold/35">
                  <LuImage size={28} />
                </div>
              )}
              <label className="flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl border border-primary-gold/25 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 cursor-pointer">
                <LuImage size={14} />
                {uploading ? "Enviando..." : local.image ? "Trocar imagem" : "Enviar imagem"}
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    handleImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div className="pt-5">
              <Dropdown
                label="Dificuldade"
                options={difficultiesOptions}
                firstLabel="Dificuldade do jogo"
                value={local.difficulty}
                setValue={(e) => set("difficulty", e.target.value)}
                variant
                width={full}
              />
            </div>
            <Input
              labelSpace
              label="Tempo de jogo (min)"
              type="number"
              placeholder="Ex.: 60"
              value={String(local.playTime)}
              setValue={(e) => set("playTime", Number(e.target.value))}
              variant
              icon={<LuClock size={"18px"} />}
              width={full}
            />
            <Input
              labelSpace
              label="Mínimo de jogadores"
              type="number"
              placeholder="Ex.: 2"
              value={String(local.minPlayers)}
              setValue={(e) => set("minPlayers", Number(e.target.value))}
              variant
              icon={<LuUserRoundMinus size={"18px"} />}
              width={full}
            />
            <Input
              labelSpace
              label="Máximo de jogadores"
              type="number"
              placeholder="Ex.: 4"
              value={String(local.maxPlayers)}
              setValue={(e) => set("maxPlayers", Number(e.target.value))}
              variant
              icon={<LuUserRoundPlus size={"18px"} />}
              width={full}
            />
          </div>
          <div className="pt-4">
            <OptionsInput
              values={local.types}
              setValues={(values) => set("types", values)}
              placeholder="Categorias (ex.: Estratégia, Cooperativo...)"
              label="Categorias"
              variant
              width={full}
              options={typeOptions}
            />
          </div>
        </Section>

        <Section title="Aluguel" hint="Quanto o cliente paga e por quantos dias fica com o jogo.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Input
              labelSpace
              label="Preço do aluguel"
              placeholder="Ex.: 45,00"
              value={priceText}
              setValue={(e) => setPriceText(e.target.value)}
              variant
              icon={<LuDollarSign size={"18px"} />}
              width={full}
            />
            <Input
              labelSpace
              label="Prazo (dias com o cliente)"
              type="number"
              placeholder="Ex.: 7"
              value={String(local.rentalDays)}
              setValue={(e) => set("rentalDays", Number(e.target.value))}
              variant
              icon={<LuCalendarDays size={"18px"} />}
              width={full}
            />
          </div>
          {pricePreview !== null && pricePreview > 0 && local.rentalDays > 0 && (
            <p className="text-xs text-primary-gold/60">
              O cliente paga <strong className="text-primary-gold">{formatBRL(pricePreview)}</strong> e fica{" "}
              <strong className="text-primary-gold">
                {local.rentalDays} {local.rentalDays === 1 ? "dia" : "dias"}
              </strong>{" "}
              com o jogo.
            </p>
          )}
          <DiscountEditor
            draft={promo}
            onChange={setPromo}
            today={todaySP()}
            price={pricePreview}
            title="Em promoção"
            description="O cliente vê o preço cheio riscado e o novo preço, com o selo de promoção. Se houver promoção em todos os jogos (Regras), vale a que deixar o jogo mais barato."
          />
          <Checkbox
            checked={local.isActive}
            setChecked={() => set("isActive", !local.isActive)}
            variant
            width="!max-w-none"
            label={local.isActive ? "Aparece no catálogo de aluguel" : "Escondido do catálogo (inativo)"}
            icon={local.isActive ? <LuEye size={"16px"} /> : <LuEyeClosed size={"16px"} />}
          />
          {local.isActive && activeCopies === 0 && (
            <p className="text-xs text-orange-300">
              Sem nenhuma cópia ativa, o jogo aparece como indisponível para o cliente.
            </p>
          )}
        </Section>

        <Section>
          <UnitsEditor
            units={local.units}
            setUnits={(units) => set("units", units)}
            bookings={live?.bookings ?? local.bookings}
            today={todaySP()}
            pendingCheck={pendingCheck}
          />
        </Section>
      </div>
    </FormCard>
  );
}

/** Bloco do formulário, com título e explicação curta. */
function Section({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-primary-gold/15 bg-primary-black/25 p-3.5">
      {title && (
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-gold/75">{title}</h3>
          {hint && <p className="text-[11px] text-primary-gold/45 leading-relaxed">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
