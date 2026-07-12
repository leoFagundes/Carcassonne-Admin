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
  onSnapshot,
} from "firebase/firestore";
import { QuizQuestionType } from "@/types";

class QuizQuestionRepository {
  static collectionName = "quiz-questions";

  static async getByEventId(eventId: string): Promise<(QuizQuestionType & { id: string })[]> {
    try {
      const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as QuizQuestionType) }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (error) {
      console.error("Erro ao buscar perguntas:", error);
      return [];
    }
  }

  static subscribeToEventQuestions(
    eventId: string,
    callback: (questions: (QuizQuestionType & { id: string })[]) => void
  ): () => void {
    const q = query(collection(db, this.collectionName), where("eventId", "==", eventId));
    return onSnapshot(
      q,
      (snap) => {
        const questions = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as QuizQuestionType) }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        callback(questions);
      },
      (error) => {
        console.error("Erro ao ouvir perguntas:", error);
        callback([]);
      }
    );
  }

  static async create(data: QuizQuestionType): Promise<string | null> {
    try {
      const ref = await addDoc(collection(db, this.collectionName), data);
      return ref.id;
    } catch (error) {
      console.error("Erro ao criar pergunta:", error);
      return null;
    }
  }

  static async update(id: string, data: Partial<QuizQuestionType>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.collectionName, id), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar pergunta:", error);
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar pergunta:", error);
      return false;
    }
  }

  static async deleteAllByEventId(eventId: string): Promise<void> {
    try {
      const questions = await this.getByEventId(eventId);
      await Promise.all(questions.map((q) => deleteDoc(doc(db, this.collectionName, q.id))));
    } catch (error) {
      console.error("Erro ao deletar perguntas:", error);
    }
  }
}

export default QuizQuestionRepository;
