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
  serverTimestamp,
} from "firebase/firestore";
import { FreelancerType } from "@/types";
import FreelancerBookingRepository from "./FreelancerBookingRepository";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
} from "./FirebaseImageUtils";

class FreelancerRepository {
  static collectionName = "freelancers";

  static async getAll(): Promise<(FreelancerType & { id: string })[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(query(colRef, orderBy("name", "asc")));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as FreelancerType),
      }));
    } catch (error) {
      console.error("Erro ao buscar freelancers: ", error);
      return [];
    }
  }

  static async getById(
    id: string
  ): Promise<(FreelancerType & { id: string }) | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return {
          id: snapshot.id,
          ...(snapshot.data() as FreelancerType),
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar freelancer por ID: ", error);
      return null;
    }
  }

  static async create(data: FreelancerType) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao criar freelancer: ", error);
      return null;
    }
  }

  // Atualiza os dados do freelancer. Se o nome mudar, propaga o novo nome
  // para todos os agendamentos dele (o nome fica desnormalizado nos bookings
  // para a página de reservas não precisar cruzar as duas coleções).
  // Se a foto mudar e a antiga era um upload exclusivo do perfil (não uma
  // referência ao mural), o arquivo antigo é apagado do Storage.
  static async update(id: string, data: Partial<FreelancerType>) {
    try {
      if (data.photoUrl !== undefined) {
        const current = await this.getById(id);
        if (
          current?.photoSource === "upload" &&
          current.photoUrl &&
          current.photoUrl !== data.photoUrl
        ) {
          await deleteImageFromFirebase(
            getPathFromFirebaseUrl(current.photoUrl)
          );
        }
      }

      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, data);

      if (data.name) {
        await FreelancerBookingRepository.renameFreelancer(id, data.name);
      }

      return true;
    } catch (error) {
      console.error("Erro ao atualizar freelancer: ", error);
      return false;
    }
  }

  // Apaga o freelancer, todos os agendamentos dele e, se a foto era um
  // upload exclusivo do perfil (não uma referência ao mural), o arquivo dela.
  static async delete(id: string) {
    try {
      const current = await this.getById(id);

      await FreelancerBookingRepository.deleteAllByFreelancerId(id);
      await deleteDoc(doc(db, this.collectionName, id));

      if (current?.photoSource === "upload" && current.photoUrl) {
        await deleteImageFromFirebase(
          getPathFromFirebaseUrl(current.photoUrl)
        );
      }

      return true;
    } catch (error) {
      console.error("Erro ao deletar freelancer: ", error);
      return false;
    }
  }
}

export default FreelancerRepository;
