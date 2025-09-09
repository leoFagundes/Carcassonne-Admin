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
  serverTimestamp,
} from "firebase/firestore";
import { MusicRecommendation } from "@/types";

class MusicRecommendationRepository {
  static collectionName = "musicRecommendations";

  static async getAll(): Promise<(MusicRecommendation & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(
        query(colRef, orderBy("createdAt", "desc"))
      );
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as MusicRecommendation),
      }));
    } catch (error) {
      console.error("Erro ao buscar recomendações de música: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(MusicRecommendation & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as MusicRecommendation) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar recomendação de música por ID: ", error);
      return null;
    }
  }

  static async create(data: Omit<MusicRecommendation, "createdAt">) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      console.log("Recomendação criada com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar recomendação de música: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<MusicRecommendation>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Recomendação atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar recomendação de música: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Recomendação deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar recomendação de música: ", error);
      return false;
    }
  }
}

export default MusicRecommendationRepository;
