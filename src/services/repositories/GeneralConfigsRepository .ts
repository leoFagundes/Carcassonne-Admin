import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { GeneralConfigsType } from "@/types";

class GeneralConfigsRepository {
  static collectionName = "general-configs";

  static async get(): Promise<GeneralConfigsType | null> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const configDoc = snapshot.docs[0];
        return {
          _id: configDoc.id,
          ...(configDoc.data() as Omit<GeneralConfigsType, "_id">),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar configuraÃ§Ã£o geral: ", error);
      return null;
    }
  }

  static async create(data: Omit<GeneralConfigsType, "_id">): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (!snapshot.empty) {
        console.warn("JÃ¡ existe uma configuraÃ§Ã£o geral. CriaÃ§Ã£o bloqueada.");
        return false;
      }

      const docRef = await addDoc(collection(db, this.collectionName), data);
      return true;
    } catch (error) {
      console.error("Erro ao criar configuraÃ§Ã£o geral: ", error);
      return false;
    }
  }

  static async update(
    data: Partial<Omit<GeneralConfigsType, "_id">>
  ): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) {
        console.warn("Nenhuma configuraÃ§Ã£o encontrada para atualizar.");
        return false;
      }

      const configDoc = snapshot.docs[0];
      await updateDoc(doc(db, this.collectionName, configDoc.id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar configuraÃ§Ã£o geral: ", error);
      return false;
    }
  }

  static async delete(): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) {
        console.warn("Nenhuma configuraÃ§Ã£o encontrada para deletar.");
        return false;
      }

      const configDoc = snapshot.docs[0];
      await deleteDoc(doc(db, this.collectionName, configDoc.id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar configuraÃ§Ã£o geral: ", error);
      return false;
    }
  }
}

export default GeneralConfigsRepository;
