import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Unsubscribe,
  deleteField,
} from "firebase/firestore";
import { GeneralConfigsType, SiteThemeId, SiteThemeReminder, SiteThemeStyle } from "@/types";

class GeneralConfigsRepository {
  static collectionName = "general-configs";

  /**
   * Grava a versão (completa ou minimalista) de um tema, sem mexer nos
   * outros temas. A completa é o padrão: nem fica salva.
   */
  static async setSiteThemeStyle(theme: SiteThemeId, style: SiteThemeStyle): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) return false;
      await updateDoc(doc(db, this.collectionName, snapshot.docs[0].id), {
        [`siteThemeStyles.${theme}`]: style === "full" ? deleteField() : style,
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar a versão do tema: ", error);
      return false;
    }
  }

  /**
   * Grava (ou remove, com `null`) o aviso de um tema, sem mexer nos avisos
   * dos outros temas.
   */
  static async setSiteThemeReminder(
    theme: SiteThemeId,
    reminder: SiteThemeReminder | null,
  ): Promise<boolean> {
    try {
      const snapshot = await getDocs(collection(db, this.collectionName));
      if (snapshot.empty) return false;
      await updateDoc(doc(db, this.collectionName, snapshot.docs[0].id), {
        [`siteThemeReminders.${theme}`]: reminder ?? deleteField(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar o aviso do tema: ", error);
      return false;
    }
  }

  /** Acompanha a configuração em tempo real (ex: troca de tema do site). */
  static subscribe(
    onChange: (configs: GeneralConfigsType | null) => void,
  ): Unsubscribe {
    return onSnapshot(
      collection(db, this.collectionName),
      (snapshot) => {
        const configDoc = snapshot.docs[0];
        onChange(
          configDoc
            ? {
                _id: configDoc.id,
                ...(configDoc.data() as Omit<GeneralConfigsType, "_id">),
              }
            : null,
        );
      },
      (error) => console.error("Erro ao acompanhar a configuração geral: ", error),
    );
  }

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
