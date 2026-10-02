import { db } from "@/services/firebaseConfig";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { ReservationEmailConfigType } from "@/types";
import {
  RESERVATION_EMAIL_DOC,
  mergeReservationEmailConfig,
} from "@/utils/reservationEmail";

// Diferente dos outros repositórios, este LANÇA erro em vez de devolver um
// valor vazio: se o carregamento falhar, o editor não pode mostrar o conteúdo
// padrão como se fosse o salvo (e o admin acabar salvando por cima).
class ReservationEmailRepository {
  static async get(): Promise<{
    config: ReservationEmailConfigType;
    updatedAt: Date | null;
  }> {
    const snapshot = await getDoc(
      doc(db, RESERVATION_EMAIL_DOC.collection, RESERVATION_EMAIL_DOC.id),
    );
    const data = snapshot.exists() ? snapshot.data() : null;
    return {
      config: mergeReservationEmailConfig(data),
      updatedAt: (data?.updatedAt as Timestamp | undefined)?.toDate?.() ?? null,
    };
  }

  static async save(config: ReservationEmailConfigType): Promise<void> {
    await setDoc(
      doc(db, RESERVATION_EMAIL_DOC.collection, RESERVATION_EMAIL_DOC.id),
      { ...config, updatedAt: serverTimestamp() },
    );
  }
}

export default ReservationEmailRepository;
