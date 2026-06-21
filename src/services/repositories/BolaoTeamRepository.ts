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
import { BolaoTeamType } from "@/types";

class BolaoTeamRepository {
  static collectionName = "bolao-teams";

  static async getByEventId(eventId: string): Promise<(BolaoTeamType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where("eventId", "==", eventId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as BolaoTeamType),
      }));
    } catch (error) {
      console.error("Erro ao buscar times do bolão: ", error);
      return [];
    }
  }

  static async create(data: Omit<BolaoTeamType, "id">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar time: ", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<Omit<BolaoTeamType, "id">>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar time: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar time: ", error);
      return false;
    }
  }
}

export default BolaoTeamRepository;
