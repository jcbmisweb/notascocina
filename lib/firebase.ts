import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultConfig from '../firebase-applet-config.json';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;

const firebaseConfig = {
  apiKey: metaEnv?.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: metaEnv?.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: metaEnv?.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: metaEnv?.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: metaEnv?.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: metaEnv?.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  measurementId: metaEnv?.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId || ""
};

const databaseId = metaEnv?.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    console.info("[Firebase Auth] Iniciando sesión con Google...", { projectId: firebaseConfig.projectId, databaseId });
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.info("[Firebase Auth] Inicio de sesión exitoso:", result.user?.email);
        return result;
    } catch (error) {
        console.error("[Firebase Auth] signInWithPopup falló:", error);
        throw error;
    }
};

export const logout = () => signOut(auth);
