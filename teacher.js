// teacher.js — SmartBoardAI PRO (PHASE 1 FINAL)
// Modal UI + Multi-Page + i18n + AI → Board Block

import { db, ref, set, push, onValue } from "./firebaseConfig.js";
import { t, setLang, currentLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);

// =====================================================
// GLOBAL STATE
// =====================================================
let pages = [{ id: "page_1", blocks: [] }];
let currentPage = 0;

let modalCallback = null;

// =====================================================
// MODAL UI
// =====================================================
export function openModal(title, placeholder, callback) {
  const bg = $("modal-bg");
  const input = $("modal-input");
  $("modal-title").textContent = title;

  input.placeholder = placeholder;
  input.value = "";

  modalCallback = callback;
  bg.style.display = "flex";
}

function closeModal() {
  $("modal-bg").style.display = "none";
}

// Modal buttons
$("modal-ok").onclick = () => {
  const val = $("modal-input").value.trim();
  if (modalCallback) modalCallback(val);
  closeModal();
};
$("modal-cancel").onclick = closeModal;


// =====================================================
// INIT
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  setupLanguageButtons();
  renderPagesUI();
  renderBoard();
});



// =====================================================
// LANGUAGE SYSTEM
// =====================================================
function setupLanguageButtons() {
  $("langKZ").onclick = () => {
    setLang("kk");
    updateUI();
  };
  $("langRU").onclick = () => {
    setLang("ru");
    updateUI();
  };
  $("langEN").onclick = () => {
    setLang("en");
    updateUI();
  };
}

function updateUI() {
  $("topbar-title").textContent = "📘 SmartBoardAI PRO — " + t("teacher");
  $("addPageBtn").textContent = t("add_page");

  renderPagesUI();
  renderBoard();
}



// =====================================================
// PAGE SYSTEM (MULTI-PAGE)
// =====================================================
function addPage() {
  const newId = "page_" + (pages.length + 1);
  pages.push({ id: newId, blocks: [] });
  currentPage = pages.length - 1;
  renderPagesUI();
  renderBoard();
}

function switchPage(i) {
  currentPage = i;
  renderPagesUI();
  renderBoard();
}

function renderPagesUI() {
  const wrap = $("pagesWrap");
  wrap.innerHTML = "";

  pages.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className = i === currentPage ? "page-btn active" : "page-btn";
    btn.textContent = t("page") + " " + (i + 1);
    btn.onclick = () => switchPage(i);
    wrap.appendChild(btn);
  });
}



// =====================================================
// BOARD RENDER
// =====================================================
function renderBoard() {
  const board = $("board");
  const blocks = pages[currentPage].blocks;

  if (!blocks.length) {
    board.innerHTML = `<h3 class="center-msg">${t("empty_board")}</h3>`;
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

    let content = "";

    if (b.type === "text") content = safe(b.content);
    if (b.type === "formula") content = `<div class="math-block">${safe(b.content)}</div>`;
    if (b.type === "image") content = `<img src="${b.content}" class="board-image">`;
    if (b.type === "video")
      content = `<iframe src="${b.content}" class="board-video" allowfullscreen></iframe>`;
    if (b.type === "link")
      content = `<a href="${b.content}" target="_blank">${safe(b.content)}</a>`;
    if (b.type === "trainer")
      content = `<iframe src="${b.content}" class="trainer-frame"></iframe>`;
    if (b.type === "ai")
      content = `<div class="ai-answer-block">${safe(b.content)}</div>`;

    card.innerHTML = `
      <div class="board-card-header">
        <span>${t("block_" + b.type)}</span>
        <button class="card-delete-btn">${t("delete")}</button>
      </div>
      <div class="board-card-body">${content}</div>
    `;

    // Delete
    card.querySelector(".card-delete-btn").onclick = () => {
      pages[currentPage].blocks = pages[currentPage].blocks.filter((x) => x.id !== b.id);
      renderBoard();
    };

    board.appendChild(card);
  });
}



// =====================================================
// ADD BLOCK
// =====================================================
function addBlock(type, content) {
  if (!content) return;

  pages[currentPage].blocks.push({
    id: "blk_" + Math.random().toString(36).slice(2),
    type,
    content,
  });

  renderBoard();
}



// =====================================================
// BUTTON ACTIONS WITH MODAL
// =====================================================
window.addTextBlock = () => {
  openModal(t("mod_text"), t("ph_text"), (val) => {
    if (val) addBlock("text", val);
  });
};

window.addFormula = () => {
  openModal(t("mod_formula"), t("ph_formula"), (val) => {
    if (val) addBlock("formula", val);
  });
};

window.addImage = () => {
  openModal(t("mod_image"), "https://…", (val) => {
    if (val) addBlock("image", val);
  });
};

window.addVideo = () => {
  openModal(t("mod_video"), "YouTube embed URL", (val) => {
    if (val) addBlock("video", val);
  });
};

window.addLink = () => {
  openModal(t("mod_link"), "https://…", (val) => {
    if (val) addBlock("link", val);
  });
};

window.addTrainer = () => {
  openModal(t("mod_trainer"), "https://trainer-url…", (val) => {
    if (val) addBlock("trainer", val);
  });
};

$("addPageBtn").onclick = addPage;



// =====================================================
// AI MODULE (AI → block)
// =====================================================
window.generateAI = async function () {
  const promptArea = $("aiPrompt");
  const text = (promptArea?.value || "").trim();

  if (!text) {
    alert(t("enter_prompt"));
    return;
  }

  $("aiOutput").innerHTML = `<div class="ai-loading">${t("ai_loading")}</div>`;

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
    const answer = data.answer || "AI бос жауап берді.";

    // Тақтаға автомат блок ретінде түсіру
    addBlock("ai", answer);

    // AI панелінде де көрсету
    $("aiOutput").innerHTML = `
      <div class="ai-answer">${answer.replace(/\n/g, "<br>")}</div>
    `;
  } catch (e) {
    $("aiOutput").innerHTML = `<div class="ai-error">${t("ai_error")}</div>`;
  }
};



// =====================================================
// LOGOUT
// =====================================================
$("logout").onclick = () => {
  alert(t("logout_msg"));
  location.href = "index.html";
};
