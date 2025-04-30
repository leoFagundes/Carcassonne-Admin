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
import { InfoType } from "@/types";

class InfoRepository {
  static collectionName = "infos";

  static async getAll(): Promise<(InfoType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as InfoType),
      }));
    } catch (error) {
      console.error("Erro ao buscar informações: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(InfoType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as InfoType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar informação por ID: ", error);
      return null;
    }
  }

  static async create(data: InfoType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Informação criada com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar informação: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<InfoType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Informação atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar informação: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Informação deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar informação: ", error);
      return false;
    }
  }
}

export default InfoRepository;
