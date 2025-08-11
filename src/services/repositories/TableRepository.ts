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
import { TableType } from "@/types";

class TableRepository {
  static collectionName = "tables";

  static async getAll(): Promise<(TableType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("code", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as TableType),
      }));
    } catch (error) {
      console.error("Erro ao buscar mesas: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(TableType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as TableType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar mesa por ID: ", error);
      return null;
    }
  }

  static async create(data: TableType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Mesa criada com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar mesa: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<TableType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Mesa atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar mesa: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Mesa deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar mesa: ", error);
      return false;
    }
  }
}

export default TableRepository;
