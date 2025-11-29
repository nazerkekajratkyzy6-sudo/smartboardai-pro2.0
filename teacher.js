// teacher.js — SmartBoardAI PRO (Teacher Panel FINAL, fixed)

import { db, ref, set, onValue } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let boardBlocks = [];
let currentRoom = null;

// INIT
window.addEventListener("DOMContentLoaded", () => {
  setupLanguage();
  setupLogout();
  renderEmptyBoard();
});

// ===============================
// LANGUAGE
// ===============================
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
    const t = LANG[lang] || LANG.kk;
    if (promptArea) promptArea.placeholder = t.prompt;
    if (genBtn) genBtn.textContent = t.gen;
  };

  const langKZ = $("langKZ");
  const langRU = $("langRU");
  const langEN = $("langEN");

  if (langKZ) langKZ.onclick = () => apply("kk");
  if (langRU) langRU.onclick = () => apply("ru");
  if (langEN) langEN.onclick = () => apply("en");

  apply("kk");
}

// ===============================
// LOGOUT
// ===============================
function setupLogout() {
  const btn = $("logout");
  if (!btn) return;

  btn.onclick = () => {
    alert("Сіз жүйеден шықтыңыз.");
    location.href = "index.html";
  };
}

// ===============================
// BOARD RENDER
// ===============================
function renderEmptyBoard() {
  const board = $("board");
  if (!board) return;

  board.innerHTML = `
    <h3 class="center-msg">✨ Сабақ құруды бастау үшін сол жақтан блок таңдаңыз</h3>
  `;
}

function renderBoard() {
  const board = $("board");
  if (!board) return;

  if (boardBlocks.length === 0) {
    renderEmptyBoard();
    return;
  }

  board.innerHTML = "";

  boardBlocks.forEach((b) => {
    const block = document.createElement("div");
    block.className = "board-card";

    const title =
      {
        text: "Мәтін",
        formula: "Формула",
        image: "Фото",
        video: "Видео",
        link: "Сілтеме",
      }[b.type] || "Блок";

    let contentHtml = b.content || "";

    if (b.type === "image") {
      contentHtml = `<img src="${b.content}" class="board-image">`;
    } else if (b.type === "video") {
      contentHtml = `<iframe src="${b.content}" class="board-video" allowfullscreen></iframe>`;
    } else if (b.type === "link") {
      const safe = String(b.content || "").replace(/"/g, "&quot;");
      contentHtml = `<a href="${safe}" target="_blank">${safe}</a>`;
    } else if (b.type === "text" || b.type === "formula") {
      contentHtml = String(b.content || "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    }

    block.innerHTML = `
      <div class="board-card-header">
        <span>${title}</span>
        <button class="card-delete-btn">Өшіру</button>
      </div>
      <div class="board-card-body">${contentHtml}</div>
    `;

    const delBtn = block.querySelector(".card-delete-btn");
    if (delBtn) {
      delBtn.onclick = () => {
        boardBlocks = boardBlocks.filter((x) => x.id !== b.id);
        renderBoard();
      };
    }

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

// ===============================
// BLOCK BUTTONS
// ===============================
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

// ===============================
// AI MODULE
// ===============================
window.generateAI = async function () {
  const promptArea = $("aiPrompt");
  const output = $("aiOutput");

  const text = (promptArea?.value || "").trim();
  if (!text) {
    alert("Алдымен сұрау енгізіңіз!");
    return;
  }

  if (output) {
    output.innerHTML = `<div class="ai-loading">AI жауап дайындап жатыр...</div>`;
  }

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        prompt: text,
        lang: "kk",
      }),
    });

    const data = await res.json();
    const answer = data.result || data.answer || "AI жауап қайтара алмады.";

    if (output) {
      output.innerHTML = `
        <div class="ai-answer">
          ${String(answer)
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")}
        </div>
      `;
    }
  } catch (err) {
    if (output) {
      output.innerHTML = `<div class="ai-error">Қате: AI серверіне қосыла алмады.</div>`;
    }
  }
};

// ===============================
// LIVEROOM + QR
// ===============================
function randomRoomID() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

window.createRoom = function () {
  currentRoom = randomRoomID();

  const roomIdEl = $("roomId");
  if (roomIdEl) roomIdEl.textContent = currentRoom;

  const roomRef = ref(db, "rooms/" + currentRoom);
  set(roomRef, {
    createdAt: Date.now(),
  });

  generateQR();
  listenStudentAnswers();
};

function generateQR() {
  const qrDiv = $("qrContainer");
  if (!qrDiv || !currentRoom) return;

  qrDiv.innerHTML = "";

  const url = `${location.origin}/student.html?room=${currentRoom}`;

  // QRCode — qrcodejs кітапханасынан (teacher.html-де қосылған)
  // eslint-disable-next-line no-undef
  new QRCode(qrDiv, {
    text: url,
    width: 140,
    height: 140,
  });
}

// ===============================
// LISTEN STUDENT ANSWERS
// ===============================
function listenStudentAnswers() {
  if (!currentRoom) return;

  const answersRef = ref(db, `rooms/${currentRoom}/answers`);

  onValue(answersRef, (snap) => {
    const box = $("studentAnswers");
    if (!box) return;

    const data = snap.val();

    if (!data) {
      box.innerHTML = "Әзірше жауап жоқ...";
      return;
    }

    const list = Object.values(data);
    box.innerHTML = list
      .map((a) => {
        const name = a.name || "Оқушы";
        const text = String(a.text || "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");

        return `
          <div class="answer-item">
            <b>${name}</b><br>
            ${text}
          </div>
        `;
      })
      .join("");
  });
}
