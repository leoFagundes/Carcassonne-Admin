import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { ComboType } from "@/types";

class ComboRepository {
  static collectionName = "combos";

  static async getAll(): Promise<(ComboType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as ComboType),
      }));
    } catch (error) {
      console.error("Erro ao buscar combos: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(ComboType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as ComboType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar combo por ID: ", error);
      return null;
    }
  }

  static async create(data: ComboType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Combo criado com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar combo: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<ComboType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Combo atualizado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar combo: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Combo deletado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar combo: ", error);
      return false;
    }
  }
}

export default ComboRepository;
