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
} from "firebase/firestore";
import { BolaoMatchType } from "@/types";

class BolaoMatchRepository {
  static collectionName = "bolao-matches";

  static async getByEventId(eventId: string): Promise<(BolaoMatchType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where("eventId", "==", eventId));
      const snapshot = await getDocs(q);

      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BolaoMatchType) }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (error) {
      console.error("Erro ao buscar partidas: ", error);
      return [];
    }
  }

  static async create(data: Omit<BolaoMatchType, "id">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar partida: ", error);
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar partida: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<Omit<BolaoMatchType, "id">>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar partida: ", error);
      return false;
    }
  }
}

export default BolaoMatchRepository;
