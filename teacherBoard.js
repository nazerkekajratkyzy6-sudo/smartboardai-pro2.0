/* ============================================================
   SMARTBOARDAI PRO 2.0 — TEACHER BOARD (DRAWING + EXPORT)
============================================================ */

import {
  db,
  ref,
  set,
  get,
  onValue,
} from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

/* ============================================================
   GLOBAL STATE
============================================================ */
let pages = [];
let currentPage = 0;
let boardState = [];

/* ============================================================
   INIT
============================================================ */

function initBoard() {
  const params = new URLSearchParams(window.location.search);
  const lessonFromUrl = params.get("lesson");

  if (localStorage.getItem("sb-pages-v1")) {
    loadPages();
  } else {
    pages = [[]];
    currentPage = 0;
    boardState = pages[0];
    savePages();
  }

  renderTabs();
  renderBoard();

  setupDrawing();
  setupFullscreen();
  setupTools();
  setupRoom();
  setupLessonPlanner();
  setupTrainerModal();
  setupQR();
  setupAIPanel();
  setupSaveLoad();
  setupExport();

  const langSelect = $("langSelect");
  const savedLang = localStorage.getItem("sb-lang") || "kk";
  if (langSelect) langSelect.value = savedLang;
  applyLang(savedLang);

  if (langSelect) {
    langSelect.onchange = (e) => {
      const lang = e.target.value;
      localStorage.setItem("sb-lang", lang);
      applyLang(lang);
    };
  }

  if (lessonFromUrl) {
    const saveNameInput = $("saveName");
    if (saveNameInput) saveNameInput.value = lessonFromUrl;
    loadLessonByName(lessonFromUrl);
  }

  // авто-сақтау
  setInterval(() => savePages(), 3000);
}

initBoard();

/* ============================================================
   MULTI-PAGE LOCAL SAVE
============================================================ */

function savePages() {
  try {
    pages[currentPage] = boardState;
    localStorage.setItem("sb-pages-v1", JSON.stringify(pages));
    localStorage.setItem("sb-currentPage", String(currentPage));
  } catch (e) {
    console.warn("save error:", e);
  }
}

function loadPages() {
  try {
    const raw = localStorage.getItem("sb-pages-v1");
    if (raw) pages = JSON.parse(raw);
    else pages = [[]];

    const savedIndex = Number(localStorage.getItem("sb-currentPage") || 0);
    currentPage = savedIndex >= 0 && savedIndex < pages.length ? savedIndex : 0;

    boardState = pages[currentPage] || [];
  } catch (e) {
    console.warn("load error:", e);
    pages = [[]];
    boardState = pages[0];
  }
}

function renderTabs() {
  const tabBox = $("pageTabs");
  if (!tabBox) return;

  tabBox.innerHTML = "";

  pages.forEach((p, index) => {
    const tab = document.createElement("button");
    tab.className = "page-tab" + (index === currentPage ? " active" : "");
    tab.textContent = `Бет ${index + 1}`;

    tab.onclick = () => {
      pages[currentPage] = boardState;
      currentPage = index;
      boardState = pages[currentPage] || [];
      savePages();
      renderTabs();
      renderBoard();
    };

    tabBox.appendChild(tab);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "page-tab add";
  addBtn.textContent = "+ Жаңа бет";
  addBtn.onclick = () => {
    pages[currentPage] = boardState;
    pages.push([]);
    currentPage = pages.length - 1;
    boardState = pages[currentPage];
    savePages();
    renderTabs();
    renderBoard();
  };
  tabBox.appendChild(addBtn);
}

/* ============================================================
   BOARD RENDER
============================================================ */

function addCard(block) {
  const id = "id-" + Math.random().toString(36).substring(2, 9);
  boardState = [...boardState, { id, ...block }];
  pages[currentPage] = boardState;
  renderBoard();
  savePages();
}

function deleteCard(id) {
  boardState = boardState.filter((b) => b.id !== id);
  pages[currentPage] = boardState;
  renderBoard();
  savePages();
}

function renderBoard() {
  const area = $("boardArea");
  if (!area) return;

  area.innerHTML = "";

  boardState.forEach((b) => {
    const card = document.createElement("div");
    card.className = "board-card";

    const header = document.createElement("div");
    header.className = "board-card-header";

    const title = document.createElement("b");
    title.textContent = b.type;

    const delBtn = document.createElement("button");
    delBtn.className = "btn deleteBtn";
    delBtn.textContent = "Өшіру";
    delBtn.onclick = () => deleteCard(b.id);

    header.appendChild(title);
    header.appendChild(delBtn);

    const body = document.createElement("div");
    body.className = "board-card-body";
    body.innerHTML = (b.text || "").replace(/\n/g, "<br>");

    card.appendChild(header);
    card.appendChild(body);

    area.appendChild(card);
  });

  const add = document.createElement("div");
  add.innerHTML = `
    <textarea id="newBlockText" class="input" placeholder="Жаңа блок..."></textarea>
    <button id="addBlockBtn" class="btn small" style="margin-top:6px;">Қосу</button>
  `;
  area.appendChild(add);

  $("addBlockBtn").onclick = () => {
    const txt = $("newBlockText").value.trim();
    if (!txt) return;
    addCard({ type: "Мәтін", text: txt });
    $("newBlockText").value = "";
  };

  if (window.MathJax) setTimeout(() => window.MathJax.typeset(), 100);
}
/* ============================================================
   ✏️ DRAWING SYSTEM
============================================================ */

let drawCtx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let drawTool = "pen"; // pen | marker | eraser
let drawColor = "#111827";
let drawSize = 5;

function setupDrawing() {
  const canvas = $("drawingCanvas");
  if (!canvas) return;

  const container = canvas.parentElement;
  drawCtx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const penBtn = $("drawPenBtn");
  const markerBtn = $("drawMarkerBtn");
  const eraserBtn = $("drawEraserBtn");
  const colorIn = $("drawColor");
  const sizeIn = $("drawSize");
  const clearBtn = $("drawClearBtn");

  function setTool(tool) {
    drawTool = tool;
    [penBtn, markerBtn, eraserBtn].forEach((b) => b?.classList.remove("active"));
    if (tool === "pen") penBtn?.classList.add("active");
    if (tool === "marker") markerBtn?.classList.add("active");
    if (tool === "eraser") eraserBtn?.classList.add("active");
  }

  penBtn.onclick = () => setTool("pen");
  markerBtn.onclick = () => setTool("marker");
  eraserBtn.onclick = () => setTool("eraser");

  colorIn.oninput = (e) => (drawColor = e.target.value);
  sizeIn.oninput = (e) => (drawSize = Number(e.target.value));

  clearBtn.onclick = () => {
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
  };

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.touches) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    return { x, y };
  }

  function start(e) {
    e.preventDefault();
    isDrawing = true;
    const { x, y } = getPos(e);
    lastX = x;
    lastY = y;
  }

  function move(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const { x, y } = getPos(e);

    drawCtx.save();

    if (drawTool === "eraser") {
      drawCtx.globalCompositeOperation = "destination-out";
      drawCtx.strokeStyle = "rgba(0,0,0,1)";
      drawCtx.globalAlpha = 1;
      drawCtx.lineWidth = drawSize * 2;
    } else {
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.strokeStyle = drawColor;
      drawCtx.lineWidth = drawSize;
      drawCtx.globalAlpha = drawTool === "marker" ? 0.3 : 1;
    }

    drawCtx.beginPath();
    drawCtx.moveTo(lastX, lastY);
    drawCtx.lineTo(x, y);
    drawCtx.stroke();
    drawCtx.restore();

    lastX = x;
    lastY = y;
  }

  function end(e) {
    e.preventDefault();
    isDrawing = false;
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", end);
  canvas.addEventListener("mouseleave", end);

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end, { passive: false });
  canvas.addEventListener("touchcancel", end, { passive: false });

  setTool("pen");
}

/* ============================================================
   FULLSCREEN + LANGUAGE
============================================================ */

const i18n = {
  kk: {
    tools: "Құралдар",
    room: "Бөлме",
    createRoom: "Жаңа бөлме",
    answers: "Оқушы жауаптары",
    mood: "Эмоция",
    cloud: "Сөз бұлты",
    full: "Толық экран",
    exitFull: "Шығу",
  },
  ru: {
    tools: "Инструменты",
    room: "Комната",
    createRoom: "Создать комнату",
    answers: "Ответы учеников",
    mood: "Эмоции",
    cloud: "Облако слов",
    full: "На весь экран",
    exitFull: "Выйти",
  },
  en: {
    tools: "Tools",
    room: "Room",
    createRoom: "Create room",
    answers: "Student answers",
    mood: "Emotions",
    cloud: "Word cloud",
    full: "Fullscreen",
    exitFull: "Exit",
  },
};

function setupFullscreen() {
  const fs = $("fullscreenToggleBtn");
  fs.onclick = () => {
    document.body.classList.toggle("fullscreen");

    const lang = $("langSelect").value || "kk";
    const t = i18n[lang];
    fs.textContent = document.body.classList.contains("fullscreen")
      ? t.exitFull
      : t.full;
  };
}

function applyLang(lang) {
  const t = i18n[lang];

  const map = {
    toolsTitle: t.tools,
    roomTitle: t.room,
    answersTitle: t.answers,
    moodTitle: t.mood,
    cloudTitle: t.cloud,
  };

  for (const cls in map) {
    const el = document.querySelector("." + cls);
    if (el) el.textContent = map[cls];
  }

  const btn = $("createRoomBtn");
  if (btn) btn.textContent = "🟢 " + t.createRoom;

  $("fullscreenToggleBtn").textContent = document.body.classList.contains("fullscreen")
    ? t.exitFull
    : t.full;
}

/* ============================================================
   HELPERS
============================================================ */

function getYouTubeId(url) {
  try {
    let m;
    m = url.match(/youtu\.be\/([^?]+)/);
    if (m) return m[1];

    m = url.match(/v=([^&]+)/);
    if (m) return m[1];

    m = url.match(/embed\/([^?]+)/);
    if (m) return m[1];

    return null;
  } catch {
    return null;
  }
}

/* ============================================================
   TOOLS — FOTO / VIDEO / LINK / TRAINER
============================================================ */

function setupTools() {
  $("toolCard").onclick = () =>
    addCard({ type: "Карточка", text: "Жаңа карточка..." });

  $("toolFormula").onclick = () => {
    addCard({ type: "Формула", text: "\\(E = mc^2\\)" });
    if (window.MathJax) window.MathJax.typeset();
  };

  // Фото
  const imgInput = document.createElement("input");
  imgInput.type = "file";
  imgInput.accept = "image/*";
  imgInput.style.display = "none";
  document.body.appendChild(imgInput);

  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      addCard({
        type: "Фото",
        text: `<img src="${e.target.result}" style="max-width:100%;border-radius:10px;">`,
      });
    };
    reader.readAsDataURL(file);
    imgInput.value = "";
  };

  $("toolPhoto").onclick = () => imgInput.click();

  // Видео
  $("toolVideo").onclick = () => {
    const url = prompt("YouTube/MP4 сілтеме:");
    if (!url) return;

    const id = getYouTubeId(url);
    let html = "";

    if (id) {
      html = `
      <div style="position:relative;padding-bottom:56.25%;height:0;">
        <iframe src="https://www.youtube.com/embed/${id}"
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
      </div>`;
    } else {
      html = `<video src="${url}" controls style="width:100%;border-radius:10px;"></video>`;
    }

    addCard({ type: "Видео", text: html });
  };

  // Link
  $("toolLink").onclick = () => {
    const label = prompt("Атауы:") || "";
    const url = prompt("URL (https://...)");
    if (!url) return;

    addCard({
      type: "Сілтеме",
      text: `<a href="${url}" target="_blank" style="color:#2563eb;">${label || url}</a>`,
    });
  };

  // Trainer (iframe)
  $("toolTrainer").onclick = () => {
    $("trainerOverlay").classList.remove("lp-hidden");
    $("trainerModal").classList.remove("lp-hidden");
    $("trainerTitleInput").value = "";
    $("trainerUrlInput").value = "";
  };

  $("toolQuiz").onclick = () =>
    addCard({
      type: "Викторина",
      text: "Kahoot стиліндегі ойын (әзір)",
    });
}
/* ============================================================
   TRAINER MODAL (iframe)
============================================================ */

function setupTrainerModal() {
  const overlay = $("trainerOverlay");
  const modal = $("trainerModal");
  const addBtn = $("trainerAddBtn");
  const closeBtn = $("trainerCloseBtn");

  if (!overlay || !modal) return;

  function close() {
    overlay.classList.add("lp-hidden");
    modal.classList.add("lp-hidden");
  }

  closeBtn.onclick = close;
  overlay.onclick = close;

  addBtn.onclick = () => {
    const title = $("trainerTitleInput").value.trim();
    const url = $("trainerUrlInput").value.trim();

    if (!title || !url) {
      alert("Атауын және URL енгізіңіз!");
      return;
    }

    addCard({
      type: "Тренажер: " + title,
      text: `<iframe src="${url}" style="width:100%;height:300px;border-radius:10px;border:1px solid #ddd;"></iframe>`
    });

    close();
  };
}

/* ============================================================
   QR MODAL
============================================================ */

function setupQR() {
  const btn = $("qrBtn");
  const overlay = $("qrOverlay");
  const modal = $("qrModal");
  const closeBtn = $("qrCloseBtn");
  const canvas = $("qrCanvas");

  if (!btn) return;

  btn.onclick = () => {
    overlay.classList.remove("lp-hidden");
    modal.classList.remove("lp-hidden");

    new QRious({
      element: canvas,
      value: window.location.origin + "/student.html",
      size: 260
    });
  };

  function close() {
    overlay.classList.add("lp-hidden");
    modal.classList.add("lp-hidden");
  }

  closeBtn.onclick = close;
  overlay.onclick = close;
}

/* ============================================================
   ROOM: ANSWERS + EMOJI + WORD CLOUD
============================================================ */

let currentRoomId = null;

function generateRoomId() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  let id = "";
  for (let i = 0; i < 3; i++)
    id += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++)
    id += nums[Math.floor(Math.random() * nums.length)];
  return id;
}

function setupRoom() {
  const btn = $("createRoomBtn");
  btn.onclick = async () => {
    currentRoomId = generateRoomId();
    $("roomIdLabel").textContent = currentRoomId;
    await set(ref(db, "rooms/" + currentRoomId + "/meta"), {
      createdAt: Date.now(),
    });

    listenAnswers(currentRoomId);
    listenEmoji(currentRoomId);
    listenWordCloud(currentRoomId);
  };
}

function listenAnswers(roomId) {
  onValue(ref(db, `rooms/${roomId}/answers`), (snap) => {
    const box = $("answersBox");
    const data = snap.val();

    if (!data) {
      box.innerHTML = `<div class="small">Жауап жоқ…</div>`;
      return;
    }

    let html = "";
    Object.values(data).forEach((v) => {
      const av = v.avatar ? `<span>${v.avatar}</span>` : "";
      html += `
        <div class="answer-item">
          <b>${av} ${v.name}</b><br>
          ${v.text.replace(/\n/g, "<br>")}
          <hr>
        </div>
      `;
    });

    box.innerHTML = html;
  });
}

function listenEmoji(roomId) {
  const el = $("emojiStats");

  onValue(ref(db, `rooms/${roomId}/emoji`), (snap) => {
    const data = snap.val();
    if (!data) {
      el.textContent = "Дерек жоқ…";
      return;
    }

    const stats = { "🙂": 0, "😐": 0, "😕": 0, "😢": 0, "🤩": 0 };

    Object.values(data).forEach((v) => {
      if (stats[v.emoji] !== undefined) stats[v.emoji]++;
    });

    const out = Object.entries(stats)
      .filter(([, c]) => c > 0)
      .map(([e, c]) => `${e} ${c}`)
      .join(" | ");

    el.textContent = out || "Дерек жоқ…";
  });
}

function listenWordCloud(roomId) {
  const el = $("wordCloud");

  onValue(ref(db, `rooms/${roomId}/cloud`), (snap) => {
    const data = snap.val();
    if (!data) {
      el.innerHTML = "<i>Пікір жоқ...</i>";
      return;
    }

    const freq = {};
    Object.values(data).forEach((v) => {
      const w = v.word?.trim();
      if (w) freq[w] = (freq[w] || 0) + 1;
    });

    const max = Math.max(...Object.values(freq), 1);

    let html = "";
    for (const word in freq) {
      const size = 14 + Math.round((freq[word] / max) * 20);
      html += `<span style="font-size:${size}px;margin:4px;">${word}</span>`;
    }
    el.innerHTML = html;
  });
}

/* ============================================================
   AI SYSTEM
============================================================ */

async function callAI(prompt) {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json().catch(() => ({}));
    return data.answer || data.text || "AI жауап бермеді";
  } catch (e) {
    console.error(e);
    return "Қате: AI серверіне қосыла алмады.";
  }
}

function setupAIPanel() {
  const modeBtns = document.querySelectorAll(".ai-mode-btn");
  const promptEl = $("aiPrompt");
  const outEl = $("aiOutput");
  const runBtn = $("aiRunBtn");
  const insertBtn = $("aiInsertBtn");
  const clearBtn = $("aiClearBtn");
  const copyBtn = $("aiCopyBtn");

  let mode = "lesson";

  modeBtns.forEach((btn) => {
    btn.onclick = () => {
      modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
    };
  });

  runBtn.onclick = async () => {
    const base = promptEl.value.trim();
    if (!base) return;

    const lang = $("langSelect").value;

    let sys = "";

    if (mode === "lesson")
      sys = `
Сен Қазақстан мұғаліміне арналған кәсіби сабақ жоспарлаушы ассистентсің.
Тіл: ${lang}.
Келесі бөлімдерге бөл:
Мақсат:
Құралдар:
Кіріспе:
Жаңа тақырыпты түсіндіру:
Жаттығулар:
Рефлексия:
Бағалау:
Үй тапсырмасы:
`;

    if (mode === "content")
      sys = `Сен оқу материалы мен тапсырма жасайтын ассистентсің. Тіл: ${lang}.`;

    if (mode === "creative")
      sys = `Сен шығармашылық ойындар құрастыратын ассистентсің. Тіл: ${lang}.`;

    outEl.innerHTML = "<i>AI ойлап жатыр...</i>";
    runBtn.disabled = true;

    const answer = await callAI(sys + "\n\n" + base);
    outEl.textContent = answer;

    runBtn.disabled = false;
  };

  insertBtn.onclick = () => {
    const text = outEl.textContent.trim();
    if (!text) return;

    const parts = text.split("\n");
    let current = null;
    let buffer = [];
    const blocks = [];

    const isHeading = (t) =>
      /^(Мақсат|Құралдар|Кіріспе|Жаңа тақырыпты түсіндіру|Жаттығулар|Рефлексия|Бағалау|Үй тапсырмасы)/i.test(
        t
      );

    parts.forEach((line) => {
      if (isHeading(line.trim())) {
        if (current) {
          blocks.push({ type: current, text: buffer.join("\n") });
          buffer = [];
        }
        current = line.trim();
      } else buffer.push(line);
    });

    if (current)
      blocks.push({ type: current, text: buffer.join("\n") });

    if (!blocks.length)
      addCard({ type: "AI блок", text });

    else
      blocks.forEach((b) => addCard(b));
  };

  clearBtn.onclick = () => {
    promptEl.value = "";
    outEl.innerHTML = "<span class='small'>AI жауабы осында...</span>";
  };

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(outEl.textContent);
      alert("Көшірілді!");
    } catch {
      alert("Көшіру мүмкін емес.");
    }
  };
}

/* ============================================================
   SAVE / LOAD LESSON
============================================================ */

function setupSaveLoad() {
  const saveBtn = $("saveLessonBtn");
  const loadBtn = $("loadLessonBtn");
  const nameInput = $("saveName");

  saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) return alert("Сабақ атауын жазыңыз!");

    pages[currentPage] = boardState;

    await set(ref(db, `boards/${encodeURIComponent(name)}`), {
      meta: { name, savedAt: Date.now() },
      pages,
      currentPage,
    });

    alert("Сақталды!");
  };

  loadBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return alert("Сабақ атауын жазыңыз!");

    loadLessonByName(name);
  };
}

async function loadLessonByName(name) {
  const snap = await get(ref(db, `boards/${encodeURIComponent(name)}`));
  if (!snap.exists()) return alert("Сабақ табылмады!");

  const data = snap.val();
  if (!data.pages) return alert("Қате формат!");

  pages = data.pages;
  currentPage =
    typeof data.currentPage === "number" ? data.currentPage : 0;

  boardState = pages[currentPage] || [];

  savePages();
  renderTabs();
  renderBoard();

  alert("Сабақ жүктелді!");
}

/* ============================================================
   EXPORT: PDF / PNG / SHARE
============================================================ */

function setupExport() {
  $("exportPngBtn").onclick = exportAsPng;
  $("exportPdfBtn").onclick = exportAsPdf;
  $("shareLessonBtn").onclick = showShareModal;

  $("shareCloseBtn").onclick = closeShare;
  $("shareOverlay").onclick = closeShare;

  $("shareCopyBtn").onclick = async () => {
    const txt = $("shareLinkInput").value;
    await navigator.clipboard.writeText(txt);
    alert("Көшірілді!");
  };
}

async function exportAsPng() {
  const root = $("boardExportRoot");

  const canvas = await html2canvas(root, { scale: 2 });
  const url = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = url;
  a.download = "SmartBoardAI_Lesson.png";
  a.click();
}

async function exportAsPdf() {
  const root = $("boardExportRoot");

  const canvas = await html2canvas(root, { scale: 2 });
  const data = canvas.toDataURL("image/jpeg", 0.95);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;

  pdf.addImage(data, "JPEG", 0, position, imgW, imgH);

  heightLeft -= pageH;

  while (heightLeft > 0) {
    pdf.addPage();
    pdf.addImage(data, "JPEG", 0, -imgH + heightLeft + pageH, imgW, imgH);
    heightLeft -= pageH;
  }

  pdf.save("SmartBoardAI_Lesson.pdf");
}

/* ============================================================
   SHARE LESSON
============================================================ */

function showShareModal() {
  const name = $("saveName").value.trim();
  if (!name) return alert("Алдымен сабақ атауын жазыңыз және сақтаңыз.");

  const url =
    window.location.origin +
    window.location.pathname +
    "?lesson=" +
    encodeURIComponent(name);

  $("shareLinkInput").value = url;
  $("shareOverlay").classList.remove("lp-hidden");
  $("shareModal").classList.remove("lp-hidden");
}

function closeShare() {
  $("shareOverlay").classList.add("lp-hidden");
  $("shareModal").classList.add("lp-hidden");
}
