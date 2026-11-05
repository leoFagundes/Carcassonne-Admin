import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { isValidCpf, normalizeCpf } from "@/rental/cpf";
import { DEFAULT_RENTAL_SETTINGS } from "@/rental/defaults";
import type { RentalSettingsType } from "@/types";
import { ApiError } from "./apiHelpers";
import { getAdminDb } from "./firebaseAdmin";

type ProfileBody = { name: string; phone: string; cpf: string; acceptTerms: boolean };

function invalid(message: string): never {
  throw new ApiError(400, "invalid_profile", message);
}

/**
 * Grava o cadastro do cliente em rentalCustomers/{uid} e mantém o índice de
 * CPF (rentalCpfIndex/{cpf}) único, tudo na mesma transação.
 */
export async function saveCustomerProfile(
  uid: string,
  email: string,
  body: ProfileBody,
): Promise<void> {
  const db = getAdminDb();

  const settingsSnap = await db.collection("rental-config").doc("settings").get();
  const settings: RentalSettingsType = {
    ...DEFAULT_RENTAL_SETTINGS,
    ...(settingsSnap.exists ? (settingsSnap.data() as Partial<RentalSettingsType>) : {}),
  };

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 3) invalid("Informe seu nome completo (mínimo 3 letras).");

  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phone.length < 10 || phone.length > 11) {
    invalid("Informe um WhatsApp válido com DDD.");
  }

  const cpf = typeof body?.cpf === "string" ? normalizeCpf(body.cpf) : "";
  if ((settings.requireCpf || cpf) && !isValidCpf(cpf)) invalid("CPF inválido.");

  const customerRef = db.collection("rentalCustomers").doc(uid);

  await db.runTransaction(async (tx) => {
    const customerSnap = await tx.get(customerRef);
    const exists = customerSnap.exists;
    const oldCpf = exists ? String(customerSnap.data()?.cpf ?? "") : "";

    if (!exists && body?.acceptTerms !== true) {
      invalid("É preciso aceitar as regras do aluguel.");
    }

    const newIndexRef = cpf && cpf !== oldCpf ? db.collection("rentalCpfIndex").doc(cpf) : null;
    if (newIndexRef) {
      const indexSnap = await tx.get(newIndexRef);
      if (indexSnap.exists && indexSnap.data()?.uid !== uid) {
        throw new ApiError(409, "cpf_in_use", "Este CPF já está cadastrado em outra conta.");
      }
    }

    if (newIndexRef) tx.set(newIndexRef, { uid });
    if (oldCpf && oldCpf !== cpf) {
      tx.delete(db.collection("rentalCpfIndex").doc(oldCpf));
    }

    if (exists) {
      tx.update(customerRef, { name, phone, cpf, email });
    } else {
      tx.set(customerRef, {
        name,
        phone,
        cpf,
        email,
        acceptedTermsAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
