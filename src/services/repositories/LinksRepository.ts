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
import { LinkType } from "@/types";

class LinksRepository {
  static collectionName = "links";

  static async getAll(): Promise<(LinkType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as LinkType),
      }));
    } catch (error) {
      console.error("Erro ao buscar links: ", error);
      return [];
    }
  }

  static async getById(
    id: string,
  ): Promise<(LinkType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as LinkType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar link por ID: ", error);
      return null;
    }
  }

  static async create(data: LinkType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Link criado com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar link: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<LinkType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Link atualizado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar link: ", error);
      return false;
    }
  }

  static async updateOrder(updates: { id: string; order: number }[]) {
    // Ex: batch update no Firestore, Supabase, etc.
    await Promise.all(
      updates.map(({ id, order }) =>
        // sua lógica de update aqui, ex:
        updateDoc(doc(db, "links", id), { order }),
      ),
    );
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Link deletado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar link: ", error);
      return false;
    }
  }
}

export default LinksRepository;
