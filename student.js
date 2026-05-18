// student.js — SmartBoardAI PRO

import { db, ref, push, onValue, set } from "./firebaseConfig.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const $ = (id) => document.getElementById(id);

// ====== URL PARAMS ======
const params = new URLSearchParams(window.location.search);
const urlRoom = params.get("room");

// ====== ELEMENTS ======
const roomInput = $("roomInput");
const avatarSelect = $("avatar");
const nameInput = $("studentName");
const answerInput = $("studentAnswer");
const sendBtn = $("sendBtn");
const statusBox = $("status");
const studentPhotoInput = $("studentPhotoInput");
const sendPhotoBtn = $("sendPhotoBtn");
const teacherBlock = $("teacherBlock");

const titleEl = $("title");
const roomLbl = $("roomLbl");
const avLbl = $("avLbl");
const nameLbl = $("nameLbl");
const ansLbl = $("ansLbl");

const btnKZ = $("stKZ");
const btnRU = $("stRU");
const btnEN = $("stEN");

const storage = getStorage();

// Если в HTML есть эти блоки — используем, если нет — просто игнорируем
const roomAutoHint = $("roomAutoHint");

// ====== EXTRA UI ======
let emojiContainer, wcLabel, wcInput, wcBtn;

// ====== HELPERS ======
function getRoomId() {
  return (roomInput?.value || "").trim();
}

function showStatus(msg) {
  if (statusBox) statusBox.textContent = msg;
}

// ====== STUDENT PRESENCE ======
const studentId =
  localStorage.getItem("studentId") ||
  ("std_" + Math.random().toString(36).slice(2, 9));

localStorage.setItem("studentId", studentId);

async function saveStudentPresence() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";

  if (!roomId || !name) return;

  localStorage.setItem("studentName", name);

  await set(ref(db, `rooms/${roomId}/students/${studentId}`), {
    name,
    avatar,
    time: Date.now(),
  });
}

// ====== ROOM DETECT ======
function detectRoomFromURL() {
  if (!urlRoom || !roomInput) return;

  roomInput.value = urlRoom;
  roomInput.readOnly = true;

  if (roomAutoHint) {
    roomAutoHint.classList.remove("hidden");
  }

  setTimeout(() => {
    if (nameInput?.value.trim()) {
      saveStudentPresence();
    }
  }, 500);
}

function listenFeedback() {
  const roomId = getRoomId();
  if (!roomId) return;

  const fbRef = ref(db, `rooms/${roomId}/answerFeedback`);

  onValue(fbRef, (snap) => {
    const box = document.getElementById("feedbackBox");
    const data = snap.val();

    if (!data || !box) {
      box.innerHTML = "Әзірше жоқ";
      return;
    }

    box.innerHTML = Object.values(data)
      .map(f => `<div>${f.reaction} ${f.name}</div>`)
      .join("");
  });
}

// ====== EXTRA UI: EMOJI + WORD CLOUD ======
function createExtraUI() {
  const card = titleEl?.closest(".card") || document.querySelector(".card");
  if (!card) return;

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

// ====== SEND ANSWER ======
async function sendAnswer() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const text = answerInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";

  if (!roomId) return showStatus("❗ Бөлме кодын жазыңыз.");
  if (!name) return showStatus("❗ Есіміңізді жазыңыз.");
  if (!text) return showStatus("❗ Жауабыңызды жазыңыз.");

  try {
    await saveStudentPresence();

    const ansRef = ref(db, `rooms/${roomId}/answers`);
    await push(ansRef, {
      name,
      avatar,
      text,
      time: Date.now(),
    });

    if (answerInput) answerInput.value = "";
    showStatus("✔ Жауап жіберілді!");
  } catch (e) {
    console.error(e);
    showStatus("❌ Жауап жіберілмеді.");
  }
}

// ====== SEND PHOTO ======
async function sendStudentPhoto() {
  const roomId = getRoomId();
  const name = nameInput?.value.trim() || "";
  const avatar = avatarSelect?.value || "🙂";
  const file = studentPhotoInput?.files?.[0];

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
    const url = await getDownloadURL(fileRef);

    await saveStudentPresence();

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

// ====== SEND WORD ======
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

// ====== LANG ======
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
}

// ====== LISTEN TEACHER BLOCK ======
function listenTeacherBlock() {
  const roomId = getRoomId();
  if (!roomId) return;

  const blockRef = ref(db, `rooms/${roomId}/activeBlock`);

  onValue(blockRef, (snap) => {
    const data = snap.val();
    if (!teacherBlock || !data) return;

    if (data.type === "text" || data.type === "ai" || data.type === "rich") {
      teacherBlock.innerHTML = `<div>${data.content}</div>`;
    } else if (data.type === "formula") {
      teacherBlock.innerHTML = `<div class="math-block">\\(${data.content}\\)</div>`;
    } else if (data.type === "trainer" || data.type === "video") {
     teacherBlock.innerHTML = `
  <div style="position:relative;">
    
    <button onclick="openFullscreenTask()" style="
      position:absolute;
      top:8px;
      right:8px;
      z-index:10;
      background:#2563eb;
      color:white;
      border:none;
      border-radius:10px;
      padding:6px 10px;
      cursor:pointer;
      font-size:14px;
      box-shadow:0 4px 10px rgba(0,0,0,0.15);
    ">
      ⛶
    </button>

    <iframe 
      id="studentTaskFrame"
      src="${data.content}" 
      style="
        width:100%;
        height:420px;
        border-radius:12px;
        border:1px solid #e2e8f0;
      ">
    </iframe>

  </div>
`;
    } else {
      teacherBlock.innerHTML = `<div>${data.content}</div>`;
    }

    if (window.MathJax) {
      MathJax.typesetPromise();
    }
  });
}

// ====== EVENTS ======
function attachEvents() {
  if (sendBtn) sendBtn.addEventListener("click", async () => {
    await sendAnswer();
    listenTeacherBlock();
  });

  if (sendPhotoBtn) sendPhotoBtn.addEventListener("click", sendStudentPhoto);

  if (nameInput) {
    nameInput.addEventListener("change", saveStudentPresence);
    nameInput.addEventListener("blur", saveStudentPresence);
  }

  if (avatarSelect) {
    avatarSelect.addEventListener("change", saveStudentPresence);
  }

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
  listenFeedback();
  setTimeout(() => {
    if (getRoomId()) {
      listenTeacherBlock();
    }
  }, 300);
});
window.openFullscreenTask = function () {
  const el = document.getElementById("studentTaskFrame");
  if (!el) return;

  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen();
  }
};

// =====================================================
// NEW STUDENT PRO ROOM — API
// student.html-мен байланыс
// =====================================================

// joinRoom — HTML-дегі "Кіру" батырмасы шақырады
window.joinRoom = function(roomId, name, avatar) {
  // roomInput, studentName-ге мән қою (бұрынғы логика үшін)
  const ri = document.getElementById("roomInput");
  const ni = document.getElementById("studentName");
  if (ri) ri.value = roomId;
  if (ni) ni.value = name;

  // avatar store
  window._studentAvatar = avatar || "🙂";
  window._studentName   = name;
  window._studentRoom   = roomId;

  // Бұрынғы saveStudentPresence логикасын іске қосу
  if (typeof saveStudentPresence === "function") {
    saveStudentPresence();
  }

  // Room UI-ді ашу
  if (window.showStudentRoom) {
    window.showStudentRoom(name, roomId, avatar || "🙂");
  }

  // Listen teacher block + feedback
  if (typeof listenTeacherBlock === "function") listenTeacherBlock();
  if (typeof listenFeedback === "function") listenFeedback();

  if (window.showStudentStatus) window.showStudentStatus("✅ Сабаққа қосылдыңыз!", "ok");
};

// sendEmoji — emoji панелінен
window.sendEmoji = function(emoji) {
  if (typeof sendEmoji === "function") {
    // внутренняя функция
  }
  // Firebase-ке жазу
  if (typeof db !== "undefined" && typeof ref !== "undefined" && typeof push !== "undefined") {
    const roomId = window._studentRoom;
    if (!roomId) return;
    push(ref(db, `rooms/${roomId}/emotions`), {
      emoji,
      name: window._studentName || "Оқушы",
      ts: Date.now()
    }).catch(console.error);
  }
};

// Жауап жіберу батырмасын жаңа UI-ге қосу
document.addEventListener("DOMContentLoaded", () => {
  // Жаңа sendBtn
  const newSendBtn = document.getElementById("sendBtn");
  if (newSendBtn) {
    newSendBtn.addEventListener("click", async () => {
      if (typeof sendAnswer === "function") {
        await sendAnswer();
        if (window.showStudentStatus) window.showStudentStatus("✅ Жауап жіберілді!", "ok");
      }
    });
  }

  // Жаңа sendPhotoBtn
  const newPhotoBtn = document.getElementById("sendPhotoBtn");
  if (newPhotoBtn) {
    newPhotoBtn.addEventListener("click", async () => {
      if (typeof sendStudentPhoto === "function") {
        await sendStudentPhoto();
        if (window.showStudentStatus) window.showStudentStatus("✅ Фото жіберілді!", "ok");
      }
    });
  }

  // Word cloud жіберу
  const wordBtn = document.getElementById("sendWordBtn");
  const wordInput = document.getElementById("wordInput");
  if (wordBtn && wordInput) {
    wordBtn.addEventListener("click", () => {
      const word = wordInput.value.trim();
      if (!word) return;
      if (typeof sendWord === "function") sendWord(word);
      wordInput.value = "";
      if (window.showStudentStatus) window.showStudentStatus("✅ Жіберілді!", "ok");
    });
  }
});

// listenTeacherBlock override — жаңа UI-ді қолдану
// (student.js-тегі функция бар, бірақ жаңа showStudentTask-ты шақырамыз)
