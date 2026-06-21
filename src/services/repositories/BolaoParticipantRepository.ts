import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { BolaoParticipantType } from "@/types";

class BolaoParticipantRepository {
  static collectionName = "bolao-participants";

  static async getByParticipantId(
    eventId: string,
    participantId: string
  ): Promise<(BolaoParticipantType & { id: string }) | null> {
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(
        colRef,
        where("eventId", "==", eventId),
        where("participantId", "==", participantId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...(docSnap.data() as BolaoParticipantType) };
    } catch (error) {
      console.error("Erro ao buscar participante: ", error);
      return null;
    }
  }

  static async getByEventId(eventId: string): Promise<(BolaoParticipantType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where("eventId", "==", eventId));
      const snapshot = await getDocs(q);

      return snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BolaoParticipantType) }))
        .sort((a, b) => {
          const aTime = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
          return aTime - bTime;
        });
    } catch (error) {
      console.error("Erro ao buscar participantes: ", error);
      return [];
    }
  }

  static async create(data: Omit<BolaoParticipantType, "id" | "createdAt">): Promise<string | null> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar palpite: ", error);
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar palpite: ", error);
      return false;
    }
  }

  static async deleteAllByEventId(eventId: string): Promise<boolean> {
    try {
      const participants = await this.getByEventId(eventId);
      await Promise.all(participants.map((p) => this.delete(p.id)));
      return true;
    } catch (error) {
      console.error("Erro ao deletar todos os palpites: ", error);
      return false;
    }
  }
}

export default BolaoParticipantRepository;
