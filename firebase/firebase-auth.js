// Rainbow Tools — Firebase Auth Module
// Handles Google sign-in, email/password auth, and Django session bridging

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import firebaseConfig from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── Google Sign-In ──
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();
  await sendTokenToDjango(idToken);
  return user;
}

// ── Email/Password Login ──
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const user = result.user;
  const idToken = await user.getIdToken();
  await sendTokenToDjango(idToken);
  return user;
}

// ── Email/Password Signup ──
export async function signupWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  const idToken = await user.getIdToken();
  await sendTokenToDjango(idToken);
  return user;
}

// ── Logout ──
export async function logout() {
  await signOut(auth);
  await fetch("/auth/logout/", { method: "POST", headers: { "X-CSRFToken": getCSRFToken() } });
}

// ── Send ID token to Django backend ──
async function sendTokenToDjango(idToken) {
  const response = await fetch("/auth/login/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken()
    },
    body: JSON.stringify({ idToken })
  });
  if (!response.ok) throw new Error("Django login failed");
  return response.json();
}

// ── Get current user state ──
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Get ID token for API calls ──
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ── CSRF token helper ──
function getCSRFToken() {
  const name = "csrftoken";
  const cookies = document.cookie.split(";");
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(name + "=")) return c.substring(name.length + 1);
  }
  return "";
}
