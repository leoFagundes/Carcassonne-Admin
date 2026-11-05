import { db } from "@/services/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { AdminAccessStatus, AdminRequestType, AdminType } from "@/types";

// O ID de cada documento é o UID da conta no Firebase Auth — é isso que as
// regras do Firestore checam em isAdmin().
class AdminRepository {
  static adminsCollection = "admins";
  static requestsCollection = "adminRequests";

  static async getAccessStatus(uid: string): Promise<AdminAccessStatus> {
    const adminSnap = await getDoc(doc(db, this.adminsCollection, uid));
    if (adminSnap.exists()) return "admin";
    const requestSnap = await getDoc(doc(db, this.requestsCollection, uid));
    return requestSnap.exists() ? "pending" : "none";
  }

  // Não engole o erro (como getAccessStatus): quem chama precisa diferenciar
  // "não é admin" de "falhou a leitura", pra não deslogar um admin por erro de rede.
  static async getAdmin(uid: string): Promise<(AdminType & { id: string }) | null> {
    const snap = await getDoc(doc(db, this.adminsCollection, uid));
    return snap.exists() ? { id: snap.id, ...(snap.data() as AdminType) } : null;
  }

  static subscribeToAdmins(
    callback: (admins: (AdminType & { id: string })[]) => void
  ): () => void {
    return onSnapshot(
      collection(db, this.adminsCollection),
      (snapshot) => {
        callback(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as AdminType) }))
        );
      },
      (error) => {
        console.error("Erro ao ouvir administradores:", error);
        callback([]);
      }
    );
  }

  static subscribeToRequests(
    callback: (requests: (AdminRequestType & { id: string })[]) => void
  ): () => void {
    return onSnapshot(
      collection(db, this.requestsCollection),
      (snapshot) => {
        callback(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as AdminRequestType) }))
        );
      },
      (error) => {
        console.error("Erro ao ouvir pedidos de acesso:", error);
        callback([]);
      }
    );
  }

  // Chamado no /signup logo após criar a conta (a pessoa já está logada nela).
  static async requestAccess(uid: string, email: string): Promise<boolean> {
    try {
      await setDoc(doc(db, this.requestsCollection, uid), {
        email,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error("Erro ao criar pedido de acesso: ", error);
      return false;
    }
  }

  // Cria o admin e apaga o pedido na mesma operação.
  static async approve(uid: string, email: string): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, this.adminsCollection, uid), {
        role: "admin",
        email,
        createdAt: serverTimestamp(),
      });
      batch.delete(doc(db, this.requestsCollection, uid));
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Erro ao aprovar pedido de acesso: ", error);
      return false;
    }
  }

  static async reject(uid: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.requestsCollection, uid));
      return true;
    } catch (error) {
      console.error("Erro ao recusar pedido de acesso: ", error);
      return false;
    }
  }

  static async revoke(uid: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, this.adminsCollection, uid));
      return true;
    } catch (error) {
      console.error("Erro ao remover administrador: ", error);
      return false;
    }
  }

  static async update(uid: string, data: Partial<Omit<AdminType, "id">>): Promise<boolean> {
    try {
      await updateDoc(doc(db, this.adminsCollection, uid), data);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar administrador: ", error);
      return false;
    }
  }
}

export default AdminRepository;
