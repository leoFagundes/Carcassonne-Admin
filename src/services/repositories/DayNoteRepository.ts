import { db } from "@/services/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { DayNoteType } from "@/types";

class DayNoteRepository {
  static collectionName = "dayNotes";

  private static dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static async getByDate(date: Date): Promise<DayNoteType | null> {
    try {
      const docRef = doc(db, this.collectionName, this.dateKey(date));
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...(snapshot.data() as DayNoteType) };
    } catch (error) {
      console.error("Erro ao buscar anotações do dia: ", error);
      return null;
    }
  }

  static async save(date: Date, text: string): Promise<boolean> {
    try {
      const key = this.dateKey(date);
      const docRef = doc(db, this.collectionName, key);
      await setDoc(
        docRef,
        { date: key, text, updatedAt: serverTimestamp() },
        { merge: true },
      );
      return true;
    } catch (error) {
      console.error("Erro ao salvar anotações do dia: ", error);
      return false;
    }
  }
}

export default DayNoteRepository;
