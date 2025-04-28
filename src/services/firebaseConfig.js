import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAl0lrwe9ta0n10dvaCvqcGURDjatNqOlk",
  authDomain: "carcassonne-d6af2.firebaseapp.com",
  projectId: "carcassonne-d6af2",
  storageBucket: "carcassonne-d6af2.firebasestorage.app",
  messagingSenderId: "585051771631",
  appId: "1:585051771631:web:e8158cb9919632688fc11a",
  measurementId: "G-KGC73NVLVG",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
