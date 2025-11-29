// teacher.js — SmartBoardAI PRO (Teacher Panel FINAL)
// Premium A-UI edition

import { db, ref, set, push, onValue } from "./firebaseConfig.js";

// ---------- FAST DOM ----------
const $ = (id) => document.getElementById(id);

// ---------- GLOBAL STATE ----------
let boardBlocks = [];
let currentRoom = null;

// ---------- INIT AFTER LOAD ----------
window.addEventListener("DOMContentLoaded", () => {
  setupLanguage();
  setupLogout();
  renderEmptyBoard();
});

// ========================================================
// LANGUAGE SYSTEM
// ========================================================
function setupLanguage() {
  const LANG = {
    kk: {
      prompt: "Тапсырма немесе мәтін жазыңыз...",
      gen: "⚡ Генерация",
    },
    ru: {
      prompt: "Введите текст или задание...",
      gen: "⚡ Сгенерировать",
    },
    en: {
      prompt: "Type your task or text...",
      gen: "⚡ Generate",
    },
  };

  const promptArea = $("aiPrompt");
  const genBtn = document.querySelector(".ai-btn");

  const apply = (lang) => {
    promptArea.placeholder = LANG[lang].prompt;
    genBtn.textContent = LANG[lang].gen;
  };

  $("langKZ").onclick = () => apply("kk");
  $("langRU").onclick = () => apply("ru");
  $("langEN").onclick = () => apply("en");

  apply("kk"); // default
}

// ========================================================
// LOGOUT
// ========================================================
function setupLogout() {
  const btn = $("logout");
  btn.onclick = () => {
    alert("Сіз жүйеден шықтыңыз.");
    location.href = "index.html";
  };
}

// ========================================================
// BOARD RENDER
// ========================================================
function renderEmptyBoard() {
  $("board").innerHTML = 
    <h3 class="center-msg">✨ Сабақ бастау үшін сол жақтан блок таңдаңыз</h3>
  ;
}

function renderBoard() {
  const board = $("board");
  if (boardBlocks.length === 0) return renderEmptyBoard();

  board.innerHTML = "";

  boardBlocks.forEach((b) => {
    const block = document.createElement("div");
    block.className = "board-card";

    let title = {
      text: "Мәтін",
      formula: "Формула",
      image: "Фото",
      video: "Видео",
      link: "Сілтеме",
    }[b.type] || "Блок";

    let contentHtml = b.content;

    if (b.type === "image") {
      contentHtml = <img src="${b.content}" class="board-image">;
    }
    if (b.type === "video") {
      contentHtml = <iframe src="${b.content}" class="board-video" allowfullscreen></iframe>;
    }
    if (b.type === "link") {
      contentHtml = <a href="${b.content}" target="_blank">${b.content}</a>;
    }
    if (b.type === "text" || b.type === "formula") {
      contentHtml = b.content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    }

    block.innerHTML = 
      <div class="board-card-header">
        <span>${title}</span>
        <button class="card-delete-btn">Өшіру</button>
      </div>
      <div class="board-card-body">${contentHtml}</div>
    ;

    block.querySelector(".card-delete-btn").onclick = () => {
      boardBlocks = boardBlocks.filter((x) => x.id !== b.id);
      renderBoard();
    };

    board.appendChild(block);
  });
}

function addBlock(type, content) {
  if (!content) return;
  boardBlocks.push({
    id: "blk_" + Math.random().toString(36).slice(2, 9),
    type,
    content,
  });
  renderBoard();
}

// ========================================================
// BLOCK BUTTON FUNCTIONS
// ========================================================
window.addTextBlock = () => {
  const txt = prompt("Мәтін енгізіңіз:");
  if (txt) addBlock("text", txt);
};

window.addFormula = () => {
  const txt = prompt("Формуланы енгізіңіз:");
  if (txt) addBlock("formula", txt);
};

window.addImage = () => {
  const url = prompt("Фото URL енгізіңіз:");
  if (url) addBlock("image", url.trim());
};

window.addVideo = () => {
  const url = prompt("Видео URL / YouTube embed енгізіңіз:");
  if (url) addBlock("video", url.trim());
};
window.addLink = () => {
  const url = prompt("Сілтеме URL:");
  if (url) addBlock("link", url.trim());
};

// ========================================================
// AI MODULE (Vercel backend)
// ========================================================
window.generateAI = async function () {
  const promptArea = $("aiPrompt");
  const output = $("aiOutput");

  const text = (promptArea.value || "").trim();
  if (!text) return alert("Алдымен сұрау енгізіңіз!");

  output.innerHTML = <div class="ai-loading">AI жауап дайындап жатыр...</div>;

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    const data = await res.json();
    const answer = data.answer || "AI жауап қайтара алмады.";

    output.innerHTML = 
      <div class="ai-answer">
        ${answer.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}
      </div>
    ;

  } catch (err) {
    output.innerHTML = <div class="ai-error">Қате: AI серверіне қосыла алмады.</div>;
  }
};

// ========================================================
// LIVEROOM + QR
// ========================================================
function randomRoomID() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

window.createRoom = function () {
  currentRoom = randomRoomID();

  $("roomId").textContent = currentRoom;

  const roomRef = ref(db, "rooms/" + currentRoom);
  set(roomRef, {
    createdAt: Date.now(),
  });

  generateQR();
  listenStudentAnswers();
};

function generateQR() {
  const qrDiv = $("qrContainer");
  qrDiv.innerHTML = "";

  const url = ${location.origin}/student.html?room=${currentRoom};

  new QRCode(qrDiv, {
    text: url,
    width: 140,
    height: 140,
  });
}

// ========================================================
// LISTEN STUDENT ANSWERS
// ========================================================
function listenStudentAnswers() {
  const answersRef = ref(db, rooms/${currentRoom}/answers);

  onValue(answersRef, (snap) => {
    const box = $("studentAnswers");
    const data = snap.val();

    if (!data) {
      box.innerHTML = "Әзірше жауап жоқ...";
      return;
    }

    const list = Object.values(data);
    box.innerHTML = list
      .map(
        (a) => 
        <div class="answer-item">
          <b>${a.name || "Оқушы"}</b><br>
          ${String(a.text || "")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")}
        </div>
      )
      .join("");
  });
}