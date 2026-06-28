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
import { TypeOrderType } from "@/types";

class TypesOrderRepository {
  static collectionName = "typesOrder";

  static async getAll(): Promise<(TypeOrderType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(
        query(colRef, orderBy("type.order", "asc"))
      );
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as TypeOrderType),
      }));
    } catch (error) {
      console.error("Erro ao buscar ordenaÃ§Ãµes de tipos:", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(TypeOrderType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as TypeOrderType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar ordenaÃ§Ã£o por ID:", error);
      return null;
    }
  }

  static async create(data: TypeOrderType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);

      return {
        id: docRef.id,
        ...data,
      };
    } catch (error) {
      console.error("Erro ao criar ordenaÃ§Ã£o:", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<TypeOrderType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar ordenaÃ§Ã£o:", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar ordenaÃ§Ã£o:", error);
      return false;
    }
  }
}

export default TypesOrderRepository;
