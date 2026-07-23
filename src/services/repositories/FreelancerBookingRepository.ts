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
  writeBatch,
} from "firebase/firestore";
import { FreelancerBookingType } from "@/types";

class FreelancerBookingRepository {
  static collectionName = "freelancerBookings";

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

  static async getAll(): Promise<(FreelancerBookingType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as FreelancerBookingType),
      }));
    } catch (error) {
      console.error("Erro ao buscar agendamentos de freelancers: ", error);
      return [];
    }
  }

  static async getByDate(
    date: Date
  ): Promise<(FreelancerBookingType & { id: string })[]> {
    try {
      const all = await this.getAll();
      return all.filter((booking) => {
        const bookingDate = this.parseBookingDate(booking.bookingDate);
        return (
          bookingDate.getFullYear() === date.getFullYear() &&
          bookingDate.getMonth() === date.getMonth() &&
          bookingDate.getDate() === date.getDate()
        );
      });
    } catch (error) {
      console.error(
        "Erro ao buscar agendamentos de freelancers por data: ",
        error
      );
      return [];
    }
  }

  static async getByFreelancerId(
    freelancerId: string
  ): Promise<(FreelancerBookingType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(
        query(colRef, where("freelancerId", "==", freelancerId))
      );
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as FreelancerBookingType),
      }));
    } catch (error) {
      console.error(
        "Erro ao buscar agendamentos do freelancer: ",
        error
      );
      return [];
    }
  }

  static async create(data: FreelancerBookingType) {
    try {
      await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao criar agendamento de freelancer: ", error);
      return false;
    }
  }

  static async createMany(bookings: FreelancerBookingType[]) {
    try {
      const colRef = collection(db, this.collectionName);
      await Promise.all(
        bookings.map((booking) =>
          addDoc(colRef, { ...booking, createdAt: serverTimestamp() })
        )
      );
      return true;
    } catch (error) {
      console.error("Erro ao criar agendamentos de freelancer: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<FreelancerBookingType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar agendamento de freelancer: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      return true;
    } catch (error) {
      console.error("Erro ao deletar agendamento de freelancer: ", error);
      return false;
    }
  }

  // Propaga a mudança de nome do freelancer para todos os agendamentos dele
  // (o nome fica desnormalizado no booking para telas como /myreserves não
  // precisarem cruzar com a coleção de freelancers).
  static async renameFreelancer(freelancerId: string, newName: string) {
    try {
      const bookings = await this.getByFreelancerId(freelancerId);
      if (bookings.length === 0) return true;

      const batch = writeBatch(db);
      bookings.forEach((booking) => {
        batch.update(doc(db, this.collectionName, booking.id), {
          freelancerName: newName,
        });
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error(
        "Erro ao propagar nome do freelancer para os agendamentos: ",
        error
      );
      return false;
    }
  }

  static async deleteAllByFreelancerId(freelancerId: string) {
    try {
      const bookings = await this.getByFreelancerId(freelancerId);
      if (bookings.length === 0) return true;

      const batch = writeBatch(db);
      bookings.forEach((booking) => {
        batch.delete(doc(db, this.collectionName, booking.id));
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error(
        "Erro ao deletar agendamentos do freelancer: ",
        error
      );
      return false;
    }
  }

  // Exclui em massa os agendamentos de um freelancer anteriores à data de corte.
  static async deleteOlderThan(freelancerId: string, cutoffDate: Date) {
    try {
      const bookings = await this.getByFreelancerId(freelancerId);
      const outdated = bookings.filter(
        (booking) => this.parseBookingDate(booking.bookingDate) < cutoffDate
      );
      if (outdated.length === 0) return true;

      const batch = writeBatch(db);
      outdated.forEach((booking) => {
        batch.delete(doc(db, this.collectionName, booking.id));
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error(
        "Erro ao deletar agendamentos antigos do freelancer: ",
        error
      );
      return false;
    }
  }
}

export default FreelancerBookingRepository;
