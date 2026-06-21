import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { EventItemType } from "@/types";

class EventRepository {
  static collectionName = "events";

  static async getAll(): Promise<(EventItemType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as EventItemType;
          return { id: docSnap.id, ...data };
        })
        .sort((a, b) => {
          const aTime = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error("Erro ao buscar eventos: ", error);
      return [];
    }
  }

  static async create(data: Omit<EventItemType, "id" | "createdAt">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar evento: ", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<Omit<EventItemType, "id">>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar evento: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar evento: ", error);
      return false;
    }
  }
}

export default EventRepository;
