import { db } from "@/services/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  DayPlan,
  DayTemplate,
  FloorPlan,
  ManualMark,
  MapReserve,
  MapSettings,
  Pose,
  StoredFloorPlan,
  TableGroup,
} from "@/floorplan/types";
import { planForStorage, sanitizeDay, sanitizePlan, sanitizeSettings, sanitizeTemplate } from "@/floorplan/sanitize";
import { DEFAULT_SETTINGS, emptyDay } from "@/floorplan/day";
import { deleteImageFromFirebase, uploadImageToFirebase } from "./FirebaseImageUtils";

/** As partes do dia que formam a arrumação (sem os estados). */
export type DayLayoutParts = Pick<DayPlan, "moves" | "names" | "hidden" | "groups">;

/** Outra pessoa salvou a planta depois que ela foi aberta aqui. */
export class PlanConflictError extends Error {
  constructor() {
    super("plan_conflict");
  }
}

const PLAN_DOC = doc(db, "floorPlan", "main");
const SETTINGS_DOC = doc(db, "floorPlan", "settings");
const TEMPLATES = collection(db, "floorPlanTemplates");
const dayDoc = (date: string) => doc(db, "floorPlanDays", date);

/** Uma mudança por chave dentro de um mapa do documento do dia (null apaga). */
type DayField = "moves" | "names" | "hidden" | "groups" | "manual";

class FloorPlanRepository {
  /** Planta salva (null = ainda não salva: usar a inicial). */
  static subscribePlan(
    onData: (plan: StoredFloorPlan | null) => void,
    onError: (error: unknown) => void,
  ): () => void {
    return onSnapshot(
      PLAN_DOC,
      (snap) => onData(snap.exists() ? sanitizePlan(snap.data()) : null),
      (error) => {
        console.error("Erro ao ouvir a planta:", error);
        onError(error);
      },
    );
  }

  /**
   * Salva a planta inteira se ninguém salvou desde `baseVersion`.
   * Devolve a nova versão; lança PlanConflictError se houve outra gravação.
   */
  static async savePlan(plan: FloorPlan, baseVersion: number): Promise<number> {
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(PLAN_DOC);
      const current = snap.exists() ? Number(snap.data()?.version) || 0 : 0;
      if (current !== baseVersion) throw new PlanConflictError();
      const next = current + 1;
      tx.set(PLAN_DOC, { ...planForStorage(plan), version: next, updatedAt: Date.now() });
      return next;
    });
  }

  static subscribeSettings(onData: (s: MapSettings) => void): () => void {
    return onSnapshot(
      SETTINGS_DOC,
      (snap) => onData(sanitizeSettings(snap.exists() ? snap.data() : null)),
      (error) => {
        console.error("Erro ao ouvir as configurações do mapa:", error);
        onData({ ...DEFAULT_SETTINGS });
      },
    );
  }

  static saveSettings(patch: Partial<MapSettings>) {
    return setDoc(SETTINGS_DOC, { ...patch, updatedAt: Date.now() }, { merge: true });
  }

  /** Imagem de fundo da planta (comprimida, até 1920 px). */
  static uploadBackground(file: File) {
    return uploadImageToFirebase(file, "floor-plan");
  }

  static deleteStorageFile(path: string) {
    return deleteImageFromFirebase(path);
  }

  /** A arrumação de um dia (uma vez, sem ouvir). */
  static async getDayLayout(date: string): Promise<DayLayoutParts> {
    const snap = await getDoc(dayDoc(date));
    const d = sanitizeDay(date, snap.exists() ? snap.data() : null);
    return { moves: d.moves, names: d.names, hidden: d.hidden, groups: d.groups };
  }

  /** Troca a arrumação inteira do dia (mantém os estados marcados). */
  static replaceDayLayout(date: string, parts: DayLayoutParts) {
    return setDoc(
      dayDoc(date),
      { date, moves: parts.moves, names: parts.names, hidden: parts.hidden, groups: parts.groups, updatedAt: Date.now() },
      { mergeFields: ["date", "moves", "names", "hidden", "groups", "updatedAt"] },
    );
  }

  static subscribeTemplates(onData: (list: DayTemplate[]) => void): () => void {
    return onSnapshot(
      TEMPLATES,
      (snap) =>
        onData(
          snap.docs
            .map((d) => sanitizeTemplate(d.id, d.data()))
            .filter((t): t is DayTemplate => !!t)
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        ),
      (error) => {
        console.error("Erro ao ouvir os modelos de arrumação:", error);
        onData([]);
      },
    );
  }

  static saveTemplate(name: string, parts: DayLayoutParts) {
    return addDoc(TEMPLATES, { name: name.trim().slice(0, 60), ...parts, createdAt: Date.now() });
  }

  static deleteTemplate(id: string) {
    return deleteDoc(doc(TEMPLATES, id));
  }

  static subscribeDay(date: string, onData: (day: DayPlan) => void): () => void {
    return onSnapshot(
      dayDoc(date),
      (snap) => onData(snap.exists() ? sanitizeDay(date, snap.data()) : emptyDay(date)),
      (error) => {
        console.error("Erro ao ouvir o mapa do dia:", error);
        onData(emptyDay(date));
      },
    );
  }

  private static async setDayEntry(date: string, field: DayField, key: string, value: unknown): Promise<void> {
    await setDoc(
      dayDoc(date),
      { date, [field]: { [key]: value === null ? deleteField() : value }, updatedAt: Date.now() },
      { merge: true },
    );
  }

  static setManual(date: string, key: string, mark: ManualMark | null) {
    return this.setDayEntry(date, "manual", key, mark);
  }

  static setMove(date: string, tableId: string, pose: Pose | null) {
    return this.setDayEntry(date, "moves", tableId, pose);
  }

  static setName(date: string, tableId: string, name: string | null) {
    return this.setDayEntry(date, "names", tableId, name?.trim() ? name.trim() : null);
  }

  static setHidden(date: string, tableId: string, hidden: boolean) {
    return this.setDayEntry(date, "hidden", tableId, hidden ? true : null);
  }

  static setGroup(date: string, groupId: string, group: TableGroup | null) {
    return this.setDayEntry(date, "groups", groupId, group);
  }

  /** Várias mudanças de uma vez (ex.: juntar mesas e limpar as marcações delas). */
  static async patchDay(date: string, patch: Partial<Record<DayField, Record<string, unknown>>>): Promise<void> {
    const data: Record<string, unknown> = { date, updatedAt: Date.now() };
    for (const [field, entries] of Object.entries(patch)) {
      data[field] = Object.fromEntries(
        Object.entries(entries ?? {}).map(([k, v]) => [k, v === null ? deleteField() : v]),
      );
    }
    await setDoc(dayDoc(date), data, { merge: true });
  }

  /** Volta as mesas do dia para a planta (posição, nome, retiradas e junções). */
  static async resetDayLayout(date: string): Promise<void> {
    try {
      await updateDoc(dayDoc(date), { moves: {}, names: {}, hidden: {}, groups: {}, updatedAt: Date.now() });
    } catch (error) {
      // Documento ainda não existe: não há nada para desfazer
      if ((error as { code?: string })?.code !== "not-found") throw error;
    }
  }

  /**
   * Reservas de um dia, ao vivo. O dia e o mês estão salvos às vezes com zero
   * ("05") e às vezes sem ("5"), então a consulta pede as duas formas.
   */
  static subscribeReservesOfDay(
    date: string,
    onData: (reserves: MapReserve[]) => void,
    onError: (error: unknown) => void,
  ): () => void {
    const [y, m, d] = date.split("-");
    const forms = (v: string) => [...new Set([v, String(Number(v))])];
    const q = query(
      collection(db, "reserves"),
      where("bookingDate.year", "==", y),
      where("bookingDate.month", "in", forms(m)),
      where("bookingDate.day", "in", forms(d)),
    );
    return onSnapshot(
      q,
      (snap) =>
        onData(
          snap.docs.map((s) => {
            const r = s.data();
            return {
              id: s.id,
              name: typeof r.name === "string" ? r.name : "",
              time: typeof r.time === "string" ? r.time : "",
              table: typeof r.table === "string" ? r.table : "",
              adults: Number(r.adults) || 0,
              childs: Number(r.childs) || 0,
              status: r.status === "canceled" ? "canceled" : "confirmed",
              isArrived: r.isArrived === true,
              observation: typeof r.observation === "string" ? r.observation : undefined,
            } satisfies MapReserve;
          }),
        ),
      (error) => {
        console.error("Erro ao ouvir as reservas do dia:", error);
        onError(error);
      },
    );
  }

  static setReserveTable(reserveId: string, table: string) {
    return updateDoc(doc(db, "reserves", reserveId), { table });
  }

  static setReserveArrived(reserveId: string, arrived: boolean) {
    return updateDoc(doc(db, "reserves", reserveId), { isArrived: arrived });
  }
}

export default FloorPlanRepository;
