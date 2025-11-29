// teacher.js — SmartBoardAI PRO (Teacher Panel FINAL)

import { db, ref, set, onValue } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let boardBlocks = [];
let currentRoom = null;
let currentLang = "kk";

// INIT
window.addEventListener("DOMContentLoaded", () => {
  setupLanguage();
  setupLogout();
  renderEmptyBoard();
});

// ===============================
// LANGUAGE
// ===============================
const T = {
  kk: {
    topbar: "📘 SmartBoardAI PRO — Мұғалім",
    toolsTitle: "🧰 Құралдар",
    blocksTitle: "Блоктар",
    btnText: "📝 Мәтін",
    btnFormula: "∑ Формула",
    btnImage: "🖼 Фото",
    btnVideo: "🎬 Видео",
    btnLink: "🔗 Сілтеме",
    aiTitle: "AI панелі",
    aiPrompt: "Тапсырма немесе мәтін жазыңыз...",
    aiGen: "⚡ Генерация",
    liveRoomTitle: "LiveRoom",
    roomBtn: "🟢 Жаңа бөлме",
    roomHint: "Оқушылар <b>QR арқылы</b> қосылады",
    boardEmpty: "✨ Сабақ құруды бастау үшін сол жақтан блок таңдаңыз",
    answersTitle: "📥 Оқушы жауаптары",
    emoTitle: "Эмоциялар",
    wcTitle: "Сөз бұлты",
    logout: "🔒 Шығу",
  },
  ru: {
    topbar: "📘 SmartBoardAI PRO — Учитель",
    toolsTitle: "🧰 Инструменты",
    blocksTitle: "Блоки",
    btnText: "📝 Текст",
    btnFormula: "∑ Формула",
    btnImage: "🖼 Фото",
    btnVideo: "🎬 Видео",
    btnLink: "🔗 Ссылка",
    aiTitle: "AI панель",
    aiPrompt: "Введите задание или текст...",
    aiGen: "⚡ Сгенерировать",
    liveRoomTitle: "LiveRoom",
    roomBtn: "🟢 Новая комната",
    roomHint: "Ученики подключаются <b>по QR</b>",
    boardEmpty: "✨ Чтобы начать урок, выберите блок слева",
    answersTitle: "📥 Ответы учеников",
    emoTitle: "Эмоции",
    wcTitle: "Облако слов",
    logout: "🔒 Выход",
  },
  en: {
    topbar: "📘 SmartBoardAI PRO — Teacher",
    toolsTitle: "🧰 Tools",
    blocksTitle: "Blocks",
    btnText: "📝 Text",
    btnFormula: "∑ Formula",
    btnImage: "🖼 Image",
    btnVideo: "🎬 Video",
    btnLink: "🔗 Link",
    aiTitle: "AI Panel",
    aiPrompt: "Type your task or text...",
    aiGen: "⚡ Generate",
    liveRoomTitle: "LiveRoom",
    roomBtn: "🟢 New room",
    roomHint: "Students join via <b>QR</b>",
    boardEmpty: "✨ To start lesson, choose a block on the left",
    answersTitle: "📥 Student answers",
    emoTitle: "Emotions",
    wcTitle: "Word cloud",
    logout: "🔒 Logout",
  },
};

function applyLang(lang) {
  currentLang = lang;
  const t = T[lang] || T.kk;

  const topbarTitle = $("topbarTitle");
  const toolsTitle = $("toolsTitle");
  const blocksTitle = $("blocksTitle");
  const btnText = $("btnText");
  const btnFormula = $("btnFormula");
  const btnImage = $("btnImage");
  const btnVideo = $("btnVideo");
  const btnLink = $("btnLink");
  const aiTitle = $("aiTitle");
  const liveRoomTitle = $("liveRoomTitle");
  const roomBtn = $("roomBtn");
  const roomHint = $("roomHint");
  const boardEmpty = $("boardEmpty");
  const answersTitle = $("answersTitle");
  const emoTitle = $("emoTitle");
  const wcTitle = $("wcTitle");
  const logout = $("logout");
  const aiPrompt = $("aiPrompt");
  const aiBtn = document.querySelector(".ai-btn");

  if (topbarTitle) topbarTitle.textContent = t.topbar;
  if (toolsTitle) toolsTitle.textContent = t.toolsTitle;
  if (blocksTitle) blocksTitle.textContent = t.blocksTitle;
  if (btnText) btnText.textContent = t.btnText;
  if (btnFormula) btnFormula.textContent = t.btnFormula;
  if (btnImage) btnImage.textContent = t.btnImage;
  if (btnVideo) btnVideo.textContent = t.btnVideo;
  if (btnLink) btnLink.textContent = t.btnLink;
  if (aiTitle) aiTitle.textContent = t.aiTitle;
  if (liveRoomTitle) liveRoomTitle.textContent = t.liveRoomTitle;
  if (roomBtn) roomBtn.textContent = t.roomBtn;
  if (roomHint) roomHint.innerHTML = t.roomHint;
  if (boardEmpty) boardEmpty.textContent = t.boardEmpty;
  if (answersTitle) answersTitle.textContent = t.answersTitle;
  if (emoTitle) emoTitle.textContent = t.emoTitle;
  if (wcTitle) wcTitle.textContent = t.wcTitle;
  if (logout) logout.textContent = t.logout;
  if (aiPrompt) aiPrompt.placeholder = t.aiPrompt;
  if (aiBtn) aiBtn.textContent = t.aiGen;
}

function setupLanguage() {
  const langKZ = $("langKZ");
  const langRU = $("langRU");
  const langEN = $("langEN");

  if (langKZ) langKZ.onclick = () => applyLang("kk");
  if (langRU) langRU.onclick = () => applyLang("ru");
  if (langEN) langEN.onclick = () => applyLang("en");

  applyLang("kk");
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
    <h3 class="center-msg" id="boardEmpty">
      ${T[currentLang].boardEmpty}
    </h3>
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
        text: currentLang === "ru" ? "Текст" : currentLang === "en" ? "Text" : "Мәтін",
        formula: currentLang === "ru" ? "Формула" : currentLang === "en" ? "Formula" : "Формула",
        image: currentLang === "ru" ? "Фото" : currentLang === "en" ? "Image" : "Фото",
        video: currentLang === "ru" ? "Видео" : currentLang === "en" ? "Video" : "Видео",
        link: currentLang === "ru" ? "Ссылка" : currentLang === "en" ? "Link" : "Сілтеме",
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
  const txt = prompt(currentLang === "ru" ? "Введите текст:" : currentLang === "en" ? "Enter text:" : "Мәтін енгізіңіз:");
  if (txt) addBlock("text", txt);
};

window.addFormula = () => {
  const txt = prompt(currentLang === "ru" ? "Введите формулу:" : currentLang === "en" ? "Enter formula:" : "Формуланы енгізіңіз:");
  if (txt) addBlock("formula", txt);
};

window.addImage = () => {
  // Компьютерден файл таңдау
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result; // base64
      addBlock("image", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  input.click();
};

window.addVideo = () => {
  const url = prompt(
    currentLang === "ru"
      ? "Введите ссылку на YouTube или другой видео URL:"
      : currentLang === "en"
      ? "Enter YouTube link or other video URL:"
      : "YouTube сілтемесін немесе видео URL енгізіңіз:"
  );
  if (!url) return;

  let finalUrl = url.trim();

  // YouTube watch → embed
  const ytMatch = finalUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) {
    const id = ytMatch[1];
    finalUrl = `https://www.youtube.com/embed/${id}`;
  }

  addBlock("video", finalUrl);
};

window.addLink = () => {
  const url = prompt(
    currentLang === "ru"
      ? "Введите ссылку:"
      : currentLang === "en"
      ? "Enter link URL:"
      : "Сілтеме URL енгізіңіз:"
  );
  if (url) addBlock("link", url.trim());
};

// ===============================
// AI MODULE (FINAL VERSION)
// ===============================
window.generateAI = async function () {
  const promptArea = $("aiPrompt");
  const output = $("aiOutput");

  const text = (promptArea?.value || "").trim();
  if (!text) {
    const msg =
      currentLang === "ru"
        ? "Сначала введите запрос!"
        : currentLang === "en"
        ? "Enter a prompt first!"
        : "Алдымен сұрау енгізіңіз!";
    alert(msg);
    return;
  }

  // UI көрсетілім
  if (output) {
    output.innerHTML = `<div class="ai-loading">AI жауап дайындап жатыр...</div>`;
  }

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: text,
        lang: currentLang,
      }),
    });

    const data = await res.json();
    const answer = data.answer || data.result || "AI жауап қайтара алмады.";

    // 1) Панель ішіне шығару
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

    // 2) ТАҚТАҒА АВТОМАТ ТҮСІРУ (өте маңызды)
    addBlock("text", answer);

  } catch (err) {
    console.error("AI ERROR:", err);
    if (output) {
      output.innerHTML = `<div class="ai-error">❗ Қате: AI серверіне қосыла алмады.</div>`;
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
  listenStudentStreams();
};

function generateQR() {
  const qrDiv = $("qrContainer");
  if (!qrDiv || !currentRoom) return;

  qrDiv.innerHTML = "";

  const url = `${location.origin}/student.html?room=${currentRoom}`;

  // QRCode — qrcodejs кітапханасынан
  // eslint-disable-next-line no-undef
  new QRCode(qrDiv, {
    text: url,
    width: 140,
    height: 140,
  });
}

// ===============================
// LISTEN STUDENT DATA (answers + emotions + wordcloud)
// ===============================
function listenStudentStreams() {
  if (!currentRoom) return;

  // ANSWERS
  const answersRef = ref(db, `rooms/${currentRoom}/answers`);
  onValue(answersRef, (snap) => {
    const box = $("studentAnswers");
    if (!box) return;

    const data = snap.val();
    if (!data) {
      box.innerHTML = currentLang === "ru" ? "Пока нет ответов..." :
        currentLang === "en" ? "No answers yet..." :
        "Әзірше жауап жоқ...";
      return;
    }

    const list = Object.values(data).sort((a, b) => (a.time || 0) - (b.time || 0));

    box.innerHTML = list
      .map((a) => {
        const name = a.name || "Оқушы";
        const text = String(a.text || "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        const avatar = a.avatar || "🙂";

        return `
          <div class="answer-item">
            <b>${avatar} ${name}</b><br>
            ${text}
          </div>
        `;
      })
      .join("");
  });

  // EMOTIONS
  const emoRef = ref(db, `rooms/${currentRoom}/emotions`);
  onValue(emoRef, (snap) => {
    const box = $("studentEmotions");
    if (!box) return;

    const data = snap.val();
    if (!data) {
      box.innerHTML = currentLang === "ru" ? "Пока эмоций нет..." :
        currentLang === "en" ? "No emotions yet..." :
        "Әзірше эмоция жоқ...";
      return;
    }

    const list = Object.values(data).sort((a, b) => (a.time || 0) - (b.time || 0));

    box.innerHTML = list
      .map((e) => {
        const name = e.name || "Оқушы";
        const emoji = e.emoji || "🙂";
        const avatar = e.avatar || "";
        return `<span class="emo-item">${avatar} ${name}: ${emoji}</span>`;
      })
      .join(" ");
  });

  // WORD CLOUD
  const wcRef = ref(db, `rooms/${currentRoom}/wordcloud`);
  onValue(wcRef, (snap) => {
    const box = $("studentWordCloud");
    if (!box) return;

    const data = snap.val();
    if (!data) {
      box.innerHTML = currentLang === "ru" ? "Пока слов нет..." :
        currentLang === "en" ? "No words yet..." :
        "Әзірше сөздер жоқ...";
      return;
    }

    const words = Object.values(data).map((w) => w.word || "").filter(Boolean);

    box.innerHTML = words
      .map((w) => `<span class="wc-chip">${w}</span>`)
      .join(" ");
  });
}

