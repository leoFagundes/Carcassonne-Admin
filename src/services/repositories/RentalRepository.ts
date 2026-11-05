import { db } from "@/services/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { RentalType } from "@/types";

type RentalWithId = RentalType & { id: string };

function sortNewestFirst(list: RentalWithId[]) {
  return list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

// Somente leitura: os aluguéis são criados e alterados pelas rotas do servidor.
class RentalRepository {
  static collectionName = "rentals";

  static subscribeToCustomer(
    uid: string,
    callback: (rentals: RentalWithId[]) => void
  ): () => void {
    const q = query(collection(db, this.collectionName), where("customerUid", "==", uid));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(
          sortNewestFirst(
            snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as RentalType) }))
          )
        );
      },
      (error) => {
        console.error("Erro ao ouvir aluguéis do cliente:", error);
        callback([]);
      }
    );
  }

  static subscribeToAll(callback: (rentals: RentalWithId[]) => void): () => void {
    return onSnapshot(
      collection(db, this.collectionName),
      (snapshot) => {
        callback(
          sortNewestFirst(
            snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as RentalType) }))
          )
        );
      },
      (error) => {
        console.error("Erro ao ouvir aluguéis:", error);
        callback([]);
      }
    );
  }
}

export default RentalRepository;
