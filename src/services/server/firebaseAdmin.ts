import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Variáveis de ambiente guardam a chave com "\\n" literal; o PEM precisa de quebras reais.
export function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n");
}

// Inicialização preguiçosa: o `next build` importa os módulos das rotas sem as
// variáveis de ambiente do Admin, então nada pode quebrar na importação.
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  const missing = [
    ["FIREBASE_ADMIN_PROJECT_ID", projectId],
    ["FIREBASE_ADMIN_CLIENT_EMAIL", clientEmail],
    ["FIREBASE_ADMIN_PRIVATE_KEY", privateKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes para o Firebase Admin: ${missing.join(", ")}.`,
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey!),
    }),
  });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
