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
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { ReserveType } from "@/types";
import {
  generateReserveCode,
  normalizeReserveCode,
} from "@/utils/utilFunctions";

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
      today.setHours(0, 0, 0, 0); // Zera horÃ¡rio pra pegar sÃ³ a data exata

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
            reservaDate.getMonth() === month - 1 // JS comeÃ§a em 0
          );
        });
    } catch (error) {
      console.error("Erro ao buscar reservas por mÃªs: ", error);
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

  // Lança erro se a consulta falhar (rede etc.) — quem chama decide o que
  // fazer, em vez de seguir com um código vazio.
  static async generateUniqueCode(): Promise<string> {
    const colRef = collection(db, this.collectionName);
    let code: string;
    let exists: boolean;
    do {
      code = generateReserveCode();
      // Códigos novos têm 8 caracteres e os antigos 6, então só é preciso
      // conferir colisão com outros códigos novos (sempre em minúsculas).
      const snapshot = await getDocs(query(colRef, where("code", "==", code)));
      exists = !snapshot.empty;
    } while (exists);
    return code;
  }

  /**
   * Busca uma reserva pelo código, ignorando maiúsculas/minúsculas, espaços e
   * "#". Retorna null se não existir e LANÇA erro se a consulta falhar — a
   * tela precisa diferenciar "código errado" de "não deu pra consultar".
   */
  static async findByCode(
    rawCode: string
  ): Promise<(ReserveType & { id: string }) | null> {
    const normalized = normalizeReserveCode(rawCode);
    if (!normalized) return null;

    // Códigos novos são salvos em minúsculas; os antigos foram salvos em
    // maiúsculas (e alguns registros bem antigos com "#" na frente).
    const variants = Array.from(
      new Set([
        normalized,
        normalized.toUpperCase(),
        `#${normalized}`,
        `#${normalized.toUpperCase()}`,
      ])
    );
    const snapshot = await getDocs(
      query(
        collection(db, this.collectionName),
        where("code", "in", variants)
      )
    );
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as ReserveType) };
  }

  static async getAll(): Promise<(ReserveType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as ReserveType;
          return { id: docSnap.id, ...data };
        })
        .sort((a, b) => {
          // Registros antigos podem nÃ£o ter createdAt â€” ficam no final
          const aTime = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
          const bTime = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
          return bTime - aTime;
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
  //
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
      return true;
    } catch (error) {
      console.error("Erro ao atualizar reserva: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
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
        return false;
      }

      await Promise.all(
        reservasDoMes.map((reserva) => this.delete(reserva.id))
      );
      return true;
    } catch (error) {
      console.error("Erro ao deletar reservas do mÃªs especificado:", error);
      return false;
    }
  }
}

export default ReserveRepository;
