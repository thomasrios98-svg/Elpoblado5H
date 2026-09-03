import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Reemplaza estos valores con la configuración de tu propio proyecto de Firebase
// (Project Settings > General > Your apps > SDK setup and configuration).
// Estos valores identifican el proyecto y NO son secretos: la seguridad real
// se controla con las reglas de Firestore (ver firestore.rules).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'REEMPLAZAR',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'REEMPLAZAR',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'REEMPLAZAR',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'REEMPLAZAR',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'REEMPLAZAR',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'REEMPLAZAR',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const functions = getFunctions(app);
