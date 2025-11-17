// teacherBoard.js — SmartBoardAI PRO (Realtime + Reflection)

import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  set,
  onValue,
  push
} from "./firebaseConfig.js";

let currentUser = null;
let currentRoomId = null;
let boardState = {
  lessonTitle: "",
  items: [] // {id, type, text, createdAt}
};

function $(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  const el = $("statusBar");
  if (el) el.textContent = text;
}

function randomRoomId() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./auth/login.html";
    return;
  }
  currentUser = user;
  initBoard();
});

function initBoard() {
  const createRoomBtn = $("createRoomBtn");
  const copyRoomBtn = $("copyRoomBtn");
  const lessonTitleInput = $("lessonTitle");
  const aiPrompt = $("aiPrompt");
  const aiGenerateBtn = $("aiGenerateBtn");
  const logoutBtn = $("logoutBtn");

  const savedRoom = localStorage.getItem("sbai_room");
  if (savedRoom) currentRoomId = savedRoom;

  if (!currentRoomId) {
    setStatus("Room жоқ. «Жаңа Room» батырмасын басыңыз.");
  } else {
    attachRoom(currentRoomId);
  }

  createRoomBtn?.addEventListener("click", () => {
    const newRoom = randomRoomId();
    currentRoomId = newRoom;
    localStorage.setItem("sbai_room", newRoom);
    createRoomInDb(newRoom);
    attachRoom(newRoom);
  });

  copyRoomBtn?.addEventListener("click", () => {
    if (!currentRoomId) return;
    navigator.clipboard?.writeText(currentRoomId);
    setStatus(`Room ID көшірілді: ${currentRoomId}`);
  });

  lessonTitleInput?.addEventListener("change", () => {
    boardState.lessonTitle = lessonTitleInput.value;
    saveBoard();
  });

  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tool-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const mode = chip.getAttribute("data-ai");
      aiPrompt.value = makeTemplatePrompt(mode);
    });
  });

  document.querySelectorAll(".ai-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const tpl = chip.getAttribute("data-template");
      aiPrompt.value = makeTemplatePrompt(tpl);
    });
  });

  aiGenerateBtn?.addEventListener("click", () => {
    if (!currentRoomId) {
      setStatus("Алдымен Room жасаңыз.");
      return;
    }
    const text = aiPrompt.value.trim();
    if (!text) return;
    addCard({
      type: "ai-task",
      text: `🧠 AI тапсырма:\n${text}`
    });
    aiPrompt.value = "";
  });

  document.querySelectorAll(".emoji-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentRoomId) return;
      const emoji = btn.getAttribute("data-emoji");
      push(ref(db, `rooms/${currentRoomId}/reflection/emoji`), {
        emoji,
        at: Date.now()
      });
    });
  });

  logoutBtn?.addEventListener("click", () => {
    signOut(auth).then(() => {
      localStorage.removeItem("sbai_room");
      window.location.href = "./auth/login.html";
    });
  });

  document.querySelectorAll(".tab-pill").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-pill")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });
}

function createRoomInDb(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  set(roomRef, {
    createdAt: Date.now(),
    ownerUid: currentUser?.uid || null,
    lessonTitle: $("lessonTitle")?.value || ""
  });
}

function attachRoom(roomId) {
  const label1 = $("roomIdLabel");
  const label2 = $("roomIdLabel2");
  if (label1) label1.textContent = roomId;
  if (label2) label2.textContent = roomId;
  setStatus(`Room: ${roomId} · live режим`);

  const boardRef = ref(db, `rooms/${roomId}/board`);
  onValue(boardRef, (snap) => {
    if (!snap.exists()) return;
    boardState = snap.val() || { lessonTitle: "", items: [] };
    const lessonTitleInput = $("lessonTitle");
    if (lessonTitleInput) lessonTitleInput.value = boardState.lessonTitle || "";
    renderBoard();
  });

  const studentsRef = ref(db, `rooms/${roomId}/students`);
  onValue(studentsRef, (snap) => {
    renderStudents(snap.val() || {});
  });

  const emojiRef = ref(db, `rooms/${roomId}/reflection/emoji`);
  onValue(emojiRef, (snap) => {
    renderEmojiStats(snap.val() || {});
  });

  const wordsRef = ref(db, `rooms/${roomId}/reflection/words`);
  onValue(wordsRef, (snap) => {
    renderWordCloud(snap.val() || {});
  });
}

function saveBoard() {
  if (!currentRoomId) return;
  const boardRef = ref(db, `rooms/${currentRoomId}/board`);
  set(boardRef, boardState);
}

function addCard({ type, text }) {
  if (!boardState.items) boardState.items = [];
  const id = "c" + Date.now();
  boardState.items.push({
    id,
    type,
    text,
    createdAt: Date.now()
  });
  saveBoard();
}

function deleteCard(id) {
  if (!boardState.items) return;
  boardState.items = boardState.items.filter((i) => i.id !== id);
  saveBoard();
}

function typeLabelFor(type) {
  switch (type) {
    case "text":
      return "Текст";
    case "ai-task":
      return "AI тапсырма";
    default:
      return type;
  }
}

function renderBoard() {
  const canvas = document.querySelector("#boardCanvas");
  if (!canvas) return;
  canvas.innerHTML = "";

  if (!boardState.items || boardState.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-board";
    empty.textContent = "Әзірше блок жоқ. Төмендегі өріске жазыңыз.";
    canvas.appendChild(empty);
  } else {
    boardState.items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "board-card";

      const header = document.createElement("div");
      header.className = "board-card-header";

      const typeLabel = document.createElement("span");
      typeLabel.className = "badge";
      typeLabel.textContent = typeLabelFor(item.type);

      const actions = document.createElement("div");
      actions.className = "board-card-actions";
      const delBtn = document.createElement("button");
      delBtn.textContent = "Өшіру";
      delBtn.addEventListener("click", () => deleteCard(item.id));
      actions.appendChild(delBtn);

      header.appendChild(typeLabel);
      header.appendChild(actions);

      const body = document.createElement("div");
      body.className = "board-card-body";
      body.textContent = item.text;

      card.appendChild(header);
      card.appendChild(body);
      canvas.appendChild(card);
    });
  }

  const addCardEl = document.createElement("div");
  addCardEl.style.marginTop = "10px";
  addCardEl.innerHTML = `
    <textarea id="newBlockText"
      placeholder="Жаңа текст блок немесе тапсырма жазыңыз..."
      style="width:100%; min-height:60px; border-radius:8px; border:1px solid #d1d5db; padding:6px; font-family:inherit; font-size:13px;"></textarea>
    <button id="addBlockBtn"
      style="margin-top:4px; padding:6px 10px; border-radius:999px; border:none; background:#4a6cf7; color:white; font-size:12px; cursor:pointer;">
      ➕ Блок қосу
    </button>
  `;
  canvas.appendChild(addCardEl);

  const addBtn = $("addBlockBtn");
  addBtn?.addEventListener("click", () => {
    const txt = $("newBlockText").value.trim();
    if (!txt) return;
    addCard({ type: "text", text: txt });
    $("newBlockText").value = "";
  });
}

function renderStudents(studentsObj) {
  const list = $("studentsList");
  if (!list) return;
  list.innerHTML = "";

  const ids = Object.keys(studentsObj);
  if (ids.length === 0) {
    list.innerHTML = `<div class="small">Әзірше оқушы қосылған жоқ.</div>`;
    return;
  }

  ids.forEach((key) => {
    const st = studentsObj[key];
    const row = document.createElement("div");
    row.className = "student-row";
    row.innerHTML = `
      <span>${st.name || "Аты жоқ"}</span>
      <span class="badge">joined</span>
    `;
    list.appendChild(row);
  });
}

function renderEmojiStats(emojiObj) {
  const statsEl = $("emojiStats");
  if (!statsEl) return;

  const counts = {};
  Object.keys(emojiObj).forEach((k) => {
    const e = emojiObj[k].emoji;
    counts[e] = (counts[e] || 0) + 1;
  });

  if (Object.keys(counts).length === 0) {
    statsEl.textContent = "Әзірше жауап жоқ.";
    return;
  }

  const parts = Object.keys(counts).map((e) => `${e}: ${counts[e]}`);
  statsEl.textContent = "Жауаптар → " + parts.join(" · ");
}

function renderWordCloud(wordsObj) {
  const cloud = $("wordCloud");
  if (!cloud) return;
  cloud.innerHTML = "";

  const keys = Object.keys(wordsObj);
  if (keys.length === 0) {
    cloud.innerHTML = `<span class="small">Пікір жоқ.</span>`;
    return;
  }

  keys.forEach((k) => {
    const w = wordsObj[k].word || "";
    if (!w) return;
    const span = document.createElement("span");
    span.textContent = w;
    span.style.padding = "3px 6px";
    span.style.borderRadius = "999px";
    span.style.background = "#e0ecff";
    span.style.fontSize = "11px";
    cloud.appendChild(span);
  });
}

function makeTemplatePrompt(mode) {
  switch (mode) {
    case "quiz5":
    case "quiz10":
      return "7-сынып математика тақырыбы бойынша көп таңдаулы тест құрастыр.";
    case "rebus":
      return "Бастауыш сыныпқа арналған визуалды ребус ойлап тап.";
    case "anagram":
      return "Физика тақырыбына 5 анаграмма жаса. Сөздер: жылдамдық, күш, масса, энергия, температура.";
    case "truthfalse":
      return "Алгебра тақырыбы бойынша 10 пайымдау жаз. Әрқайсысы үшін «шын/жалған» белгіле.";
    case "match":
      return "Сәйкестендіру тапсырмасын құрастыр: сол жақта формулалар, оң жақта атаулары. 6–8 жұп.";
    case "pisa":
      return "PISA форматында 3 мәтіндік есеп жаса: контексті — дүкен, жол, ауа райы. 7-сынып математика.";
    case "reflection":
      return "Сабақ соңында қолдануға 5 рефлексия сұрағын жаса: не түсінді, не қиын болды, қай сәт ұнады.";
    default:
      return "";
  }
}
