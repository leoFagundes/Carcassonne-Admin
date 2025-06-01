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
import {
  deleteImageFromCloudinary,
  extractPublicIdFromUrl,
} from "./cloudinaryImagesService";

// const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDNINARY_UPLOAD_PRESET as string;
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDNINARY_CLOUD_NAME as string;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDNINARY_API_KEY as string;
const API_SECRET = process.env.NEXT_PUBLIC_CLOUDNINARY_API_SECRET as string;

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
      console.error("Erro ao buscar itens do cardápio: ", error);
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
      console.error("Erro ao buscar item do cardápio por ID: ", error);
      return null;
    }
  }

  static async create(data: MenuItemType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Item do cardápio criado com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar item do cardápio: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<MenuItemType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const currentSnap = await getDoc(docRef);

      if (!currentSnap.exists()) {
        console.error("Item do cardápio não encontrado.");
        return false;
      }

      await updateDoc(docRef, data);
      console.log("Item do cardápio atualizado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar item do cardápio: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const imageUrl = data.image;

        if (imageUrl) {
          const publicId = extractPublicIdFromUrl(imageUrl);
          await deleteImageFromCloudinary(
            publicId,
            API_KEY,
            API_SECRET,
            CLOUD_NAME
          );
        }
      }

      await deleteDoc(docRef);
      console.log("Item do cardápio deletado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar item do cardápio: ", error);
      return false;
    }
  }
}

export default MenuItemRepository;
