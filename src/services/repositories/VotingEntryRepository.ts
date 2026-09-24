import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { VotingEntryType } from "@/types";

function sortEntries(list: (VotingEntryType & { id: string })[]) {
  return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

class VotingEntryRepository {
  static collectionName = "voting-entries";

  static async getByEventId(eventId: string): Promise<(VotingEntryType & { id: string })[]> {
    try {
      const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
      const snapshot = await getDocs(q);
      return sortEntries(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as VotingEntryType),
        }))
      );
    } catch (error) {
      console.error("Erro ao buscar fantasias: ", error);
      return [];
    }
  }

  static subscribeToEventEntries(
    eventId: string,
    callback: (entries: (VotingEntryType & { id: string })[]) => void
  ): () => void {
    const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
    return onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as VotingEntryType),
        }));
        callback(sortEntries(entries));
      },
      (error) => {
        console.error("Erro ao ouvir fantasias:", error);
        callback([]);
      }
    );
  }

  static async create(data: Omit<VotingEntryType, "id" | "createdAt">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar fantasia: ", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<Omit<VotingEntryType, "id">>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar fantasia: ", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar fantasia: ", error);
      return false;
    }
  }
}

export default VotingEntryRepository;
