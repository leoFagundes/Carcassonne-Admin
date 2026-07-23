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
import { SnakeScoreType } from "@/types";

class SnakeScoreRepository {
  static collectionName = "snakeScores";

  static async getTopScores(
    count: number = 10
  ): Promise<(SnakeScoreType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(
        query(colRef, orderBy("score", "desc"), limit(count))
      );
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as SnakeScoreType),
      }));
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
