import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { PopupType } from "@/types";

class PopupRepository {
  static collectionName = "popups";

  static async getAll(): Promise<(PopupType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      // Popups criados antes do agendamento existir não têm o campo
      // `schedules` salvo no Firestore — sem esse fallback, qualquer
      // `.length`/`.map` nele quebraria pra esses registros antigos.
      return snapshot.docs.map((d) => {
        const data = d.data() as Omit<PopupType, "id">;
        return {
          id: d.id,
          ...data,
          schedules: data.schedules ?? [],
        };
      });
    } catch (error) {
      console.error("Erro ao buscar popups: ", error);
      return [];
    }
  }

  static async create(
    data: Omit<PopupType, "id" | "createdAt">,
  ): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar popup: ", error);
      return null;
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<PopupType, "id">>,
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar popup: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar popup: ", error);
      return false;
    }
  }
}

export default PopupRepository;
