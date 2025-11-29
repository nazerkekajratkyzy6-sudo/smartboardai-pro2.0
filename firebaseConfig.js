// assets/js/firebaseConfig.js
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
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔐 Сен берген конфиг (smartboardai-pro2-0)
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Барлық керек нәрсені экспорттаймыз
export {
  app,
  auth,
  db,
  googleProvider,
  // Auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  // Database
  ref,
  set,
  push,
  get,
  onValue
};
