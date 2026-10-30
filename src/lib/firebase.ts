/**
 * Firebase Client SDK — Google Sign-In for Upgrade Talents India
 * Uses environment variables for configuration.
 * Falls back to the project's known config for development.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type UserCredential,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBeSPoSBa_zHcfOjlVt7XmjzagohIzN6Wg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "event-management-4fe6f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "event-management-4fe6f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "event-management-4fe6f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "618767397707",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:618767397707:web:4de0c14cfbbdff8a25aece",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0HWGV30ZBJ",
};

let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

function ensureFirebase() {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope("email");
    googleProvider.addScope("profile");
  }
  return { app, auth, googleProvider };
}

/**
 * Trigger Google Sign-In popup via Firebase.
 * Returns the Firebase ID token to send to the backend.
 */
export async function signInWithGoogle(): Promise<{ idToken: string; email: string; name: string; photo: string | null }> {
  const { auth, googleProvider } = ensureFirebase();
  const result: UserCredential = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email || "",
    name: result.user.displayName || "",
    photo: result.user.photoURL,
  };
}

/**
 * Sign out from Firebase Auth to completely clear any Google session.
 */
export async function signOutFirebase(): Promise<void> {
  try {
    const { auth } = ensureFirebase();
    if (auth) {
      await signOut(auth);
    }
  } catch {}
}
