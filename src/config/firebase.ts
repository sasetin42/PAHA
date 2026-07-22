// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCk55QWOf76a4eTYXD2RNQCWA7WeCVxrNI",
    authDomain: "paha-db.firebaseapp.com",
    projectId: "paha-db",
    storageBucket: "paha-db.firebasestorage.app",
    messagingSenderId: "803699903701",
    appId: "1:803699903701:web:53ca11f7d80b2b4afb665c"
};

import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Initialize Firebase safely (handles Vite HMR re-evaluations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: Firestore;
try {
    db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
    });
} catch (e) {
    db = getFirestore(app);
}
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Ensure the auth session survives refreshes / token reconciliation.
// Try IndexedDB first, fall back to localStorage if unavailable (e.g. some private modes).
setPersistence(auth, indexedDBLocalPersistence).catch(() =>
    setPersistence(auth, browserLocalPersistence).catch(() => { /* in-memory fallback */ })
);

export { app, db, storage, auth, functions };
