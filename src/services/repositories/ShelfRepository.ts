import { db } from "@/services/firebaseConfig";
import { collection, deleteField, doc, onSnapshot, setDoc } from "firebase/firestore";
import { deleteImageFromFirebase, uploadImageToFirebase } from "./FirebaseImageUtils";
import {
  categoryForStorage,
  sanitizeCategories,
  sanitizeShelf,
  slotForStorage,
  type ShelfCategory,
  type ShelfContent,
  type ShelfPhoto,
  type ShelfSlot,
} from "@/floorplan/shelves";

const SHELVES = collection(db, "gameShelves");
const CATEGORIES_DOC = doc(db, "floorPlan", "shelfCategories");

/** O que está guardado em cada armário de jogos (um documento por armário). */
class ShelfRepository {
  static subscribeAll(onData: (m: Map<string, ShelfContent>) => void): () => void {
    return onSnapshot(
      SHELVES,
      (snap) => onData(new Map(snap.docs.map((d) => [d.id, sanitizeShelf(d.id, d.data())]))),
      (error) => {
        console.error("Erro ao ouvir os armários de jogos:", error);
        onData(new Map());
      },
    );
  }

  /** Troca um espaço inteiro (jogos e etiqueta) sem mexer nos outros. */
  static saveSlot(shelfId: string, slotId: string, slot: ShelfSlot) {
    return setDoc(
      doc(SHELVES, shelfId),
      { slots: { [slotId]: slotForStorage(slot) }, updatedAt: Date.now() },
      { mergeFields: [`slots.${slotId}`, "updatedAt"] },
    );
  }

  /** Vários espaços de uma vez (mover um jogo de um espaço para outro). */
  static saveSlots(changes: { shelfId: string; slotId: string; slot: ShelfSlot }[]) {
    const byShelf = new Map<string, { slotId: string; slot: ShelfSlot }[]>();
    for (const c of changes) byShelf.set(c.shelfId, [...(byShelf.get(c.shelfId) ?? []), c]);
    return Promise.all(
      [...byShelf].map(([shelfId, list]) =>
        setDoc(
          doc(SHELVES, shelfId),
          { slots: Object.fromEntries(list.map((c) => [c.slotId, slotForStorage(c.slot)])), updatedAt: Date.now() },
          { mergeFields: [...list.map((c) => `slots.${c.slotId}`), "updatedAt"] },
        ),
      ),
    );
  }

  /** Foto do armário inteiro (sem foto: apaga o campo). */
  static saveShelfPhoto(shelfId: string, photo: ShelfPhoto | undefined) {
    return setDoc(
      doc(SHELVES, shelfId),
      { photo: photo ? { url: photo.url, path: photo.path } : deleteField(), updatedAt: Date.now() },
      { mergeFields: ["photo", "updatedAt"] },
    );
  }

  /** Foto de referência (comprimida, até 1920 px). */
  static uploadPhoto(file: File) {
    return uploadImageToFirebase(file, "shelf-photos");
  }

  static deletePhotoFile(path: string) {
    return path ? deleteImageFromFirebase(path) : Promise.resolve();
  }

  static subscribeCategories(onData: (list: ShelfCategory[]) => void): () => void {
    return onSnapshot(
      CATEGORIES_DOC,
      (snap) => onData(sanitizeCategories(snap.exists() ? snap.data() : null)),
      (error) => {
        console.error("Erro ao ouvir as categorias das estantes:", error);
        onData([]);
      },
    );
  }

  static saveCategories(list: ShelfCategory[]) {
    return setDoc(CATEGORIES_DOC, { list: list.map(categoryForStorage), updatedAt: Date.now() });
  }
}

export default ShelfRepository;
