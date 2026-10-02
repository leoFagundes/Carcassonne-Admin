import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Instância separada para as rotas de API (servidor). A principal
// (firebaseConfig.js) liga cache em IndexedDB e persistência de login, que só
// existem no navegador.
const SERVER_APP_NAME = "server";

const serverApp =
  getApps().find((app) => app.name === SERVER_APP_NAME) ??
  initializeApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    SERVER_APP_NAME,
  );

export const serverDb = getFirestore(serverApp);
