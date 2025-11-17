import {
  auth,
  signInWithEmailAndPassword
} from "../firebaseConfig.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const msgEl = document.getElementById("msg");

loginBtn?.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const pass = passEl.value.trim();

  if (!email || !pass) {
    msgEl.textContent = "Барлық өрісті толтырыңыз.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "../teacherBoard.html";
  } catch (e) {
    msgEl.textContent = "Қате: " + (e.message || "кіру мүмкін болмады.");
  }
});
