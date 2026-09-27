
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCKj_5A1-6ySp-Cpnq8gkKlf1WwdcwajOs",
  authDomain: "agriconnect-ae7f4.firebaseapp.com",
  projectId: "agriconnect-ae7f4",
  storageBucket: "agriconnect-ae7f4.firebasestorage.app",
  messagingSenderId: "84289830811",
  appId: "1:84289830811:web:244824667687cc81f377a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export default app;