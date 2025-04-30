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
import { DescriptionTypeProps } from "@/types";

class DescriptionRepository {
  static collectionName = "descriptions";

  static async getAll(): Promise<(DescriptionTypeProps & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("type", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as DescriptionTypeProps),
      }));
    } catch (error) {
      console.error("Erro ao buscar descrições: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(DescriptionTypeProps & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...(snapshot.data() as DescriptionTypeProps),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar descrição por ID: ", error);
      return null;
    }
  }

  static async create(data: DescriptionTypeProps) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Descrição criada com ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar descrição: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<DescriptionTypeProps>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Descrição atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar descrição: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Descrição deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar descrição: ", error);
      return false;
    }
  }
}

export default DescriptionRepository;
