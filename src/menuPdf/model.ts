/**
 * O que vai no PDF do cardápio, já na ordem: avisos, combos e uma seção por
 * categoria (com os subtipos em grupos). Sem nada de desenho — o documento
 * só percorre isto.
 */
import type {
  ComboType,
  DescriptionTypeProps,
  InfoType,
  MenuItemType,
  TypeOrderType,
} from "@/types";
import { menuPlaceholderFor } from "@/utils/menuIllustrations";

export type PdfItem = {
  key: string;
  name: string;
  value: string;
  description: string;
  sideDish: string[];
  observation: string[];
  isVegan: boolean;
  isFocus: boolean;
  /** Foto do item, ou a ilustração da categoria quando não tem. */
  image: string;
  /** Ilustração para o caso de a foto não carregar. */
  fallback: string;
};

export type PdfGroup = { name?: string; items: PdfItem[] };

export type PdfSection = {
  /** Âncora do sumário e do marcador (só letras, números e hífen). */
  id: string;
  title: string;
  subtitle?: string;
  groups: PdfGroup[];
  count: number;
};

export type MenuModel = {
  infos: InfoType[];
  combos: ComboType[];
  sections: PdfSection[];
  itemCount: number;
};

/** Tira emojis e espaços sobrando: a fonte do PDF não tem emoji (sairia um quadrado). */
export function clean(text: string | undefined): string {
  return (text ?? "").replace(/\p{Extended_Pictographic}️?/gu, "").replace(/\s+/g, " ").trim();
}

const BY_NAME = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

export function slug(text: string, used: Set<string>): string {
  const base =
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "secao";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

export function buildMenuModel({
  items,
  combos,
  infos,
  descriptions,
  typesOrder,
  includeHidden = false,
  skipHidden,
}: {
  items: MenuItemType[];
  combos: ComboType[];
  infos: InfoType[];
  descriptions: DescriptionTypeProps[];
  typesOrder: TypeOrderType[];
  /** Também os itens escondidos no site. */
  includeHidden?: boolean;
  /** Dos escondidos, os que ficam de fora mesmo assim (pelo id). */
  skipHidden?: ReadonlySet<string>;
}): MenuModel {
  const shows = (i: MenuItemType) => i.isVisible || (includeHidden && !(i.id && skipHidden?.has(i.id)));
  const visible = items.filter((i) => shows(i) && i.name?.trim());
  const typeOrder = (name: string) => typesOrder.find((t) => t.type.name === name)?.type.order ?? 999;
  const subOrder = (type: string, sub: string) =>
    typesOrder.find((t) => t.type.name === type)?.type.subtypes.find((s) => s.name === sub)?.order ?? 999;

  const types = [...new Set(visible.map((i) => i.type))].sort(
    (a, b) => typeOrder(a) - typeOrder(b) || BY_NAME(a, b),
  );

  const toItem = (item: MenuItemType, n: number): PdfItem => {
    const fallback = menuPlaceholderFor(item, typesOrder, "png");
    return {
      key: item.id ?? `${item.type}-${n}`,
      name: clean(item.name),
      value: clean(item.value),
      description: clean(item.description),
      sideDish: (item.sideDish ?? []).map(clean).filter(Boolean),
      observation: (item.observation ?? []).map(clean).filter(Boolean),
      isVegan: !!item.isVegan,
      isFocus: !!item.isFocus,
      image: item.image?.trim() || fallback,
      fallback,
    };
  };
  const sortItems = (list: MenuItemType[]) =>
    [...list].sort((a, b) => Number(b.isFocus) - Number(a.isFocus) || BY_NAME(a.name, b.name));

  const used = new Set<string>(["avisos", "combos", "sumario"]);
  const sections = types.map((type) => {
    const ofType = visible.filter((i) => i.type === type);
    const loose = ofType.filter((i) => !i.subtype?.trim());
    const subs = [...new Set(ofType.map((i) => i.subtype?.trim()).filter((s): s is string => !!s))].sort(
      (a, b) => subOrder(type, a) - subOrder(type, b) || BY_NAME(a, b),
    );
    const groups: PdfGroup[] = [];
    if (loose.length) groups.push({ items: sortItems(loose).map(toItem) });
    for (const sub of subs)
      groups.push({ name: sub, items: sortItems(ofType.filter((i) => i.subtype?.trim() === sub)).map(toItem) });
    const subtitle = descriptions.find((d) => d.type === type)?.description?.trim();
    return { id: slug(type, used), title: clean(type), subtitle: clean(subtitle) || undefined, groups, count: ofType.length };
  });

  return {
    infos: [...infos]
      .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0))
      .map((i) => ({ ...i, name: clean(i.name), description: clean(i.description), values: (i.values ?? []).map(clean).filter(Boolean) })),
    combos: combos.map((c) => ({ ...c, name: clean(c.name), description: clean(c.description), value: clean(c.value) })),
    sections,
    itemCount: visible.length,
  };
}

/** Divide em linhas de `n` (a última pode ficar incompleta). */
export function rows<T>(list: T[], n = 2): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

/** Entradas do sumário: avisos e combos (quando há) e cada categoria. */
export function tocEntries(model: MenuModel): { id: string; title: string }[] {
  return [
    ...(model.infos.length ? [{ id: "avisos", title: "Avisos" }] : []),
    ...(model.combos.length ? [{ id: "combos", title: "Combos" }] : []),
    ...model.sections.map((s) => ({ id: s.id, title: s.title })),
  ];
}
