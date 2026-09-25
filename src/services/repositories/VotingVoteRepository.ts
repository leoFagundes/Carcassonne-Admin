import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { VotingVoteType } from "@/types";

class VotingVoteRepository {
  static collectionName = "voting-votes";

  static async getByEventId(eventId: string): Promise<(VotingVoteType & { id: string })[]> {
    try {
      const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as VotingVoteType),
      }));
    } catch (error) {
      console.error("Erro ao buscar votos: ", error);
      return [];
    }
  }

  static subscribeToEventVotes(
    eventId: string,
    callback: (votes: (VotingVoteType & { id: string })[]) => void
  ): () => void {
    const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as VotingVoteType),
          }))
        );
      },
      (error) => {
        console.error("Erro ao ouvir votos:", error);
        callback([]);
      }
    );
  }

  // Cada participante pode ter até 2 votos (2 documentos) por evento.
  static async getAllByParticipantId(
    eventId: string,
    participantId: string
  ): Promise<(VotingVoteType & { id: string })[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("eventId", "==", eventId),
        where("participantId", "==", participantId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as VotingVoteType) }));
    } catch (error) {
      console.error("Erro ao buscar votos do participante:", error);
      return [];
    }
  }

  static subscribeToParticipantVotes(
    eventId: string,
    participantId: string,
    callback: (votes: (VotingVoteType & { id: string })[]) => void
  ): () => void {
    const q = query(
      collection(db, this.collectionName),
      where("eventId", "==", eventId),
      where("participantId", "==", participantId)
    );
    return onSnapshot(
      q,
      (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as VotingVoteType) })));
      },
      () => callback([])
    );
  }

  static async create(data: Omit<VotingVoteType, "id" | "createdAt">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao registrar voto: ", error);
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar voto:", error);
      return false;
    }
  }

  static async deleteAllByEventId(eventId: string): Promise<void> {
    try {
      const votes = await this.getByEventId(eventId);
      await Promise.all(votes.map((v) => deleteDoc(doc(db, this.collectionName, v.id))));
    } catch (error) {
      console.error("Erro ao deletar votos:", error);
    }
  }
}

export default VotingVoteRepository;
