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
import { User } from "@/types";

class UserRepository {
  static collectionName = "users";

  static async getAll(): Promise<(User & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("email", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as User),
      }));
    } catch (error) {
      console.error("Erro ao buscar usuÃ¡rios: ", error);
      return [];
    }
  }

  static async getById(id: string): Promise<(User & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as User) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar usuÃ¡rio por ID: ", error);
      return null;
    }
  }

  static async create(data: User) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      return true;
    } catch (error) {
      console.error("Erro ao criar usuÃ¡rio: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<User>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar usuÃ¡rio: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar usuÃ¡rio: ", error);
      return false;
    }
  }
}

export default UserRepository;
