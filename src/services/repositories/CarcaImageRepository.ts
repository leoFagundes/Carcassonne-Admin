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
import { CarcaImageType } from "@/types";

class CarcaImageRepository {
  static collectionName = "carcaImages";

  static async getAll(): Promise<(CarcaImageType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(
        query(colRef, orderBy("description", "asc"))
      );
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as CarcaImageType),
      }));
    } catch (error) {
      console.error("Erro ao buscar imagens: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(CarcaImageType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as CarcaImageType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar imagem por ID: ", error);
      return null;
    }
  }

  static async create(data: CarcaImageType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Imagem criada com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar imagem: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<CarcaImageType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Imagem atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar imagem: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Imagem deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar imagem: ", error);
      return false;
    }
  }
}

export default CarcaImageRepository;
