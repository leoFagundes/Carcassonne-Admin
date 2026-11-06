import { collection, getDocs, limit, query } from "firebase/firestore";
import { serverDb } from "@/services/firebaseServer";
import type { GeneralConfigsType } from "@/types";

const LOAD_TIMEOUT_MS = 5000;

/**
 * Configurações gerais lidas no servidor (e-mails, prévia de compartilhamento).
 * Nunca derruba quem chama: falha ou demora → null, e cada um usa o padrão.
 */
export async function loadGeneralConfigs(): Promise<GeneralConfigsType | null> {
  try {
    const snapshot = await Promise.race([
      getDocs(query(collection(serverDb, "general-configs"), limit(1))),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Tempo esgotado")), LOAD_TIMEOUT_MS)),
    ]);
    const first = snapshot.docs[0];
    return first ? ({ _id: first.id, ...first.data() } as GeneralConfigsType) : null;
  } catch (error) {
    console.error("Erro ao carregar as configurações gerais:", error);
    return null;
  }
}
