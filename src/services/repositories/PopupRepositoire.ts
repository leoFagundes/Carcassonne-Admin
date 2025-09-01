import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { PopupType } from "@/types";

class PopupRepository {
  static collectionName = "popups";

  static async getAll(): Promise<PopupType[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PopupType, "id">),
      }));
    } catch (error) {
      console.error("Erro ao buscar popups: ", error);
      return [];
    }
  }

  static async create(data: Omit<PopupType, "id">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Popup criado com ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar popup: ", error);
      return null;
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<PopupType, "id">>
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      console.log("Popup atualizado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar popup: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Popup deletado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar popup: ", error);
      return false;
    }
  }
}

export default PopupRepository;
