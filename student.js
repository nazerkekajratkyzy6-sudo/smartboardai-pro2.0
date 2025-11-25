// ================================
// SmartBoardAI PRO — Student Panel (FIXED FULL VERSION)
// ================================

import {
  db,
  ref,
  set,
  push
} from "./firebaseConfig.js";

// ------------------------------
// URL параметрлерін оқу
// ------------------------------
const params = new URLSearchParams(window.location.search);
const studentName = params.get("name") || "Оқушы";
const roomId = params.get("room");
const avatar = params.get("avatar") || "👤";

if (!roomId) {
  alert("Room ID табылмады!");
}

// ------------------------------
// Оқушыны Firebase-ке тіркеу
// ------------------------------
async function registerStudent() {
  await set(ref(db, `rooms/${roomId}/students/${studentName}`), {
    name: studentName,
    avatar: avatar,
    joinedAt: Date.now()
  });
}

registerStudent();

// ------------------------------
// DOM
// ------------------------------
const answerInput = document.getElementById("answerInput");
const sendAnswerBtn = document.getElementById("sendAnswerBtn");

const refInput = document.getElementById("refInput");
const sendRefBtn = document.getElementById("sendRefBtn");

const emojiRow = document.getElementById("emojiRow");

document.getElementById("user-info").textContent =
  `${avatar} ${studentName} — Room: ${roomId}`;

// ==============================
// 1) Тапсырмаға жауап жіберу
// ==============================
sendAnswerBtn.addEventListener("click", async () => {
  const text = answerInput.value.trim();
  if (!text) return;

  await set(ref(db, `rooms/${roomId}/answers/${studentName}`), {
    name: studentName,
    text: text,          // ← FIX: TeacherBoard.js осылай оқиды
    avatar: avatar,
    ts: Date.now()
  });

  answerInput.value = "";
});

// ==============================
// 2) WordCloud (1 сөз)
// ==============================
sendRefBtn.addEventListener("click", async () => {
  const word = refInput.value.trim();
  if (!word) return;

  const newRef = push(ref(db, `rooms/${roomId}/reflection/words`));

  await set(newRef, {
    word: word,
    name: studentName,  // teacherBoard.js үшін үйлесімді ат
    avatar: avatar,
    ts: Date.now()
  });

  refInput.value = "";
});

// ==============================
// 3) Эмоция жіберу
// ==============================
emojiRow.querySelectorAll(".emoji").forEach((icon) => {
  icon.addEventListener("click", async () => {
    const em = icon.dataset.em;

    const newEmoji = push(ref(db, `rooms/${roomId}/reflection/emoji`));

    await set(newEmoji, {
      emoji: em,
      name: studentName,   // teacherBoard.js үшін FIX
      avatar: avatar,
      ts: Date.now()
    });

    // UI highlight
    emojiRow.querySelectorAll(".emoji").forEach(e => 
      e.classList.remove("selected"));
    icon.classList.add("selected");
  });
});
