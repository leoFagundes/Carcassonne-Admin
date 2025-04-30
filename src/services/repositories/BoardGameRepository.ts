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
import { BoardgameType } from "@/types";

class BoardgameRepository {
  static collectionName = "boardgames";

  static async getAll(): Promise<(BoardgameType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as BoardgameType),
      }));
    } catch (error) {
      console.error("Erro ao buscar jogos de tabuleiro: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(BoardgameType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...(snapshot.data() as BoardgameType) };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar jogo de tabuleiro por ID: ", error);
      return null;
    }
  }

  static async create(data: BoardgameType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Jogo criado com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar jogo de tabuleiro: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<BoardgameType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Jogo atualizado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar jogo: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Jogo deletado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar jogo: ", error);
      return false;
    }
  }
}

export default BoardgameRepository;
