// teacher.js — SmartBoardAI PRO (Phase 1 FINAL, NO i18n.js)

// Функциялар: 
// - Language switch (ішкі T объект арқылы)
// - Modal UI (prompt орнына)
// - Multi-page (pages[])
// - QR + RoomID + Firebase (answers + emotions + wordcloud)
// - AI → панель + тақтаға блок

import { db, ref, set, onValue } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let currentLang = "kk";

// Multi-page state
let pages = [{ id: "page_1", blocks: [] }];
let currentPageIndex = 0;

// ===============================
// LANGUAGE TEXTS
// ===============================
const T = {
  kk: {
    topbar: "📘 SmartBoardAI PRO — Мұғалім",
    toolsTitle: "🧰 Құралдар",
    blocksTitle: "Блоктар",
    aiTitle: "AI панелі",
    liveRoomTitle: "LiveRoom",
    answersTitle: "📥 Оқушы жауаптары",
    emoTitle: "Эмоциялар",
    wcTitle: "Сөз бұлты",
    pagesTitle: "📄 Беттер",
    addPage: "Бет қосу",
    boardEmpty: "✨ Сабақ құруды бастау үшін сол жақтан блок таңдаңыз",
    roomBtn: "🟢 Жаңа бөлме",
    roomHint: "Оқушылар <b>QR арқылы</b> қосылады",
    logout: "🔒 Шығу",
    aiPrompt: "Тапсырма немесе мәтін жазыңыз...",
    aiLoading: "AI жауап дайындап жатыр...",
    aiError: "❗ Қате: AI серверіне қосыла алмады.",
    noAnswers: "Әзірше жауап жоқ...",
    noEmo: "Әзірше эмоция жоқ...",
    noWords: "Әзірше сөздер жоқ...",
  },
  ru: {
    topbar: "📘 SmartBoardAI PRO — Учитель",
    toolsTitle: "🧰 Инструменты",
    blocksTitle: "Блоки",
    aiTitle: "AI панель",
    liveRoomTitle: "LiveRoom",
    answersTitle: "📥 Ответы учеников",
    emoTitle: "Эмоции",
    wcTitle: "Облако слов",
    pagesTitle: "📄 Страницы",
    addPage: "Добавить страницу",
    boardEmpty: "✨ Чтобы начать урок, выберите блок слева",
    roomBtn: "🟢 Новая комната",
    roomHint: "Ученики подключаются <b>по QR</b>",
    logout: "🔒 Выход",
    aiPrompt: "Введите задание или текст...",
    aiLoading: "AI генерирует ответ...",
    aiError: "❗ Ошибка: не удалось подключиться к AI.",
    noAnswers: "Пока нет ответов...",
    noEmo: "Пока эмоций нет...",
    noWords: "Пока слов нет...",
  },
  en: {
    topbar: "📘 SmartBoardAI PRO — Teacher",
    toolsTitle: "🧰 Tools",
    blocksTitle: "Blocks",
    aiTitle: "AI Panel",
    liveRoomTitle: "LiveRoom",
    answersTitle: "📥 Student answers",
    emoTitle: "Emotions",
    wcTitle: "Word cloud",
    pagesTitle: "📄 Pages",
    addPage: "Add page",
    boardEmpty: "✨ To start lesson, choose a block on the left",
    roomBtn: "🟢 New room",
    roomHint: "Students join via <b>QR</b>",
    logout: "🔒 Logout",
    aiPrompt: "Type your task or text...",
    aiLoading: "AI is generating answer...",
    aiError: "❗ Error: cannot connect to AI.",
    noAnswers: "No answers yet...",
    noEmo: "No emotions yet...",
    noWords: "No words yet...",
  },
};

function applyLang(lang) {
  currentLang = lang;
  const t = T[lang] || T.kk;

  const topbarTitle = $("topbarTitle");
  const toolsTitle = $("toolsTitle");
  const blocksTitle = $("blocksTitle");
  const aiTitle = $("aiTitle");
  const liveRoomTitle = $("liveRoomTitle");
  const answersTitle = $("answersTitle");
  const emoTitle = $("emoTitle");
  const wcTitle = $("wcTitle");
  const pagesTitle = $("pagesTitle");
  const roomBtn = $("roomBtn");
  const roomHint = $("roomHint");
  const logoutBtn = $("logout");
  const aiPrompt = $("aiPrompt");
  const addPageBtn = $("addPageBtn");

  if (topbarTitle) topbarTitle.textContent = t.topbar;
  if (toolsTitle) toolsTitle.textContent = t.toolsTitle;
  if (blocksTitle) blocksTitle.textContent = t.blocksTitle;
  if (aiTitle) aiTitle.textContent = t.aiTitle;
  if (liveRoomTitle) liveRoomTitle.textContent = t.liveRoomTitle;
  if (answersTitle) answersTitle.textContent = t.answersTitle;
  if (emoTitle) emoTitle.textContent = t.emoTitle;
  if (wcTitle) wcTitle.textContent = t.wcTitle;
  if (pagesTitle) pagesTitle.textContent = t.pagesTitle;
  if (roomBtn) roomBtn.textContent = t.roomBtn;
  if (roomHint) roomHint.innerHTML = t.roomHint;
  if (logoutBtn) logoutBtn.textContent = t.logout;
  if (aiPrompt) aiPrompt.placeholder = t.aiPrompt;
  if (addPageBtn) addPageBtn.textContent = "➕ " + t.addPage;

  renderBoard();
  renderPages();
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
// MODAL UI (prompt орнына)
// ===============================
let modalCallback = null;

function openModal(title, placeholder, callback) {
  const bg = $("modal-bg");
  const input = $("modal-input");
  const titleEl = $("modal-title");

  if (!bg || !input || !titleEl) return;

  titleEl.textContent = title;
  input.placeholder = placeholder || "";
  input.value = "";

  modalCallback = callback;
  bg.style.display = "flex";
}

function closeModal() {
  const bg = $("modal-bg");
  if (bg) bg.style.display = "none";
}

function setupModalEvents() {
  const okBtn = $("modal-ok");
  const cancelBtn = $("modal-cancel");
  if (okBtn) {
    okBtn.onclick = () => {
      const input = $("modal-input");
      const val = input ? input.value.trim() : "";
      if (modalCallback && val) modalCallback(val);
      closeModal();
    };
  }
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      closeModal();
    };
  }
}

// ===============================
// LOGOUT
// ===============================
function setupLogout() {
  const btn = $("logout");
  if (!btn) return;
  btn.onclick = () => {
    const msg =
      currentLang === "ru"
        ? "Вы вышли из системы."
        : currentLang === "en"
        ? "You have logged out."
        : "Сіз жүйеден шықтыңыз.";
    alert(msg);
    location.href = "index.html";
  };
}

// ===============================
// PAGE SYSTEM
// ===============================
function getCurrentBlocks() {
  return pages[currentPageIndex].blocks;
}

function addPage() {
  const newIndex = pages.length + 1;
  pages.push({ id: "page_" + newIndex, blocks: [] });
  currentPageIndex = pages.length - 1;
  renderPages();
  renderBoard();
}

function switchPage(i) {
  currentPageIndex = i;
  renderPages();
  renderBoard();
}

function renderPages() {
  const wrap = $("pagesWrap");
  if (!wrap) return;
  wrap.innerHTML = "";

  const label =
    currentLang === "ru"
      ? "Страница"
      : currentLang === "en"
      ? "Page"
      : "Бет";

  pages.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className = i === currentPageIndex ? "page-btn active" : "page-btn";
    btn.textContent = `${label} ${i + 1}`;
    btn.onclick = () => switchPage(i);
    wrap.appendChild(btn);
  });
}

// ===============================
// BOARD
// ===============================
function renderBoard() {
  const board = $("board");
  if (!board) return;

  const blocks = getCurrentBlocks();
  if (!blocks.length) {
    const t = T[currentLang] || T.kk;
    board.innerHTML = `<h3 class="center-msg" id="boardEmpty">${t.boardEmpty}</h3>`;
    return;
  }

  board.innerHTML = "";

  blocks.forEach((b) => {
    const card = document.createElement("div");
    card.className = "board-card";

    const safe = (txt) =>
      String(txt || "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

    let contentHtml = "";

    if (b.type === "text" || b.type === "ai") {
      contentHtml = `<div class="board-text">${safe(b.content)}</div>`;
    } else if (b.type === "formula") {
      contentHtml = `<div class="math-block">${safe(b.content)}</div>`;
    } else if (b.type === "image") {
      contentHtml = `<img src="${b.content}" class="board-image">`;
    } else if (b.type === "video") {
      contentHtml = `<iframe src="${b.content}" class="board-video" allowfullscreen></iframe>`;
    } else if (b.type === "link") {
      const safeUrl = String(b.content || "").replace(/"/g, "&quot;");
      contentHtml = `<a href="${safeUrl}" target="_blank">${safeUrl}</a>`;
    } else if (b.type === "trainer") {
      contentHtml = `<iframe src="${b.content}" class="trainer-frame"></iframe>`;
    }

    const title =
      b.type === "text"
        ? currentLang === "ru"
          ? "Текст"
          : currentLang === "en"
          ? "Text"
          : "Мәтін"
        : b.type === "formula"
        ? "Формула"
        : b.type === "image"
        ? currentLang === "en"
          ? "Image"
          : "Фото"
        : b.type === "video"
        ? "Видео"
        : b.type === "link"
        ? currentLang === "ru"
          ? "Ссылка"
          : currentLang === "en"
          ? "Link"
          : "Сілтеме"
        : b.type === "trainer"
        ? "Тренажер"
        : b.type === "ai"
        ? "AI"
        : "Block";

    card.innerHTML = `
      <div class="board-card-header">
        <span>${title}</span>
        <button class="card-delete-btn">✕</button>
      </div>
      <div class="board-card-body">${contentHtml}</div>
    `;

    const delBtn = card.querySelector(".card-delete-btn");
    if (delBtn) {
      delBtn.onclick = () => {
        const arr = getCurrentBlocks();
        const idx = arr.findIndex((x) => x.id === b.id);
        if (idx !== -1) {
          arr.splice(idx, 1);
          renderBoard();
        }
      };
    }

    board.appendChild(card);
  });
}

function addBlock(type, content) {
  if (!content) return;
  const arr = getCurrentBlocks();
  arr.push({
    id: "blk_" + Math.random().toString(36).slice(2, 9),
    type,
    content,
  });
  renderBoard();
}

// ===============================
// BLOCK BUTTONS (MODAL + FILE)
// ===============================
window.addTextBlock = () => {
  const title =
    currentLang === "ru"
      ? "Введите текст"
      : currentLang === "en"
      ? "Enter text"
      : "Мәтін енгізіңіз";
  const ph =
    currentLang === "ru"
      ? "Текст..."
      : currentLang === "en"
      ? "Text..."
      : "Мәтін...";
  openModal(title, ph, (val) => addBlock("text", val));
};

window.addFormula = () => {
  const title =
    currentLang === "ru"
      ? "Введите формулу"
      : currentLang === "en"
      ? "Enter formula"
      : "Формуланы енгізіңіз";
  const ph =
    currentLang === "ru"
      ? "Формула..."
      : currentLang === "en"
      ? "Formula..."
      : "Формула...";
  openModal(title, ph, (val) => addBlock("formula", val));
};

window.addImage = () => {
  // Компьютерден файл таңдау (саған ұнаған вариант)
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      addBlock("image", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  input.click();
};

window.addVideo = () => {
  const title =
    currentLang === "ru"
      ? "Введите ссылку на видео"
      : currentLang === "en"
      ? "Enter video URL"
      : "Видео сілтемесін енгізіңіз";
  const ph = "YouTube / video URL";

  openModal(title, ph, (url) => {
    if (!url) return;
    let finalUrl = url.trim();

    // YouTube → embed
    const ytMatch = finalUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (ytMatch) {
      const id = ytMatch[1];
      finalUrl = `https://www.youtube.com/embed/${id}`;
    }

    addBlock("video", finalUrl);
  });
};

window.addLink = () => {
  const title =
    currentLang === "ru"
      ? "Введите ссылку"
      : currentLang === "en"
      ? "Enter link"
      : "Сілтеме URL енгізіңіз";
  const ph = "https://...";
  openModal(title, ph, (url) => addBlock("link", url.trim()));
};

window.addTrainer = () => {
  const title =
    currentLang === "ru"
      ? "URL тренажёра (iframe)"
      : currentLang === "en"
      ? "Trainer URL (iframe)"
      : "Тренажер URL (iframe)";
  const ph = "https://your-trainer-url...";
  openModal(title, ph, (url) => addBlock("trainer", url.trim()));
};

// ===============================
// AI MODULE — Панель + тақтаға блок
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
        : "Алдымен сұрауды енгізіңіз!";
    alert(msg);
    return;
  }

  if (output) {
    const t = T[currentLang] || T.kk;
    output.innerHTML = `<div class="ai-loading">${t.aiLoading}</div>`;
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

    // Тақтаға AI блок ретінде қосу
    addBlock("ai", answer);
  } catch (err) {
    console.error("AI ERROR:", err);
    if (output) {
      const t = T[currentLang] || T.kk;
      output.innerHTML = `<div class="ai-error">${t.aiError}</div>`;
    }
  }
};

// ===============================
// LIVEROOM + QR + Firebase streams
// ===============================
let currentRoom = null;

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
  set(roomRef, { createdAt: Date.now() });

  generateQR();
  listenStudentStreams();
};

function generateQR() {
  const qrDiv = $("qrContainer");
  if (!qrDiv || !currentRoom) return;

  qrDiv.innerHTML = "";

  const url = `${location.origin}/student.html?room=${currentRoom}`;

  // eslint-disable-next-line no-undef
  new QRCode(qrDiv, {
    text: url,
    width: 140,
    height: 140,
  });
}

function listenStudentStreams() {
  if (!currentRoom) return;

  // ANSWERS
  const answersRef = ref(db, `rooms/${currentRoom}/answers`);
  onValue(answersRef, (snap) => {
    const box = $("studentAnswers");
    if (!box) return;

    const t = T[currentLang] || T.kk;
    const data = snap.val();
    if (!data) {
      box.innerHTML = t.noAnswers;
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

    const t = T[currentLang] || T.kk;
    const data = snap.val();
    if (!data) {
      box.innerHTML = t.noEmo;
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

    const t = T[currentLang] || T.kk;
    const data = snap.val();
    if (!data) {
      box.innerHTML = t.noWords;
      return;
    }

    const words = Object.values(data)
      .map((w) => w.word || "")
      .filter(Boolean);

    box.innerHTML = words.map((w) => `<span class="wc-chip">${w}</span>`).join(" ");
  });
}

// ===============================
// INIT
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  setupLanguage();
  setupLogout();
  setupModalEvents();
  renderPages();
  renderBoard();
  const addPageBtn = $("addPageBtn");
  if (addPageBtn) addPageBtn.onclick = addPage;
});
