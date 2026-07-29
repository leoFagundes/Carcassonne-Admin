import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { SnakeMode, SnakeScoreType } from "@/types";

// Quantos registros buscar antes de filtrar por modo no cliente — evita
// precisar de um índice composto (where "mode" + orderBy "score" em campos
// diferentes). A coleção só ganha uma entrada por recorde batido, então é
// pequena; um lote generoso cobre os dois modos com folga.
const FETCH_BATCH_SIZE = 100;

class SnakeScoreRepository {
  static collectionName = "snakeScores";

  static async getTopScores(
    mode: SnakeMode,
    count: number = 10
  ): Promise<(SnakeScoreType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(
        query(colRef, orderBy("score", "desc"), limit(FETCH_BATCH_SIZE))
      );
      return snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as SnakeScoreType),
        }))
        .filter((entry) => (entry.mode ?? "normal") === mode)
        .slice(0, count);
    } catch (error) {
      console.error("Erro ao buscar placar do snake: ", error);
      return [];
    }
  }

  static async create(data: SnakeScoreType) {
    try {
      await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar pontuação do snake: ", error);
      return false;
    }
  }
}

export default SnakeScoreRepository;
