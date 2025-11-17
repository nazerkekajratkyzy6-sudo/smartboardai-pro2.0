// firebaseConfig.js — SmartBoardAI PRO
// Firebase v10 modules

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  push,
  get,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// --------------------------------------------------
// 🔥 МІНЕ ОСЫ ЖЕРГЕ — өз Firebase config-іңді қоясың
// --------------------------------------------------
const firebaseConfig = { 
  apiKey : "AIzaSyCzAgHT_TQhXPvNuJA2R1xkazPkUD8HeG0" , 
  authDomain : "smartboardai-pro1.firebaseapp.com" , 
  databaseURL : "https://smartboardai-pro1-default-rtdb.firebaseio.com" , 
  идентификатор проекта : «smartboardai-pro1» , 
  storageBucket : "smartboardai-pro1.firebasestorage.app" , 
  messagingSenderId : "1039702770246" , 
  appId : "1:1039702770246:web:213b296998e8f4f41d0047" 
};
// --------------------------------------------------

// Firebase Init
export const app = initializeApp(firebaseConfig);

// Auth services
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Realtime Database service
export const db = getDatabase(app);

// Export helpers
export {
  onAuthStateChanged,
  signOut,
  ref,
  set,
  update,
  onValue,
  push,
  get,
};
