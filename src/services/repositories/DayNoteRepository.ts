import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { DayNoteType } from "@/types";

class DayNoteRepository {
  static collectionName = "dayNotes";

  private static dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static async getByDate(
    date: Date,
  ): Promise<(DayNoteType & { id: string })[]> {
    try {
      const key = this.dateKey(date);
      const q = query(
        collection(db, this.collectionName),
        where("date", "==", key),
      );
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as DayNoteType) }))
        .sort((a, b) => {
          const aTime = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error("Erro ao buscar anotações do dia: ", error);
      return [];
    }
  }

  static async create(date: Date, text: string): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, this.collectionName), {
        date: this.dateKey(date),
        text,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error("Erro ao criar anotação: ", error);
      return null;
    }
  }

  static async update(id: string, text: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), {
        text,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar anotação: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar anotação: ", error);
      return false;
    }
  }
}

export default DayNoteRepository;
