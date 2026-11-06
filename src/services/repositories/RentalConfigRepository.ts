import { db } from "@/services/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { RentalRuleSection, RentalRulesType, RentalSettingsType } from "@/types";
import { DEFAULT_RENTAL_RULES, DEFAULT_RENTAL_SETTINGS, mergeRentalSettings } from "@/rental/defaults";

class RentalConfigRepository {
  static collectionName = "rental-config";
  static settingsDoc = "settings";
  static rulesDoc = "rules";

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

  // Cada publicação sobe a versão; os pedidos guardam a versão aceita.
  static async publishRules(sections: RentalRuleSection[]): Promise<boolean> {
    try {
      const ref = doc(db, this.collectionName, this.rulesDoc);
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        await setDoc(ref, {
          sections,
          version: DEFAULT_RENTAL_RULES.version + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(
          ref,
          { sections, version: increment(1), updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
      return true;
    } catch (error) {
      console.error("Erro ao publicar regras do aluguel: ", error);
      return false;
    }
  }
}

export default RentalConfigRepository;
