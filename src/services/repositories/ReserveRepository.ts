// src/repositories/ReserveRepository.ts
import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ReserveType } from "@/types";

class ReserveRepository {
  static collectionName = "reserves";

  // Converte o formato { day, month, year } para Date
  private static parseBookingDate(bookingDate: {
    day: string;
    month: string;
    year: string;
  }): Date {
    return new Date(
      Number(bookingDate.year),
      Number(bookingDate.month) - 1,
      Number(bookingDate.day)
    );
  }

  static async getByDate(
    date: Date
  ): Promise<(ReserveType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((doc) => {
          const data = doc.data() as ReserveType;
          return {
            id: doc.id,
            ...data,
          };
        })
        .filter((reserva) => {
          const reservaDate = this.parseBookingDate(reserva.bookingDate);
          return (
            reservaDate.getFullYear() === date.getFullYear() &&
            reservaDate.getMonth() === date.getMonth() &&
            reservaDate.getDate() === date.getDate()
          );
        });
    } catch (error) {
      console.error("Erro ao buscar reservas por data: ", error);
      return [];
    }
  }

  static async getAll(): Promise<(ReserveType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as ReserveType;
        return {
          id: docSnap.id,
          ...data,
        };
      });
    } catch (error) {
      console.error("Erro ao buscar reservas: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(ReserveType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) return null;

      const data = snapshot.data() as ReserveType;

      return {
        id: snapshot.id,
        ...data,
      };
    } catch (error) {
      console.error("Erro ao buscar reserva por ID: ", error);
      return null;
    }
  }

  static async create(data: ReserveType) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...reserveData } = data;
      await addDoc(collection(db, this.collectionName), reserveData);
      console.log("Reserva criada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao criar reserva: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<ReserveType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Reserva atualizada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar reserva: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Reserva deletada com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar reserva: ", error);
      return false;
    }
  }
}

export default ReserveRepository;
