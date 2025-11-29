// student.js — SmartBoardAI PRO (Student Panel C version)
// Answer + Emoji + Word Cloud

import { db, ref, push } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

// ====== ELEMENTS ======
const roomInput = $("roomInput");
const avatarSelect = $("avatar");
const nameInput = $("studentName");
const answerInput = $("studentAnswer");
const sendBtn = $("sendBtn");
const statusBox = $("status");

const titleEl = $("title");
const roomLbl = $("roomLbl");
const avLbl = $("avLbl");
const nameLbl = $("nameLbl");
const ansLbl = $("ansLbl");

const btnKZ = $("stKZ");
const btnRU = $("stRU");
const btnEN = $("stEN");

// Кейін толтыру үшін
let emojiContainer, wcLabel, wcInput, wcBtn;

// ====== UI ҚОСЫМША (ЭМОЦИЯ + WORD CLOUD) ======
function createExtraUI() {
  const card = titleEl?.closest(".card") || document.querySelector(".card");
  if (!card) return;

  // Эмоция батырмалары
  emojiContainer = document.createElement("div");
  emojiContainer.style.marginTop = "10px";
  emojiContainer.style.display = "flex";
  emojiContainer.style.gap = "6px";
  emojiContainer.style.justifyContent = "center";

  const emojis = ["😀", "🙂", "😐", "😢", "🤩", "😡"];

  emojis.forEach((em) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.className = "emoji-btn";
    b.style.width = "40px";
    b.style.padding = "6px";
    b.dataset.emoji = em;
    emojiContainer.appendChild(b);
  });

  // Word cloud
  wcLabel = document.createElement("label");
  wcLabel.id = "wcLbl";
  wcLabel.style.display = "block";
  wcLabel.style.marginTop = "12px";
  wcLabel.textContent = "Сөз бұлты:";

  wcInput = document.createElement("input");
  wcInput.type = "text";
  wcInput.id = "wcInput";
  wcInput.placeholder = "Бір сөз жаз...";

  wcBtn = document.createElement("button");
  wcBtn.type = "button";
  wcBtn.id = "wcBtn";
  wcBtn.textContent = "Қосу";

  card.appendChild(emojiContainer);
  card.appendChild(wcLabel);
  card.appendChild(wcInput);
  card.appendChild(wcBtn);
}

// ====== ROOM DETECT (URL → input) ======
function detectRoomFromURL() {
  try {
    const urlRoom = new URL(window.location.href).searchParams.get("room");
    if (urlRoom && roomInput) {
      roomInput.value = urlRoom;
    }
  } catch (e) {
    // ештеңе істемейміз
  }
}

function getRoomId() {
  return (roomInput?.value || "").trim();
}

function showStatus(msg) {
  if (statusBox) statusBox.textContent = msg;
}

// ====== SEND ANSWER ======
function sendAnswer() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const text = answerInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";

  if (!roomId) {
    showStatus("❗ Бөлме кодын жазыңыз.");
    return;
  }
  if (!name) {
    showStatus("❗ Есіміңізді жазыңыз.");
    return;
  }
  if (!text) {
    showStatus("❗ Жауабыңызды жазыңыз.");
    return;
  }

  const ansRef = ref(db, `rooms/${roomId}/answers`);
  push(ansRef, {
    name,
    avatar,
    text,
    time: Date.now(),
  });

  if (answerInput) answerInput.value = "";
  showStatus("✔ Жауап жіберілді!");
}

// ====== SEND EMOJI ======
function sendEmoji(emoji) {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";

  if (!roomId) {
    showStatus("❗ Бөлме коды жоқ.");
    return;
  }
  if (!name) {
    showStatus("❗ Есіміңізді жазыңыз.");
    return;
  }

  const emoRef = ref(db, `rooms/${roomId}/emotions`);
  push(emoRef, {
    name,
    avatar,
    emoji,
    time: Date.now(),
  });

  showStatus("💛 Эмоция жіберілді!");
}

// ====== SEND WORD (WORD CLOUD) ======
function sendWord() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";
  const word = (wcInput?.value || "").trim();

  if (!roomId) {
    showStatus("❗ Бөлме коды жоқ.");
    return;
  }
  if (!name) {
    showStatus("❗ Есіміңізді жазыңыз.");
    return;
  }
  if (!word) {
    showStatus("❗ Бір сөз жазыңыз.");
    return;
  }

  const wcRef = ref(db, `rooms/${roomId}/wordcloud`);
  push(wcRef, {
    name,
    avatar,
    word,
    time: Date.now(),
  });

  wcInput.value = "";
  showStatus("☁ Сөз бұлтқа қосылды!");
}

// ====== LANG SYSTEM ======
const LANG = {
  kz: {
    title: "Оқушы панелі",
    roomLbl: "Бөлме коды:",
    avLbl: "Аватар:",
    nameLbl: "Есіміңіз:",
    ansLbl: "Жауап:",
    send: "Жіберу",
    wcLbl: "Сөз бұлты:",
    wcBtn: "Қосу",
    roomPlaceholder: "ROOM ID",
    namePlaceholder: "Атыңыз",
    ansPlaceholder: "Жауабыңызды жазыңыз...",
    wcPlaceholder: "Бір сөз жаз...",
  },
  ru: {
    title: "Панель ученика",
    roomLbl: "Код комнаты:",
    avLbl: "Аватар:",
    nameLbl: "Имя:",
    ansLbl: "Ответ:",
    send: "Отправить",
    wcLbl: "Облако слов:",
    wcBtn: "Добавить",
    roomPlaceholder: "КОД",
    namePlaceholder: "Ваше имя",
    ansPlaceholder: "Напишите ответ...",
    wcPlaceholder: "Введите одно слово...",
  },
  en: {
    title: "Student Panel",
    roomLbl: "Room code:",
    avLbl: "Avatar:",
    nameLbl: "Name:",
    ansLbl: "Answer:",
    send: "Send",
    wcLbl: "Word cloud:",
    wcBtn: "Add",
    roomPlaceholder: "ROOM ID",
    namePlaceholder: "Your name",
    ansPlaceholder: "Type your answer...",
    wcPlaceholder: "One word...",
  },
};

function applyLang(lang) {
  const t = LANG[lang] || LANG.kz;

  if (titleEl) titleEl.textContent = t.title;
  if (roomLbl) roomLbl.textContent = t.roomLbl;
  if (avLbl) avLbl.textContent = t.avLbl;
  if (nameLbl) nameLbl.textContent = t.nameLbl;
  if (ansLbl) ansLbl.textContent = t.ansLbl;
  if (sendBtn) sendBtn.textContent = t.send;
  if (wcLabel) wcLabel.textContent = t.wcLbl;
  if (wcBtn) wcBtn.textContent = t.wcBtn;

  if (roomInput) roomInput.placeholder = t.roomPlaceholder;
  if (nameInput) nameInput.placeholder = t.namePlaceholder;
  if (answerInput) answerInput.placeholder = t.ansPlaceholder;
  if (wcInput) wcInput.placeholder = t.wcPlaceholder;
}

// ====== EVENTS ======
function attachEvents() {
  if (sendBtn) sendBtn.addEventListener("click", sendAnswer);

  if (emojiContainer) {
    emojiContainer.querySelectorAll("button.emoji-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const em = btn.dataset.emoji;
        if (em) sendEmoji(em);
      });
    });
  }

  if (wcBtn) {
    wcBtn.addEventListener("click", sendWord);
  }

  if (btnKZ) btnKZ.addEventListener("click", () => applyLang("kz"));
  if (btnRU) btnRU.addEventListener("click", () => applyLang("ru"));
  if (btnEN) btnEN.addEventListener("click", () => applyLang("en"));
}

// ====== INIT ======
document.addEventListener("DOMContentLoaded", () => {
  createExtraUI();
  detectRoomFromURL();
  applyLang("kz");
  attachEvents();
});
