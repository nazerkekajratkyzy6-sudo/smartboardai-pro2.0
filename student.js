// student.js — SmartBoardAI PRO (Answer + Emoji + WordCloud)

import { db, ref, push, onValue } from "./firebaseConfig.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
// ROOM параметрін URL-ден оқу
const params = new URLSearchParams(window.location.search);
const roomId = params.get("room");

if (!roomId) {
  alert("Room табылмады. QR дұрыс емес.");
}

const $ = (id) => document.getElementById(id);

// ====== ELEMENTS ======
const roomInput = $("roomInput");
const avatarSelect = $("avatar");
const nameInput = $("studentName");
const answerInput = $("studentAnswer");
const sendBtn = $("sendBtn");
const statusBox = $("status");
const studentPhotoInput = $("studentPhotoInput");
const sendPhotoBtn = $("sendPhotoBtn");
const storage = getStorage();

const titleEl = $("title");
const roomLbl = $("roomLbl");
const avLbl = $("avLbl");
const nameLbl = $("nameLbl");
const ansLbl = $("ansLbl");

const btnKZ = $("stKZ");
const btnRU = $("stRU");
const btnEN = $("stEN");

// Кейін UI қосу үшін
let emojiContainer, wcLabel, wcInput, wcBtn;

// ====== EXTRA UI: EMOJI + WORDCLOUD ======
function createExtraUI() {
  const card = titleEl?.closest(".card") || document.querySelector(".card");
  if (!card) return;

  // ЭМОЦИЯ
  emojiContainer = document.createElement("div");
  emojiContainer.style.marginTop = "10px";
  emojiContainer.style.display = "flex";
  emojiContainer.style.gap = "6px";
  emojiContainer.style.justifyContent = "center";
  emojiContainer.style.flexWrap = "wrap";

  const emojis = ["😀", "🙂", "😐", "😢", "🤩", "😡"];

  emojis.forEach((em) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.className = "emoji-btn";
    b.style.width = "40px";
    b.style.padding = "6px";
    b.style.fontSize = "20px";
    b.dataset.emoji = em;
    emojiContainer.appendChild(b);
  });

  // WORD CLOUD
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
    // ештеңе
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

  if (!roomId) return showStatus("❗ Бөлме кодын жазыңыз.");
  if (!name) return showStatus("❗ Есіміңізді жазыңыз.");
  if (!text) return showStatus("❗ Жауабыңызды жазыңыз.");

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
// ====== SEND PHOTO (Student -> Teacher) ======
async function sendStudentPhoto() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";
  const file = studentPhotoInput?.files?.[0];
  // iPhone: слишком большие фото могут "падать" по памяти/сети
  if (file && file.size > 6 * 1024 * 1024) {
    return showStatus("❗ Фото тым үлкен. 6MB-тан кіші фото таңдаңыз.");
  }

  if (!roomId) return showStatus("❗ Бөлме коды жоқ.");
  if (!name) return showStatus("❗ Есіміңізді жазыңыз.");
  if (!file) return showStatus("❗ Фото таңдаңыз.");

  try {
    showStatus("📤 Фото жіберіліп жатыр...");

    const path = `studentUploads/${roomId}/${Date.now()}_${file.name}`;
    const fileRef = sRef(storage, path);

    await uploadBytes(fileRef, file);
    console.log("UPLOAD OK");
    const url = await getDownloadURL(fileRef);
    const photosRef = ref(db, `rooms/${roomId}/studentPhotos`);
    
    await push(photosRef, {
      name,
      avatar,
      url,
      time: Date.now(),
    });

    if (studentPhotoInput) studentPhotoInput.value = "";
    showStatus("✅ Фото жіберілді!");
  } catch (e) {
    console.error(e);
    showStatus("❌ Фото жіберілмеді.");
  }
}

// ====== SEND EMOJI ======
function sendEmoji(emoji) {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";

  if (!roomId) return showStatus("❗ Бөлме коды жоқ.");
  if (!name) return showStatus("❗ Есіміңізді жазыңыз.");

  const emoRef = ref(db, `rooms/${roomId}/emotions`);
  push(emoRef, {
    name,
    avatar,
    emoji,
    time: Date.now(),
  });

  showStatus("💛 Эмоция жіберілді!");
}

// ====== SEND WORD CLOUD ======
function sendWord() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";
  const word = (wcInput?.value || "").trim();

  if (!roomId) return showStatus("❗ Бөлме коды жоқ.");
  if (!name) return showStatus("❗ Есіміңізді жазыңыз.");
  if (!word) return showStatus("❗ Бір сөз жазыңыз.");

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
// 👀 МҰҒАЛІМ БЛОГЫН ТЫҢДАУ
function listenTeacherBlock() {
  const roomId = getRoomId();
  if (!roomId) return;

  const blockRef = ref(db, `rooms/${roomId}/activeBlock`);

  onValue(blockRef, (snap) => {
    const data = snap.val();
    const box = document.getElementById("teacherBlock");
    if (!box || !data) return;
if (data.type === "text" || data.type === "ai") {
  box.innerHTML = `<div>${data.content}</div>`;
}
else if (data.type === "formula") {
  box.innerHTML = `<div class="math-block">\\(${data.content}\\)</div>`;
}
else if (data.type === "trainer" || data.type === "video") {
  box.innerHTML = `<iframe src="${data.content}"></iframe>`;
}
else {
  box.innerHTML = `<div>${data.content}</div>`;
}

// ⬇⬇⬇ МІНДЕТТІ ТҮРДЕ ТӨМЕНДЕ ТҰРУЫ КЕРЕК
if (window.MathJax) {
  MathJax.typesetPromise();
}
 
  });
}

// ====== EVENTS ======
function attachEvents() {
  if (sendBtn) sendBtn.addEventListener("click", sendAnswer);
  if (sendPhotoBtn) sendPhotoBtn.addEventListener("click", sendStudentPhoto);

  if (emojiContainer) {
    emojiContainer.querySelectorAll(".emoji-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const em = btn.dataset.emoji;
        if (em) sendEmoji(em);
      });
    });
  }

  if (wcBtn) wcBtn.addEventListener("click", sendWord);

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
  listenTeacherBlock();
});










