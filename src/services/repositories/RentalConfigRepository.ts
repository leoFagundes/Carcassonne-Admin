import { db } from "@/services/firebaseConfig";
import {
  deleteDoc,
  doc,
  getDoc,
  type Timestamp,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { RentalRuleSection, RentalRulesType, RentalSettingsType } from "@/types";
import { DEFAULT_RENTAL_RULES, DEFAULT_RENTAL_SETTINGS, mergeRentalSettings } from "@/rental/defaults";

class RentalConfigRepository {
  static collectionName = "rental-config";
  static settingsDoc = "settings";
  static rulesDoc = "rules";
  /** Rascunho das regras: só o admin usa; o cliente sempre vê o documento publicado. */
  static rulesDraftDoc = "rulesDraft";

  static async getRulesDraft(): Promise<{ sections: RentalRuleSection[]; updatedAt?: Timestamp } | null> {
    try {
      const snap = await getDoc(doc(db, this.collectionName, this.rulesDraftDoc));
      if (!snap.exists()) return null;
      const data = snap.data() as { sections?: RentalRuleSection[]; updatedAt?: Timestamp };
      return Array.isArray(data.sections) ? { sections: data.sections, updatedAt: data.updatedAt } : null;
    } catch (error) {
      console.error("Erro ao ler o rascunho das regras: ", error);
      return null;
    }
  }

  static async saveRulesDraft(sections: RentalRuleSection[]): Promise<boolean> {
    try {
      await setDoc(doc(db, this.collectionName, this.rulesDraftDoc), { sections, updatedAt: serverTimestamp() });
      return true;
    } catch (error) {
      console.error("Erro ao salvar o rascunho das regras: ", error);
      return false;
    }
  }

  static async deleteRulesDraft(): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, this.rulesDraftDoc));
      return true;
    } catch (error) {
      console.error("Erro ao descartar o rascunho das regras: ", error);
      return false;
    }
  }

  static subscribeSettings(callback: (settings: RentalSettingsType) => void): () => void {
    return onSnapshot(
      doc(db, this.collectionName, this.settingsDoc),
      (snap) => {
        callback(
          mergeRentalSettings(snap.exists() ? (snap.data() as Partial<RentalSettingsType>) : undefined)
        );
      },
      (error) => {
        console.error("Erro ao ouvir configurações do aluguel:", error);
        callback(DEFAULT_RENTAL_SETTINGS);
      }
    );
  }

  static subscribeRules(callback: (rules: RentalRulesType) => void): () => void {
    return onSnapshot(
      doc(db, this.collectionName, this.rulesDoc),
      (snap) => {
        callback(snap.exists() ? (snap.data() as RentalRulesType) : DEFAULT_RENTAL_RULES);
      },
      (error) => {
        console.error("Erro ao ouvir regras do aluguel:", error);
        callback(DEFAULT_RENTAL_RULES);
      }
    );
  }

  static async saveSettings(settings: RentalSettingsType): Promise<boolean> {
    try {
      await setDoc(doc(db, this.collectionName, this.settingsDoc), settings);
      return true;
    } catch (error) {
      console.error("Erro ao salvar configurações do aluguel: ", error);
      return false;
    }
  }

  /**
   * Publica as regras com a versão escolhida no editor (normalmente a atual +
   * 0.1). Os pedidos guardam a versão aceita; mudou a versão, o cliente aceita
   * de novo no próximo pedido.
   */
  static async publishRules(sections: RentalRuleSection[], version: number): Promise<boolean> {
    try {
      await setDoc(doc(db, this.collectionName, this.rulesDoc), {
        sections,
        version,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao publicar regras do aluguel: ", error);
      return false;
    }
  }
}

export default RentalConfigRepository;
