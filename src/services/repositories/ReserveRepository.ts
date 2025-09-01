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
  serverTimestamp,
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

  static async getFromTodayOn(): Promise<(ReserveType & { id: string })[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Zera horário pra pegar só a data exata

      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as ReserveType;
          return {
            id: docSnap.id,
            ...data,
          };
        })
        .filter((reserva) => {
          const reservaDate = this.parseBookingDate(reserva.bookingDate);
          reservaDate.setHours(0, 0, 0, 0);
          return reservaDate >= today;
        });
    } catch (error) {
      console.error("Erro ao buscar reservas a partir de hoje: ", error);
      return [];
    }
  }

  static async getByMonth(
    year: number,
    month: number // 1 = Janeiro, 12 = Dezembro
  ): Promise<(ReserveType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as ReserveType;
          return {
            id: docSnap.id,
            ...data,
          };
        })
        .filter((reserva) => {
          const reservaDate = this.parseBookingDate(reserva.bookingDate);
          return (
            reservaDate.getFullYear() === year &&
            reservaDate.getMonth() === month - 1 // JS começa em 0
          );
        });
    } catch (error) {
      console.error("Erro ao buscar reservas por mês: ", error);
      return [];
    }
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

  // static async create(data: ReserveType) {
  //   try {
  //     await addDoc(collection(db, this.collectionName), data);
  //     console.log("Reserva criada com sucesso.");
  //     return true;
  //   } catch (error) {
  //     console.error("Erro ao criar reserva: ", error);
  //     return false;
  //   }
  // }

  static async create(data: ReserveType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });

      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Falha ao confirmar reserva");
      }

      const createdReserve = {
        _id: docSnap.id,
        ...(docSnap.data() as ReserveType),
      };

      console.log("Reserva criada com sucesso:", createdReserve);
      return createdReserve;
    } catch (error) {
      console.error("Erro ao criar reserva: ", error);
      return null;
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

  static async deleteByMonth(year: number, month: number) {
    try {
      const reservasDoMes = await this.getByMonth(year, month);

      if (reservasDoMes.length === 0) {
        console.log("Nenhuma reserva encontrada para o mês especificado.");
        return false;
      }

      await Promise.all(
        reservasDoMes.map((reserva) => this.delete(reserva.id))
      );

      console.log(`Todas as reservas de ${month}/${year} foram deletadas.`);
      return true;
    } catch (error) {
      console.error("Erro ao deletar reservas do mês especificado:", error);
      return false;
    }
  }
}

export default ReserveRepository;
