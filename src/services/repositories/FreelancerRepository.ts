import { db } from "@/services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { FreelancerControllType } from "@/types";

class FreelancerRepository {
  static collectionName = "freelancers";

  static async getAll(): Promise<(FreelancerControllType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as FreelancerControllType),
      }));
    } catch (error) {
      console.error("Erro ao buscar freelancers: ", error);
      return [];
    }
  }

  static async getByDate(
    date: Date
  ): Promise<(FreelancerControllType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);

      return snapshot.docs
        .map((doc) => {
          const data = doc.data() as FreelancerControllType;
          return {
            id: doc.id,
            ...data,
          };
        })
        .filter((freelancer) => {
          const { day, month, year } = freelancer.bookingDate;
          const bookingDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
          );
          return (
            bookingDate.getFullYear() === date.getFullYear() &&
            bookingDate.getMonth() === date.getMonth() &&
            bookingDate.getDate() === date.getDate()
          );
        });
    } catch (error) {
      console.error("Erro ao buscar freelancers por data: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(FreelancerControllType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...(snapshot.data() as FreelancerControllType),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar freelancer por ID: ", error);
      return null;
    }
  }

  static async create(data: FreelancerControllType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), data);
      console.log("Freelancer criado com ID:", docRef.id);
      return true;
    } catch (error) {
      console.error("Erro ao criar freelancer: ", error);
      return false;
    }
  }

  static async update(id: string, data: Partial<FreelancerControllType>) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);
      console.log("Freelancer atualizado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar freelancer: ", error);
      return false;
    }
  }

  static async delete(id: string) {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
      console.log("Freelancer deletado com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao deletar freelancer: ", error);
      return false;
    }
  }
}

export default FreelancerRepository;
