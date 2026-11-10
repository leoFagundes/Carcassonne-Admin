import { db } from "@/services/firebaseConfig";
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";

/**
 * Quantas pessoas vieram de fato num dia (com e sem reserva), anotado pela
 * equipe na página de Reservas. Um documento por dia: /dayAttendance/{YYYY-MM-DD}.
 */
export interface DayAttendanceType {
  date: string;
  people: number;
}

class DayAttendanceRepository {
  static collectionName = "dayAttendance";

  static async get(date: string): Promise<number | null> {
    try {
      const snap = await getDoc(doc(db, this.collectionName, date));
      const people = snap.exists() ? Number(snap.data()?.people) : NaN;
      return Number.isFinite(people) ? people : null;
    } catch (error) {
      console.error("Erro ao ler o público do dia:", error);
      return null;
    }
  }

  /** `null` apaga (volta a contar pelas reservas). */
  static async set(date: string, people: number | null): Promise<boolean> {
    try {
      const ref = doc(db, this.collectionName, date);
      if (people === null) await deleteDoc(ref);
      else await setDoc(ref, { date, people, updatedAt: serverTimestamp() });
      return true;
    } catch (error) {
      console.error("Erro ao salvar o público do dia:", error);
      return false;
    }
  }

  static async getAll(): Promise<DayAttendanceType[]> {
    try {
      const snap = await getDocs(collection(db, this.collectionName));
      return snap.docs
        .map((d) => ({ date: d.id, people: Number(d.data()?.people) }))
        .filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.date) && Number.isFinite(a.people));
    } catch (error) {
      console.error("Erro ao ler o público dos dias:", error);
      return [];
    }
  }
}

export default DayAttendanceRepository;
