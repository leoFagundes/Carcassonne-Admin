import { db } from "@/services/firebaseConfig";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { RentalCustomerType } from "@/types";

type RentalCustomerWithId = RentalCustomerType & { id: string };

// Somente leitura: o cadastro é gravado pela rota /api/rental/profile.
class RentalCustomerRepository {
  static collectionName = "rentalCustomers";

  static subscribeToOwn(
    uid: string,
    callback: (customer: RentalCustomerWithId | null) => void
  ): () => void {
    return onSnapshot(
      doc(db, this.collectionName, uid),
      (snap) => {
        callback(snap.exists() ? { id: snap.id, ...(snap.data() as RentalCustomerType) } : null);
      },
      (error) => {
        console.error("Erro ao ouvir cadastro do cliente:", error);
        callback(null);
      }
    );
  }

  static subscribeToAll(callback: (customers: RentalCustomerWithId[]) => void): () => void {
    return onSnapshot(
      collection(db, this.collectionName),
      (snapshot) => {
        const customers = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as RentalCustomerType),
        }));
        callback(customers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      },
      (error) => {
        console.error("Erro ao ouvir clientes do aluguel:", error);
        callback([]);
      }
    );
  }
}

export default RentalCustomerRepository;
