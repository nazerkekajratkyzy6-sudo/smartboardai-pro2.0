// auth.js — жалпы көмекші (міндетті түрде қолдануға да болмайды)

import { auth, onAuthStateChanged } from "./firebaseConfig.js";

export function requireAuth(onReady) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "./auth/login.html";
    } else {
      onReady(user);
    }
  });
}
