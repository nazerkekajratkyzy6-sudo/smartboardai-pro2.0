// firebaseConfig.js (ТОЛЫҚ ЖҰМЫС ІСТЕЙТІН НҰСҚА)

// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getDatabase,
  ref,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// 🔥 Сенің жаңа smartboardai-pro2-0 проектің
const firebaseConfig = {
  apiKey: "AIzaSyA5OZa9O6dOYzb7Tgb6ayrYsJLDTf1PWuo",
  authDomain: "smartboardai-pro2-0.firebaseapp.com",
  databaseURL: "https://smartboardai-pro2-0-default-rtdb.firebaseio.com",
  projectId: "smartboardai-pro2-0",
  storageBucket: "smartboardai-pro2-0.firebasestorage.app",
  messagingSenderId: "162626939562",
  appId: "1:162626939562:web:468bd97b1b3165863abed3"
};


// Инициализация
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, ref, set };
