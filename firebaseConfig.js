// firebaseConfig.js — FINАЛ (Auth + Database толық жұмыс істейді)

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
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ↑ Дәл осы 'get' – student.js үшін қажет!!
// get() болмай, student.js "қатып" қалады.

const firebaseConfig = {
  apiKey: "AIzaSyA5OZa9O6dOYzb7Tgb6ayrYsJLDTf1PWuo",
  authDomain: "smartboardai-pro2-0.firebaseapp.com",
  databaseURL: "https://smartboardai-pro2-0-default-rtdb.firebaseio.com/",
  projectId: "smartboardai-pro2-0",
  storageBucket: "smartboardai-pro2-0.firebasestorage.app",
  messagingSenderId: "162626939562",
  appId: "1:162626939562:web:468bd97b1b3165863abed3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

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
  get
};
