import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDNAvhPe9XJ8XD1ngqeyEKWAMBBIMyxZL4",
  authDomain: "notascocina-2e8d7.firebaseapp.com",
  projectId: "notascocina-2e8d7",
  storageBucket: "notascocina-2e8d7.firebasestorage.app",
  messagingSenderId: "1050131307239",
  appId: "1:1050131307239:web:0b962e95886ef672b2e042",
  measurementId: "G-XJKN8V0XPG"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
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
