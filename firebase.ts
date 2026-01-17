import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de tu proyecto 'studio-8226958431-ec330'
const firebaseConfig = {
  apiKey: "AIzaSyDT6LoIalNfmtw6PTY6ybaa4zwMU6GUokU",
  authDomain: "studio-8226958431-ec330.firebaseapp.com",
  projectId: "studio-8226958431-ec330",
  storageBucket: "studio-8226958431-ec330.firebasestorage.app",
  messagingSenderId: "885323383801",
  appId: "1:885323383801:web:1fbac3f898424db1617328"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);