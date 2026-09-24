import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
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

  static async getByParticipantId(
    eventId: string,
    participantId: string
  ): Promise<(VotingVoteType & { id: string }) | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("eventId", "==", eventId),
        where("participantId", "==", participantId)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...(d.data() as VotingVoteType) };
    } catch (error) {
      console.error("Erro ao buscar voto do participante:", error);
      return null;
    }
  }

  static subscribeToParticipantVote(
    eventId: string,
    participantId: string,
    callback: (vote: (VotingVoteType & { id: string }) | null) => void
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
        else callback({ id: snap.docs[0].id, ...(snap.docs[0].data() as VotingVoteType) });
      },
      () => callback(null)
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

  static async update(
    id: string,
    data: Partial<Omit<VotingVoteType, "id">>
  ): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar voto:", error);
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
