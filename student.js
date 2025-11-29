/* ===========================
   STUDENT BOARD — FULL FINAL
   =========================== */

// Firebase импорт
import { db, ref, push, set, onValue } from "./firebaseConfig.js";

// Қысқа селектор
const $ = (id) => document.getElementById(id);

// ====== UI ELEMENTS ======
const nameInput = $("studentName");
const answerInput = $("answerInput");
const sendAnswerBtn = $("sendAnswerBtn");
const emojiBtns = document.querySelectorAll(".emoji-btn");
const langBtns = document.querySelectorAll(".lang-btn");
const statusBox = $("statusBox");

// === ROOM ID автоматты түрде URL арқылы ===
let ROOM_ID = null;

function detectRoom() {
  const url = new URL(window.location.href);
  ROOM_ID = url.searchParams.get("room");

  if (!ROOM_ID) {
    statusBox.textContent = "❗ Room табылған жоқ. QR арқылы кіріңіз.";
    disableStudentUI();
    return;
  }

  statusBox.textContent = Бөлме: ${ROOM_ID};
}

function disableStudentUI() {
  answerInput.disabled = true;
  sendAnswerBtn.disabled = true;
  emojiBtns.forEach((b) => (b.disabled = true));
}

// ====== SEND ANSWER ======
sendAnswerBtn.onclick = () => {
  const name = nameInput.value.trim();
  const txt = answerInput.value.trim();

  if (!name) {
    statusBox.textContent = "❗ Атыңды жаз!";
    return;
  }
  if (!txt) {
    statusBox.textContent = "❗ Жауап бос!";
    return;
  }

  const ansRef = ref(db, rooms/${ROOM_ID}/answers);
  push(ansRef, {
    name,
    text: txt,
    time: Date.now(),
  });

  answerInput.value = "";
  statusBox.textContent = "✔ Жауап жіберілді!";
};

// ====== EMOJI FEEDBACK ======
emojiBtns.forEach((btn) => {
  btn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      statusBox.textContent = "❗ Атыңды жаз!";
      return;
    }

    const emoji = btn.dataset.emoji;

    const emoRef = ref(db, rooms/${ROOM_ID}/emotions);
    push(emoRef, {
      name,
      emoji,
      time: Date.now(),
    });

    statusBox.textContent = "💛 Эмоция жіберілді!";
  };
});

// ====== WORD CLOUD ======
const wcInput = $("wcInput");
const wcBtn = $("wcBtn");

if (wcBtn) {
  wcBtn.onclick = () => {
    const name = nameInput.value.trim();
    const word = wcInput.value.trim();

    if (!name) {
      statusBox.textContent = "❗ Атыңды жаз!";
      return;
    }
    if (!word) {
      statusBox.textContent = "❗ Бір сөз жаз!";
      return;
    }

    const wcRef = ref(db, rooms/${ROOM_ID}/wordcloud);
    push(wcRef, {
      name,
      word,
      time: Date.now(),
    });

    wcInput.value = "";
    statusBox.textContent = "☁ Сөз бұлтқа қосылды!";
  };
}

// ====== LANGUAGE SWITCH ======
let CURRENT_LANG = "kz";

const LANG = {
  kz: {
    title: "Оқушы панелі",
    name: "Атың:",
    answer: "Жауабың:",
    send: "Жіберу",
    wc: "Сөз бұлт",
    wcBtn: "Қосу"
  },
  ru: {
    title: "Панель ученика",
    name: "Имя:",
    answer: "Ответ:",
    send: "Отправить",
    wc: "Облако слов",
    wcBtn: "Добавить"
  },
  en: {
    title: "Student Panel",
    name: "Name:",
    answer: "Answer:",
    send: "Send",
    wc: "Word Cloud",
    wcBtn: "Add"
  }
};

function applyLanguage() {
  $("titleText").textContent = LANG[CURRENT_LANG].title;
  $("labelName").textContent = LANG[CURRENT_LANG].name;
  $("labelAnswer").textContent = LANG[CURRENT_LANG].answer;
  sendAnswerBtn.textContent = LANG[CURRENT_LANG].send;
  $("labelWC").textContent = LANG[CURRENT_LANG].wc;
  $("wcBtn").textContent = LANG[CURRENT_LANG].wcBtn;
}

langBtns.forEach((btn) => {
  btn.onclick = () => {
    CURRENT_LANG = btn.dataset.lang;
    applyLanguage();
  };
});

// ===== INIT =====
detectRoom();
applyLanguage();