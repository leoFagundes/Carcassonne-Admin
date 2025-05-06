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
      console.error("Erro ao buscar configuração geral: ", error);
      return null;
    }
  }

  static async create(data: Omit<GeneralConfigsType, "_id">): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (!snapshot.empty) {
        console.warn("Já existe uma configuração geral. Criação bloqueada.");
        return false;
      }

      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Configuração criada com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar configuração geral: ", error);
      return false;
    }
  }

  static async update(
    data: Partial<Omit<GeneralConfigsType, "_id">>
  ): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) {
        console.warn("Nenhuma configuração encontrada para atualizar.");
        return false;
      }

      const configDoc = snapshot.docs[0];
      await updateDoc(doc(db, this.collectionName, configDoc.id), data);
      console.log("Configuração atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar configuração geral: ", error);
      return false;
    }
  }

  static async delete(): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) {
        console.warn("Nenhuma configuração encontrada para deletar.");
        return false;
      }

      const configDoc = snapshot.docs[0];
      await deleteDoc(doc(db, this.collectionName, configDoc.id));
      console.log("Configuração deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar configuração geral: ", error);
      return false;
    }
  }
}

export default GeneralConfigsRepository;
