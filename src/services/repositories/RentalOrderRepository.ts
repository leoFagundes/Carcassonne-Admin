import { db } from "@/services/firebaseConfig";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { RentalOrderType } from "@/types";

type OrderWithId = RentalOrderType & { id: string };

function sortNewestFirst(list: OrderWithId[]) {
  return list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

// Somente leitura: os pedidos são criados e alterados pelas rotas do servidor.
class RentalOrderRepository {
  static collectionName = "rentalOrders";

  /** Pedido em tempo real; null se não existir ou não for do usuário (regra do Firestore). */
  static subscribe(orderId: string, callback: (order: OrderWithId | null) => void): () => void {
    return onSnapshot(
      doc(db, this.collectionName, orderId),
      (snap) => callback(snap.exists() ? { id: snap.id, ...(snap.data() as RentalOrderType) } : null),
      (error) => {
        console.error("Erro ao ouvir o pedido:", error);
        callback(null);
      }
    );
  }

  static subscribeToCustomer(
    uid: string,
    callback: (orders: OrderWithId[]) => void
  ): () => void {
    const q = query(collection(db, this.collectionName), where("customerUid", "==", uid));
    return onSnapshot(
      q,
      (snapshot) => {
        callback(
          sortNewestFirst(
            snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as RentalOrderType) }))
          )
        );
      },
      (error) => {
        console.error("Erro ao ouvir pedidos do cliente:", error);
        callback([]);
      }
    );
  }
}

export default RentalOrderRepository;
