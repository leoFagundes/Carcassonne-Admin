import { db } from "@/services/firebaseConfig";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { RentalGameType } from "@/types";

type RentalGameWithId = RentalGameType & { id: string };

// As regras do Firestore só deixam o navegador criar com `bookings: []`, editar
// sem tocar em `bookings` e apagar com `bookings` vazio — as reservas são
// gravadas apenas pelo servidor.
class RentalGameRepository {
  static collectionName = "rentalGames";

  static subscribeToAll(callback: (games: RentalGameWithId[]) => void): () => void {
    return onSnapshot(
      collection(db, this.collectionName),
      (snapshot) => {
        const games = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as RentalGameType),
        }));
        callback(games.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      },
      (error) => {
        console.error("Erro ao ouvir jogos para aluguel:", error);
        callback([]);
      }
    );
  }

  static async create(
    data: Omit<RentalGameType, "id" | "bookings" | "createdAt" | "updatedAt">
  ): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, this.collectionName), {
        ...data,
        bookings: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error("Erro ao criar jogo para aluguel: ", error);
      return null;
    }
  }

  static async update(
    id: string,
    patch: Partial<Omit<RentalGameType, "id" | "bookings" | "createdAt">>
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar jogo para aluguel: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir jogo para aluguel: ", error);
      return false;
    }
  }
}

export default RentalGameRepository;
