import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const finalConfig = envConfig.apiKey ? envConfig : firebaseConfig;

const app = initializeApp(finalConfig);
export const db = (finalConfig === firebaseConfig && firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') 
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
    : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();


export const signInWithGoogle = async () => {
    console.log("Llamando a signInWithPopup...");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("signInWithPopup exitoso", result);
        return result;
    } catch (error) {
        console.error("signInWithPopup falló", error);
        throw error;
    }
};
export const logout = () => signOut(auth);
