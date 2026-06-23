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
import { QuizParticipantType } from "@/types";

function sortParticipants(list: (QuizParticipantType & { id: string })[]) {
  return list.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return (a.timeTakenSeconds ?? 99999) - (b.timeTakenSeconds ?? 99999);
  });
}

class QuizParticipantRepository {
  static collectionName = "quiz-participants";

  static subscribeToParticipant(
    eventId: string,
    participantId: string,
    callback: (p: (QuizParticipantType & { id: string }) | null) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where("eventId", "==", eventId),
      where("participantId", "==", participantId)
    );
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) callback(null);
        else callback({ id: snap.docs[0].id, ...(snap.docs[0].data() as QuizParticipantType) });
      },
      () => callback(null)
    );
  }

  static subscribeToEventParticipants(
    eventId: string,
    callback: (participants: (QuizParticipantType & { id: string })[]) => void
  ): () => void {
    const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
    return onSnapshot(
      q,
      (snap) => {
        const participants = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as QuizParticipantType),
        }));
        callback(sortParticipants(participants));
      },
      (error) => {
        console.error("Erro ao ouvir participantes do quiz:", error);
        callback([]);
      }
    );
  }

  static async getByEventId(eventId: string): Promise<(QuizParticipantType & { id: string })[]> {
    try {
      const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
      const snap = await getDocs(q);
      return sortParticipants(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizParticipantType) }))
      );
    } catch (error) {
      console.error("Erro ao buscar participantes do quiz:", error);
      return [];
    }
  }

  static async getByParticipantId(
    eventId: string,
    participantId: string
  ): Promise<(QuizParticipantType & { id: string }) | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("eventId", "==", eventId),
        where("participantId", "==", participantId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...(d.data() as QuizParticipantType) };
    } catch (error) {
      console.error("Erro ao buscar participante do quiz:", error);
      return null;
    }
  }

  static async create(
    data: Omit<QuizParticipantType, "id" | "submittedAt">
  ): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, this.collectionName), {
        ...data,
        submittedAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      console.error("Erro ao criar participante do quiz:", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<QuizParticipantType>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar participante do quiz:", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar participante do quiz:", error);
      return false;
    }
  }

  static async deleteAllByEventId(eventId: string): Promise<void> {
    try {
      const participants = await this.getByEventId(eventId);
      await Promise.all(participants.map((p) => deleteDoc(doc(db, this.collectionName, p.id))));
    } catch (error) {
      console.error("Erro ao deletar participantes do quiz:", error);
    }
  }
}

export default QuizParticipantRepository;
