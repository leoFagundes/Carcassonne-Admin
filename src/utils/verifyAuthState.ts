import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";

export function isAuthenticated(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // Evita múltiplas execuções
      resolve(!!user); // true se tiver user, false se não
    });
  });
}
