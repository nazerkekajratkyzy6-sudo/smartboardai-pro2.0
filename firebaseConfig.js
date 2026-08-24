// firebaseConfig.js — SmartBoardAI PRO (Firebase v10)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  push,
  get,
  onValue,
  runTransaction,
  update,
  remove,
  orderByChild,
  limitToLast,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ✅ Firebase Storage
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔐 Firebase конфиг
const firebaseConfig = {
  apiKey: "AIzaSyA5OZa9O6dOYzb7Tgb6ayrYsJLDTf1PWuo",
  authDomain: "smartboardai-pro2-0.firebaseapp.com",
  databaseURL: "https://smartboardai-pro2-0-default-rtdb.firebaseio.com/",
  projectId: "smartboardai-pro2-0",
  storageBucket: "smartboardai-pro2-0.firebasestorage.app",
  messagingSenderId: "162626939562",
  appId: "1:162626939562:web:468bd97b1b3165863abed3"
};

// 🔥 Инициализация
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getDatabase(app);
const storage  = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
  storage,
  googleProvider,
  // Auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  // Database — барлығы
  ref,
  set,
  push,
  get,
  onValue,
  runTransaction,
  update,
  remove,
  orderByChild,
  limitToLast,
  query,
  // Storage
  sRef,
  uploadBytes,
  getDownloadURL,
};
