import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  deleteField,
} from "firebase/firestore";
import { EventItemType } from "@/types";

class EventRepository {
  static collectionName = "events";

  static async getAll(): Promise<(EventItemType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as EventItemType;
          return { id: docSnap.id, ...data };
        })
        .sort((a, b) => {
          const aTime = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error("Erro ao buscar eventos: ", error);
      return [];
    }
  }

  static subscribeToAll(
    callback: (events: (EventItemType & { id: string })[]) => void
  ): () => void {
    const colRef = collection(db, this.collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const events = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as EventItemType),
        }));
        callback(events);
      },
      (error) => {
        console.error("Erro ao ouvir eventos:", error);
        callback([]);
      }
    );
  }

  static subscribeToEvent(
    id: string,
    callback: (event: (EventItemType & { id: string }) | null) => void
  ): () => void {
    const eventRef = doc(db, this.collectionName, id);
    return onSnapshot(
      eventRef,
      (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...(snap.data() as EventItemType) });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Erro ao ouvir evento:", error);
        callback(null);
      }
    );
  }

  static async create(data: Omit<EventItemType, "id" | "createdAt">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar evento: ", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<Omit<EventItemType, "id">>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar evento: ", error);
      return false;
    }
  }

  static async startQuiz(id: string): Promise<boolean> {
    return this.update(id, {
      quizStatus: "running",
      quizStartedAt: Timestamp.now(),
    });
  }

  static async endQuiz(id: string): Promise<boolean> {
    return this.update(id, { quizStatus: "finished" });
  }

  static async resetQuiz(id: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), {
        quizStatus: "waiting",
        quizResultsVisible: false,
        quizChampionId: deleteField(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao reiniciar quiz:", error);
      return false;
    }
  }

  static async showQuizResults(id: string): Promise<boolean> {
    return this.update(id, { quizResultsVisible: true });
  }

  static async setQuizChampion(id: string, participantId: string): Promise<boolean> {
    return this.update(id, { quizChampionId: participantId });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar evento: ", error);
      return false;
    }
  }
}

export default EventRepository;
