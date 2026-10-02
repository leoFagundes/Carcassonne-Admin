import { doc, getDoc } from "firebase/firestore";
import { serverDb } from "@/services/firebaseServer";
import { ReservationEmailConfigType } from "@/types";
import {
  RESERVATION_EMAIL_DOC,
  mergeReservationEmailConfig,
} from "@/utils/reservationEmail";

const LOAD_TIMEOUT_MS = 5000;

/**
 * Conteúdo do e-mail de reserva salvo pelo admin. Nunca impede o envio: se a
 * leitura falhar ou demorar demais, o cliente recebe o conteúdo padrão.
 */
export async function loadReservationEmailConfig(): Promise<ReservationEmailConfigType> {
  try {
    const snapshot = await Promise.race([
      getDoc(doc(serverDb, RESERVATION_EMAIL_DOC.collection, RESERVATION_EMAIL_DOC.id)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tempo esgotado")), LOAD_TIMEOUT_MS),
      ),
    ]);
    return mergeReservationEmailConfig(snapshot.exists() ? snapshot.data() : null);
  } catch (error) {
    console.error("Erro ao carregar o conteúdo do e-mail de reserva:", error);
    return mergeReservationEmailConfig(null);
  }
}
