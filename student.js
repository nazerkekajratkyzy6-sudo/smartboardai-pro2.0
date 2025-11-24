// ================================
// SmartBoardAI PRO — Student Panel
// FULL WORKING VERSION (premium)
// ================================

import {
  db,
  ref,
  set,
  push
} from "./firebaseConfig.js";

// URL параметрлерін оқу
const params = new URLSearchParams(window.location.search);
const studentName = params.get("name") || "Оқушы";
const roomId = params.get("room");
const avatar = params.get("avatar") || "👤";

// DOM
const answerInput = document.getElementById("answerInput");
const sendAnswerBtn = document.getElementById("sendAnswerBtn");

const refInput = document.getElementById("refInput");
const sendRefBtn = document.getElementById("sendRefBtn");

const emojiRow = document.getElementById("emojiRow");

document.getElementById("user-info").textContent =
  `${avatar} ${studentName} — Room: ${roomId}`;

// ==============================
// 1) Жауап жіберу
// ==============================
sendAnswerBtn.addEventListener("click", async () => {
  const text = answerInput.value.trim();
  if (!text) return;

  await set(ref(db, `rooms/${roomId}/answers/${studentName}`), {
    answer: text,
    ts: Date.now(),
    avatar: avatar
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
    by: studentName,
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
      by: studentName,
      avatar: avatar,
      ts: Date.now()
    });

    // Таңдалған UI
    emojiRow.querySelectorAll(".emoji")
      .forEach(e => e.classList.remove("selected"));

    icon.classList.add("selected");
  });
});
