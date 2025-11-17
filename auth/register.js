import {
  auth,
  db,
  createUserWithEmailAndPassword,
  ref,
  set
} from "../firebaseConfig.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const msgEl = document.getElementById("msg");

registerBtn?.addEventListener("click", async () => {
  const email = emailEl.value.trim();
  const pass = passEl.value.trim();

  if (!email || !pass) {
    msgEl.textContent = "Барлық өрісті толтырыңыз.";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    await set(ref(db, `teachers/${uid}`), {
      email,
      createdAt: Date.now()
    });
    msgEl.textContent = "✅ Тіркелу сәтті! Қазір кіру бетіне өтіңіз.";
    window.location.href = "./login.html";
  } catch (e) {
    msgEl.textContent = "Қате: " + (e.message || "тіркелу мүмкін болмады.");
  }
});
