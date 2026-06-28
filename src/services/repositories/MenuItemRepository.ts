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
import { MenuItemType } from "@/types";

class MenuItemRepository {
  static collectionName = "menuItems";

  static async getAll(): Promise<(MenuItemType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as MenuItemType),
      }));
    } catch (error) {
      console.error("Erro ao buscar itens do cardÃ¡pio: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(MenuItemType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as MenuItemType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar item do cardÃ¡pio por ID: ", error);
      return null;
    }
  }

  static async create(data: MenuItemType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      return true;
    } catch (error) {
      console.error("Erro ao criar item do cardÃ¡pio: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<MenuItemType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const currentSnap = await getDoc(docRef);

      if (!currentSnap.exists()) {
        console.error("Item do cardÃ¡pio nÃ£o encontrado.");
        return false;
      }

      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar item do cardÃ¡pio: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Erro ao deletar item do cardÃ¡pio: ", error);
      return false;
    }
  }
}

export default MenuItemRepository;
