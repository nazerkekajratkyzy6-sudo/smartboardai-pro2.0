// teacher.js -- SmartBoardAI PRO (Phase 1 + Trainers Panel, NO i18n.js сыртқы файл)

// Функциялар:
// - Language switch (ішкі T объект арқылы)
// - Modal UI (prompt орнына)
// - Multi-page (pages[])
// - QR + RoomID + Firebase (answers + emotions + wordcloud)
// - AI → панель + тақтаға блок
// - Trainers Panel: 3 категория (generators / math / reflection) → iframe блок

import {
  db,
  ref,
  set,
  get,
  push,
  onValue,
  auth,
  onAuthStateChanged,
  signOut
} from "./firebaseConfig.js";

import { checkAccess } from "./access-control.js";

// ── safeReady: DOMContentLoaded немесе дереу ──────────

// ── showToast —  alert() орнына ──────────────────────
function showToast(msg, type) {
  const ex = document.getElementById("sbToast");
  if (ex) ex.remove();
  const t = document.createElement("div");
  t.id = "sbToast";
  const colors = {
    ok:   { bg:"#0f172a", border:"#4f46e5" },
    warn: { bg:"#b45309", border:"#f59e0b" },
    error:{ bg:"#991b1b", border:"#ef4444" },
    info: { bg:"#0369a1", border:"#0ea5e9" },
  };
  const c = colors[type] || colors.info;
  t.style.cssText = [
    "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);",
    `background:${c.bg};border:1.5px solid ${c.border};`,
    "color:white;padding:10px 22px;border-radius:999px;",
    "font-size:13px;font-weight:700;font-family:'Inter',system-ui,sans-serif;",
    "z-index:9999;box-shadow:0 8px 28px rgba(15,23,42,0.25);",
    "display:flex;align-items:center;gap:8px;",
    "animation:card-in .3s ease;pointer-events:none;",
    "max-width:min(480px,90vw);text-align:center;",
  ].join("");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
window.showToast = showToast;

// ── escapeHtml —  XSS қорғанысы ──────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}
window.escapeHtml = escapeHtml;

function safeReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

const $ = (id) => document.getElementById(id);

let currentLang = "kk";
let editingBlockId = null;

// Multi-page state
let pages = [{ id: "page_1", blocks: [] }];
let currentPageIndex = 0;


// =====================================================
// TEACHER CABINET -- STATE API
// =====================================================
window.getTeacherState = function() {
  return {
    pages:            JSON.parse(JSON.stringify(pages)),
    currentPageIndex: currentPageIndex,
  };
};

window.setTeacherState = function(state) {
  if (!state || !state.pages) return;
  pages            = state.pages;
  currentPageIndex = state.currentPageIndex || 0;
  renderPages();
  renderBoard();
};

// =====================================================
// TRAINERS DATA
// Папка аты (id) → URL: /trainers/<category>/<id>/index.html
// Экрандағы атауы: id ішіндегі "_" → " "
// =====================================================
const TRAINERS = {
  generators: [
    "anagram",
    "anagram-build_the_word",
    "anagramma",
    "Artyq_sozdi_tap",
    "Asyq_atu_oiin",
    "Bagalau_generatory",
    "Bagytty_tanda",
    "Bigger_or_Smaller",
    "crossword",
    "Erezhege_sai_toptastyr",
    "Este_saktau_kartochkalary",
    "funkciya_generatory",
    "Ia_Joq",
    "Jad_pen_zeyindi_damytu",
    "Jasyryn_sozder_generatory",
    "Joqalgan_aripti_tap",
    "Jyldam_reakciya_oyny",
    "Jyldam_toptastyru",
    "Koordinattardy_tap",
    "Logikalyq_keste",
    "Magynasyna_qarai_bol",
    "Match_Up",
    "Oqushy_tandau",
    "Oqushy_topqa_bolu",
    "pisa_timss_generator",
    "Qai_sym_qai_shamga_barady",
    "Rettilik_qurastyr",
    "Saikestendiru",
    "San_syzygynda_belgele",
    "Skanvord_generator",
    "Soilem_qurastyr",
    "solver",
    "Sozdi_bir-birine_turlendir",
    "Suraq_tandau",
    "Syzyqpen_saikestendir",
    "tarsia",
    "timer",
    "Togyzqumalaq_oiin",
    "Top_ishindegi_rolderge_bolu",
    "Topqa_bolu_generator",
    "Tort_nusqaly_Quiz",
    "Ulgini_jalgastyr",
    "wordcloud",
    "Wordsearch_KZ",
  ],
  math: [
    "10butin",
    "10logarifm",
    "10parametr",
    "10planimetria",
    "10Stereometria",
    "10trig",
    "6-synyp-Proporciya",
    "7-synyp-Birmusheler",
    "7-synyp-Kopmusheler",
    "8-synyp-Tendeuler trenazheri",
    "8-synyp-Viet_teoremasy",
    "9-synyp-Trigonomeriya",
    "10-synyp-Trigonomeriyalyq_tendeuler",
    "11-synyp-Korsetkistik_tendeuler",
    "Absoliutti_jiilik_7",
    "Algebra_trenazhery(7-11)",
    "Arif_prog",
    "Bir_ainymaly_tensizdikter_6",
    "Bolshek_5_synyp",
    "Dareze_7",
    "Formula_5_synyp",
    "funkciyalar_grafigi-7-synyp",
    "Geom_progressiya",
    "Geometriya_trenazhery(7-11)",
    "Grafiktiq_tasilme_tendeuler_zhuiesin_sheshu_7",
    "Grafiktiq_tasilmen_sheshu_7",
    "Jiilik_kestesi_jane_jiilik_alqaby",
    "Koleso_toptyq_zarys",
    "Kombinatorika_9",
    "Koordinata_zhaiyqtyq",
    "Kvadrat_tendeu_8",
    "Matematika_trenazhery(5-6synyp)",
    "Negizgi_trigonometrialyq_tepe-tendikter_8",
    "On_zhane_teris_sandar_6",
    "Ondyq_bolshek_5",
    "Paiz",
    "Pifagor_teoremasy_8",
    "qazmath_offline_lab",
    "Salystrmaly_jiilik_7",
    "Syzyqtyq _funkciyalardyn_ozara_ornalasuy_7",
    "Syzyqtyq_funkciya",
    "Tenbuyirli_ushburysh_7_geometriya",
    "Tikburyshty_ushburyshtardy_sheshu_8",
    "Toptyq_zarys_Ushburyshtar",
    "Variaciialyq_qatar_quru7",
    "quadratic-generator",
  ],
  reflection: [
    "Asyq",
    "Aua_raıy",
    "Bagalau_juiesi",
    "bagdarsham_refleksiya",
    "batareya_refleksiya",
    "dombyra_refleksiya",
    "emoji_reflection",
    "emotion_refleksiya",
    "Kerі_baılanys",
    "konil-kuı",
    "konil-kuı/_shary",
    "Osu_dengeıі",
    "Poiyz_refleksiya",
    "Qumsagat_kerі_baılanys",
    "Qundylyq_refleksiya",
    "Refleksiya_Kevin",
    "Refleksiya_ufo",
    "Universal_ref",
    "psihonastroy",
    "refleksia",
    "topbolu",
  ],
};

// =====================================================
// LANGUAGE TEXTS
// =====================================================
const T = {
  kk: {
    topbar: "📘 SmartBoardAI PRO -- Мұғалім",
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
    trainersTitle: "🕹 Тренажерлер",
    catGenerators: "Генераторлар",
    catMath: "Математика",
    catReflection: "Рефлексия",
  },
  ru: {
    topbar: "📘 SmartBoardAI PRO -- Учитель",
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
    trainersTitle: "🕹 Тренажёры",
    catGenerators: "Генераторы",
    catMath: "Математика",
    catReflection: "Рефлексия",
  },
  en: {
    topbar: "📘 SmartBoardAI PRO -- Teacher",
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
    trainersTitle: "🕹 Trainers",
    catGenerators: "Generators",
    catMath: "Math",
    catReflection: "Reflection",
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

  // Тренажёр панелінің тілдері
  const trainersTitle = $("trainerPanelTitle");
  const tabGen = $("trainerTabGenerators");
  const tabMath = $("trainerTabMath");
  const tabRefl = $("trainerTabReflection");
  if (trainersTitle) trainersTitle.textContent = t.trainersTitle;
  if (tabGen) tabGen.textContent = t.catGenerators;
  if (tabMath) tabMath.textContent = t.catMath;
  if (tabRefl) tabRefl.textContent = t.catReflection;

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

// =====================================================
// MODAL UI (prompt орнына)
// =====================================================
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

// =====================================================
// LOGOUT
// =====================================================
function setupLogout() {
  const btn = $("logout");
  if (!btn) return;
  btn.onclick = async () => {
    const msg =
      currentLang === "ru"
        ? "Вы вышли из системы."
        : currentLang === "en"
        ? "You have logged out."
        : "Сіз жүйеден шықтыңыз.";
    showToast(msg, "info");
    // Бір реттік қолжетімділік — шыққанда дереу белгілейміз
    // (onDisconnect те жасайды, бірақ мұны бірден істеу сенімдірек)
    if (window._accessLockRef) {
      try { await set(window._accessLockRef, true); } catch (e) {}
    }
    location.href = "index.html";
  };
}

// =====================================================
// PAGE SYSTEM
// =====================================================
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

// =====================================================
// BOARD
// =====================================================
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

    if (b.type === "text") {
      // Қарапайым мәтін - escape
      contentHtml = `<div class="board-text">${safe(b.content)}</div>`;
    } else if (b.type === "rich") {
  contentHtml = `
    <div class="board-text math-rich">
      ${b.content}
    </div>
  `;
}    else if (b.type === "ai") {
      // HTML мазмұн — escape емес, тікелей render
      contentHtml = `<div class="board-text" style="line-height:1.7;font-size:14px;">${b.content}</div>`;
    } else if (b.type === "formula") {
  contentHtml = `
    <div class="math-block">
      \\(${b.content}\\)
    </div>
  `;
    } else if (b.type === "image") {
      contentHtml = `<img src="${b.content}" class="board-image">`;
    }else if (b.type === "studentPhoto") {
  const url = b.content?.url || "";
  const name = b.content?.name || "Оқушы";
  const avatar = b.content?.avatar || "🙂";

  contentHtml = `
    <div class="student-photo-meta"><b>${avatar} ${name}</b></div>
    <img src="${url}" class="board-image">
    <button class="download-btn">⬇ Жүктеу</button>
  `;
}    else if (b.type === "video") {
      const vc = String(b.content || "");
      if (vc.trimStart().startsWith("<")) {
        // Жаңа нұсқа: html string (iframe/video tag)
        contentHtml = `<div style="width:100%;border-radius:12px;overflow:hidden;">${vc}</div>`;
      } else {
        // Ескі нұсқа: URL тікелей
        contentHtml = `<iframe src="${vc}" width="100%" height="315" frameborder="0" allowfullscreen style="border-radius:10px;display:block;"></iframe>`;
      }
   } else if (b.type === "link") {
  const safeUrl = String(b.content || "").replace(/"/g, "&quot;");

  contentHtml = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="word-break:break-all; opacity:.9;">${safeUrl}</div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="open-overlay-btn" data-url="${safeUrl}" style="
          border:none; background:#2563eb; color:#fff; border-radius:12px;
          padding:10px 12px; font-weight:700; cursor:pointer;
        ">▶ Открыть на доске</button>

        <a href="${safeUrl}" target="_blank" rel="noopener" style="
          display:inline-flex; align-items:center; gap:6px;
          padding:10px 12px; border-radius:12px;
          background:#f1f5f9; border:1px solid #cbd5e1;
          text-decoration:none; color:#0f172a; font-weight:700;
        ">↗ В новой вкладке</a>
      </div>
    </div>
  `;
}
    else if (b.type === "trainer") {
      contentHtml = `<iframe src="${b.content}" class="trainer-frame"></iframe>`;
    }
    else if (b.type === "geogebra") {
    contentHtml = `
        <iframe 
            src="${b.content}" 
            class="geogebra-frame" 
            allowfullscreen 
            frameborder="0">
        </iframe>`;
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

      <div style="display:flex; gap:6px;">
          <button class="edit-btn" data-id="${b.id}">✏</button>
          <button class="fullscreen-btn" data-id="${b.id}">⛶</button>
          <button class="share-btn" data-id="${b.id}">👁 Оқушыға</button>
          <button class="card-delete-btn">✕</button>
      </div>
  </div>

  <div class="board-card-body" id="blk_${b.id}">
      ${contentHtml}
  </div>
`;
const editBtn = card.querySelector(".edit-btn");
if (editBtn) {
  editBtn.onclick = () => {
    if (b.type !== "rich") return;
    openRichEditorForBlock(b.id, b.content);
  };
}
    
// FULLSCREEN: батырмаға listener қосу
const fsBtns = card.querySelectorAll(".fullscreen-btn");
fsBtns.forEach(btn => {
    btn.onclick = () => {
        const blockId = btn.getAttribute("data-id");
        openFullscreenBlock(blockId);
    };
  // OPEN LINK IN OVERLAY (for link blocks)
const ovBtn = card.querySelector(".open-overlay-btn");
if (ovBtn) {
  ovBtn.onclick = () => {
    const url = ovBtn.getAttribute("data-url");
    sbOpenOverlay(url, title);
  };
}

});
    // DOWNLOAD (studentPhoto)
const dlBtn = card.querySelector(".download-btn");
if (dlBtn && b.type === "studentPhoto") {
  dlBtn.onclick = () => {
    const url = b.content?.url;
    const name = b.content?.name || "student";
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}_photo.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
}

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
const shareBtn = card.querySelector(".share-btn");
if (shareBtn) {
  shareBtn.onclick = () => {
    if (!currentRoom) {
      showToast("Алдымен бөлме ашыңыз", "info");
      return;
    }

    set(
      ref(db, `rooms/${currentRoom}/activeBlock`),
      {
        type: b.type,
        content: b.content,
        time: Date.now()
      }
    );
  };
}
    board.appendChild(card);
  });
  // ✅ MathJax-ты DOM дайын болғаннан кейін іске қосу
if (window.MathJax) {
  MathJax.typesetPromise();
}

}

function addBlock(type, content) {
  if (!content) return;

  const arr = getCurrentBlocks();
  arr.push({
    id: "blk_" + Math.random().toString(36).slice(2, 9),
    type,
    content,
  });
if (window.MathJax) {
  MathJax.typesetPromise();
}

  renderBoard();

  // 👇 ОҚУШЫҒА ЖІБЕРУ
  if (currentRoom) {
    const blockRef = ref(db, `rooms/${currentRoom}/activeBlock`);
    set(blockRef, {
      type,
      content,
      time: Date.now(),
    });
  }
}



// window-ға шығару -- HTML onclick үшін
window.addBlock = addBlock;

// Тренажерді тікелей ашу (sidebar батырмалары)
window.openTrainerDirect = function(category, id) {
  // Relative URL -- GitHub Pages-та да, localhost-та да жұмыс істейді
  const base = window.location.pathname.replace(/\/[^\/]*$/, '');
  const url = `${base}/trainers/${category}/${id}/index.html`;
  addBlock('trainer', url);
};

// =====================================================
// BLOCK BUTTONS (MODAL + FILE)
// =====================================================
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

window.addFormula = function () {
  if (document.getElementById("fxModal")) {
    document.getElementById("fxModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "fxModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:20px;width:min(700px,96vw);box-shadow:0 20px 60px rgba(15,23,42,0.2);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#1e3a8a,#4f46e5);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;";
  hdr.innerHTML = `<div><div style="font-size:15px;font-weight:800;color:white;">∑ Формула редакторы</div><div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">LaTeX немесе дайын үлгіден таңдаңыз</div></div>`;
  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = "background:rgba(255,255,255,0.15);color:white;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => modal.style.display = "none";
  hdr.appendChild(closeBtn);

  // Quick templates
  const templates = document.createElement("div");
  templates.style.cssText = "padding:12px 16px;border-bottom:1px solid #e2e6f0;background:#f8f9ff;";
  templates.innerHTML = '<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;">Жылдам үлгілер:</div>';

  const grid = document.createElement("div");
  grid.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;";

  const TEMPLATES = [
    ["x²", "x^{2}"], ["xⁿ", "x^{n}"], ["√x", "\sqrt{x}"],
    ["a/b", "\frac{a}{b}"], ["∑", "\sum_{i=1}^{n} x_i"],
    ["∫", "\int_{a}^{b} f(x)dx"], ["π", "\pi"], ["∞", "\infty"],
    ["≤", "\leq"], ["≥", "\geq"], ["≠", "\neq"], ["±", "\pm"],
    ["sin", "\sin(x)"], ["cos", "\cos(x)"], ["log", "\log_{a}b"],
    ["|x|", "|x|"], ["lim", "\lim_{x \to \infty} f(x)"],
    ["2x2", "\begin{pmatrix}a&b\\c&d\end{pmatrix}"],
  ];

  TEMPLATES.forEach(([label, val]) => {
    const btn = document.createElement("button");
    btn.style.cssText = "padding:5px 10px;border:1.5px solid #c7d2fe;border-radius:8px;background:#eef2ff;color:#4f46e5;font-size:13px;cursor:pointer;font-family:serif;font-weight:700;transition:.12s;";
    btn.textContent = label;
    btn.title = val;
    btn.onmouseover = () => btn.style.background = "#c7d2fe";
    btn.onmouseout  = () => btn.style.background = "#eef2ff";
    btn.onclick = () => {
      const inp = document.getElementById("fxInput");
      if (inp) { inp.value = val; window.fxPreview(); inp.focus(); }
    };
    grid.appendChild(btn);
  });
  templates.appendChild(grid);

  // Input + preview
  const body = document.createElement("div");
  body.style.cssText = "padding:14px 16px;";
  body.innerHTML = `
    <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">LaTeX формуласы:</label>
    <div style="display:flex;gap:8px;margin-bottom:10px;">
      <input id="fxInput" type="text" placeholder="мысалы: \frac{a}{b}  немесе  x^2 + y^2 = z^2"
        style="flex:1;padding:10px 12px;border:2px solid #c7d2fe;border-radius:10px;font-size:14px;font-family:monospace;"
        oninput="fxPreview()"/>
      <button onclick="fxPreview()" style="padding:10px 14px;border:none;border-radius:10px;background:#4f46e5;color:white;font-size:13px;font-weight:700;cursor:pointer;">👁</button>
    </div>
    <div id="fxPreviewBox" style="min-height:70px;background:#f8f9ff;border:1.5px solid #e2e6f0;border-radius:10px;padding:14px;text-align:center;font-size:22px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;">
      <span style="color:#94a3b8;font-size:13px;">Формула осында шығады...</span>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button onclick="document.getElementById('fxModal').style.display='none'" style="padding:10px 18px;border:1.5px solid #e2e6f0;border-radius:10px;background:#f9fafb;color:#374151;font-size:13px;font-weight:700;cursor:pointer;">Болдырмау</button>
      <button onclick="fxAddToBoard()" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,#1e3a8a,#4f46e5);color:white;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,0.3);">📌 Тақтаға қосу</button>
    </div>`;

  wrap.appendChild(hdr);
  wrap.appendChild(templates);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById("fxInput")?.focus(), 100);
};

// Формула preview
window.fxPreview = function() {
  const val = document.getElementById("fxInput")?.value.trim();
  const box = document.getElementById("fxPreviewBox");
  if (!box) return;
  if (!val) { box.innerHTML = '<span style="color:#94a3b8;font-size:13px;">Формула осында шығады...</span>'; return; }

  const id = "fxPv_" + Date.now();
  box.innerHTML = `<div id="${id}" style="font-size:24px;">\(${val}\)</div>`;

  const render = () => {
    const el = document.getElementById(id);
    if (el && window.MathJax) {
      MathJax.typesetPromise([el]).catch(e => {
        box.innerHTML = `<span style="color:#dc2626;font-size:12px;">⚠️ Формула қатесі —  LaTeX синтаксисін тексеріңіз</span>`;
      });
    }
  };

  if (window.MathJax) {
    render();
  } else {
    if (!document.querySelector('script[src*="mathjax"]')) {
      const s = document.createElement("script");
      s.id = "mathjaxScript";
      s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }
};

// Тақтаға қосу
window.fxAddToBoard = function() {
  const val = document.getElementById("fxInput")?.value.trim();
  if (!val) { showToast("⚠️ Формула жазыңыз!", "warn"); return; }

  const bid = "fx_" + Math.random().toString(36).slice(2,7);
  const html = `<div id="${bid}" style="font-size:24px;text-align:center;padding:14px 10px;background:#f8f9ff;border-radius:10px;">\(${val}\)</div>`;
  addBlock("formula", html);

  setTimeout(() => {
    const el = document.getElementById(bid);
    if (!el) return;
    if (window.MathJax) {
      MathJax.typesetPromise([el]).catch(console.error);
    } else {
      const s = document.querySelector("#mathjaxScript") || document.createElement("script");
      if (!s.src) {
        s.id = "mathjaxScript";
        s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
        s.onload = () => MathJax.typesetPromise([el]).catch(console.error);
        document.head.appendChild(s);
      } else {
        s.addEventListener("load", () => MathJax.typesetPromise([el]).catch(console.error));
      }
    }
  }, 500);

  document.getElementById("fxModal").style.display = "none";
  if (document.getElementById("fxInput")) document.getElementById("fxInput").value = "";
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

window.addVideo = function() {
  if (document.getElementById("vidModal")) {
    document.getElementById("vidModal").style.display = "flex";
    return;
  }
  window._vidActiveTab = "url";

  const modal = document.createElement("div");
  modal.id = "vidModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:20px;width:min(580px,96vw);box-shadow:0 20px 60px rgba(15,23,42,0.2);overflow:hidden;font-family:'Inter',system-ui,sans-serif;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#7f1d1d,#dc2626);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;";
  hdr.innerHTML = "<div><div style='font-size:15px;font-weight:800;color:white;'>🎬 Видео қосу</div><div style='font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;'>YouTube &bull; Google Drive &bull; Файл жүктеу</div></div>";
  const cls = document.createElement("button");
  cls.style.cssText = "background:rgba(255,255,255,0.15);color:white;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;";
  cls.textContent = "✕";
  cls.onclick = () => modal.style.display = "none";
  hdr.appendChild(cls);

  // Body
  const body = document.createElement("div");
  body.style.cssText = "padding:16px;";

  // Tab buttons
  const tabRow = document.createElement("div");
  tabRow.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px;";

  const TABS = [["🎬 YouTube/Vimeo","url"],["📁 Файл жүктеу","file"],["☁ Google Drive","drive"]];
  TABS.forEach(([lbl, key], i) => {
    const b = document.createElement("button");
    b.style.cssText = "padding:9px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.12s;border:2px solid " + (i===0?"#fca5a5":"#e2e6f0") + ";background:" + (i===0?"#fef2f2":"#f9fafb") + ";color:" + (i===0?"#dc2626":"#374151") + ";";
    b.textContent = lbl;
    b.onclick = function() {
      tabRow.querySelectorAll("button").forEach(x => { x.style.borderColor="#e2e6f0"; x.style.background="#f9fafb"; x.style.color="#374151"; });
      this.style.borderColor = "#fca5a5"; this.style.background = "#fef2f2"; this.style.color = "#dc2626";
      ["vidPUrl","vidPFile","vidPDrive"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === ("vidP" + key.charAt(0).toUpperCase() + key.slice(1)) ? "block" : "none";
      });
      window._vidActiveTab = key;
    };
    tabRow.appendChild(b);
  });
  body.appendChild(tabRow);

  // URL panel
  const pUrl = document.createElement("div");
  pUrl.id = "vidPUrl";
  pUrl.innerHTML = "<label style='font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;'>YouTube немесе Vimeo сілтемесі:</label><input id='vidUrlInp' type='url' placeholder='https://youtube.com/watch?v=...' style='width:100%;padding:10px 12px;border:2px solid #e2e6f0;border-radius:10px;font-size:13px;font-family:inherit;box-sizing:border-box;'/>";
  body.appendChild(pUrl);

  // File panel
  const pFile = document.createElement("div");
  pFile.id = "vidPFile";
  pFile.style.display = "none";
  pFile.innerHTML = "<label style='font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:8px;'>Компьютерден видео таңдаңыз:</label><label style='display:flex;flex-direction:column;align-items:center;border:2px dashed #fca5a5;border-radius:12px;padding:22px;cursor:pointer;background:#fef9f9;'><span style='font-size:28px;margin-bottom:6px;'>🎬</span><span style='font-size:13px;font-weight:700;color:#dc2626;'>Файлды таңдаңыз</span><span style='font-size:11px;color:#94a3b8;margin-top:3px;'>MP4, WebM, MOV (макс 200MB)</span><input type='file' accept='video/*' id='vidFileInp' style='display:none;' onchange='vidFileSelected(this)'/></label><div id='vidFileInfo' style='font-size:12px;color:#16a34a;margin-top:8px;min-height:18px;'></div>";
  body.appendChild(pFile);

  // Drive panel
  const pDrive = document.createElement("div");
  pDrive.id = "vidPDrive";
  pDrive.style.display = "none";
  pDrive.innerHTML = "<label style='font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;'>Google Drive сілтемесі:</label><input id='vidDriveInp' type='url' placeholder='https://drive.google.com/file/d/...' style='width:100%;padding:10px 12px;border:2px solid #e2e6f0;border-radius:10px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:8px;'/><div style='background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;font-size:11px;color:#92400e;line-height:1.6;'><b>Нұсқау:</b> Drive-та файлды ашыңыз → Бөлісу → Сілтемесі бар барлығы → OK → Сілтемені кіргізіңіз</div>";
  body.appendChild(pDrive);

  // Add btn
  const addBtn = document.createElement("button");
  addBtn.style.cssText = "width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(220,38,38,0.3);margin-top:14px;";
  addBtn.textContent = "🎬 Тақтаға қосу";
  addBtn.onclick = vidAddToBoard;
  body.appendChild(addBtn);

  wrap.appendChild(hdr); wrap.appendChild(body); modal.appendChild(wrap);
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.body.appendChild(modal);
};

window.vidFileSelected = function(input) {
  const file = input.files[0];
  if (!file) return;
  window._vidFile = file;
  const info = document.getElementById("vidFileInfo");
  if (info) info.textContent = "✅ " + file.name + " —  " + (file.size/1048576).toFixed(1) + " MB";
};

window.vidAddToBoard = function() {
  const tab = window._vidActiveTab || "url";
  let html = "";

  if (tab === "url") {
    const url = (document.getElementById("vidUrlInp")?.value || "").trim();
    if (!url) { showToast("⚠️ Сілтеме енгізіңіз!", "warn"); return; }
    const yt = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) {
      html = `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;"><iframe src="https://www.youtube.com/embed/${yt[1]}?rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe></div>`;
    } else {
      const vm = url.match(/vimeo\.com\/([0-9]+)/);
      if (vm) html = `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;"><iframe src="https://player.vimeo.com/video/${vm[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe></div>`;
      else html = `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;"><iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe></div>`;
    }
  } else if (tab === "file") {
    if (!window._vidFile) { showToast("⚠️ Файл таңдаңыз!", "warn"); return; }
    const objUrl = URL.createObjectURL(window._vidFile);
    html = `<video controls style="width:100%;border-radius:12px;background:#000;" src="${objUrl}">Браузер видеоны қолдамайды</video>`;
  } else if (tab === "drive") {
    const url = (document.getElementById("vidDriveInp")?.value || "").trim();
    if (!url) { showToast("⚠️ Google Drive сілтемесін енгізіңіз!", "warn"); return; }
    const fid = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/id=([^&]+)/)?.[1];
    if (!fid) { showToast("⚠️ Дұрыс Google Drive сілтемесі емес!", "warn"); return; }
    html = `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;"><iframe src="https://drive.google.com/file/d/${fid}/preview" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe></div>`;
  }

  if (!html) return;
  addBlock("video", html);
  document.getElementById("vidModal").style.display = "none";
  window._vidFile = null;
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

// Бұрынғы "URL сұрайтын" addTrainer орнына → панельді ашу/жабу
window.addTrainer = () => {
  toggleTrainerPanel();
};
window.addGeoGebra = () => {
    const title =
      currentLang === "ru" ? "Введите GeoGebra ссылку" :
      currentLang === "en" ? "Enter GeoGebra URL" :
      "GeoGebra сілтемесін енгізіңіз";

    openModal(title, "https://www.geogebra.org/m/abcd1234", (url) => {
        if (url) addBlock("geogebra", url);
    });
};

// =====================================================
// TRAINER PANEL (оң жақта, студент жауаптарының үстінде)
// =====================================================
function buildTrainerPanelDom() {
  const rightPanel = document.querySelector(".right-panel");
  if (!rightPanel) return;

  // Егер бұрын жасалған болса -- қайталап жасамау
  if ($("trainerPanel")) return;

  const t = T[currentLang] || T.kk;

  const panel = document.createElement("div");
  panel.id = "trainerPanel";
  panel.style.display = "none"; // әдепкіде жабық
  panel.innerHTML = `
    <div class="right-box" style="margin-bottom: 12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span id="trainerPanelTitle">${t.trainersTitle}</span>
        <button id="trainerCloseBtn" style="border:none; background:#fee2e2; border-radius:6px; padding:2px 8px; cursor:pointer;">✕</button>
      </div>
      <div style="display:flex; gap:6px; margin-bottom:8px;">
        <button id="trainerTabGenerators" class="trainer-tab-btn active">${t.catGenerators}</button>
        <button id="trainerTabMath" class="trainer-tab-btn">${t.catMath}</button>
        <button id="trainerTabReflection" class="trainer-tab-btn">${t.catReflection}</button>
      </div>
      <div id="trainerList" class="trainer-list"></div>
    </div>
  `;

  // панельді студент жауаптарының алдына қойамыз
  const firstChild = rightPanel.firstElementChild;
  if (firstChild) {
    rightPanel.insertBefore(panel, firstChild);
  } else {
    rightPanel.appendChild(panel);
  }

  // Табы бойынша ауыстыру
  const tabGen = $("trainerTabGenerators");
  const tabMath = $("trainerTabMath");
  const tabRefl = $("trainerTabReflection");

  const allTabs = [tabGen, tabMath, tabRefl];

  function activateTab(tabEl, cat) {
    allTabs.forEach((btn) => {
      if (!btn) return;
      btn.classList.remove("active");
      btn.style.background = "#e5e7eb";
    });
    if (tabEl) {
      tabEl.classList.add("active");
      tabEl.style.background = "#c7d2fe";
    }
    renderTrainerList(cat);
  }

  if (tabGen)
    tabGen.onclick = () => {
      activateTab(tabGen, "generators");
    };
  if (tabMath)
    tabMath.onclick = () => {
      activateTab(tabMath, "math");
    };
  if (tabRefl)
    tabRefl.onclick = () => {
      activateTab(tabRefl, "reflection");
    };

  // Әдепкіде generators
  activateTab(tabGen, "generators");

  const closeBtn = $("trainerCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = () => toggleTrainerPanel(false);
  }
}

function renderTrainerList(category) {
  const listEl = $("trainerList");
  if (!listEl) return;

  const items = TRAINERS[category] || [];
  listEl.innerHTML = "";

  items.forEach((id) => {
    const btn = document.createElement("button");
    btn.className = "trainer-item-btn";
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.padding = "6px 8px";
    btn.style.marginBottom = "4px";
    btn.style.borderRadius = "6px";
    btn.style.border = "none";
    btn.style.background = "#f3f4f6";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "13px";

    const label = id.replace(/_/g, " ");
    btn.textContent = label;

    btn.onclick = () => {
      const base = window.location.pathname.replace(/\/[^\/]*$/, '');
      const url = `${base}/trainers/${category}/${id}/index.html`;
      addBlock("trainer", url);
    };

    listEl.appendChild(btn);
  });

  if (!items.length) {
    listEl.textContent = "Папкада тренажер жоқ.";
  }
}

function toggleTrainerPanel(forceValue) {
  const panel = $("trainerPanel");
  if (!panel) return;

  let show;
  if (typeof forceValue === "boolean") {
    show = forceValue;
  } else {
    show = panel.style.display === "none" || panel.style.display === "";
  }

  panel.style.display = show ? "block" : "none";
}

// =====================================================
// AI MODULE -- Панель + тақтаға блок
// =====================================================
// =====================================================
// AI CENTER -- generateAI v2.0
// 8 педагогикалық режим
// =====================================================

// Vercel API endpoint
const AI_API = "/api/ai";

// AI-ға сұраныс жіберу (жалпы helper)
async function callAI({ action, prompt, image = null, grade = "", subject = "" }) {
  const res = await fetch(AI_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, prompt, lang: currentLang, image, grade, subject })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.answer;
}

// AI нәтижесін HTML-ға айналдыру
function formatAIResult(text, action) {
  const icons = {
    lesson_plan:     "📋",
    tasks:           "✏️",
    quiz:            "🎯",
    split:           "📦",
    explain:         "💡",
    differentiation: "🎨",
    feedback:        "💬",
    photo_analyze:   "🔬",
    pisa:            "🧪",
    chat:            "🤖",
  };
  const icon = icons[action] || "🤖";

  // Markdown-ды HTML-ға айналдыру
  let html = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4 style='color:#4f46e5;margin:10px 0 5px;font-size:14px;'>$1</h4>")
    .replace(/^## (.+)$/gm,  "<h3 style='color:#3730a3;margin:12px 0 6px;font-size:15px;'>$1</h3>")
    .replace(/^# (.+)$/gm,   "<h2 style='color:#1e1b4b;margin:14px 0 7px;font-size:16px;'>$1</h2>")
    .replace(/^- (.+)$/gm,   "<li style='margin-left:16px;margin-bottom:3px;'>$1</li>")
    .replace(/^✅ (.+)$/gm,  "<div style='color:#059669;font-weight:600;margin:4px 0;'>✅ $1</div>")
    .replace(/^❌ (.+)$/gm,  "<div style='color:#dc2626;font-weight:600;margin:4px 0;'>❌ $1</div>")
    .replace(/^💡 (.+)$/gm,  "<div style='color:#d97706;font-weight:600;margin:4px 0;'>💡 $1</div>")
    .replace(/^📝 (.+)$/gm,  "<div style='color:#4f46e5;font-weight:600;margin:4px 0;'>📝 $1</div>")
    .replace(/^🟢 (.+)$/gm,  "<div style='color:#059669;font-weight:700;margin:6px 0;'>🟢 $1</div>")
    .replace(/^🟡 (.+)$/gm,  "<div style='color:#d97706;font-weight:700;margin:6px 0;'>🟡 $1</div>")
    .replace(/^🔴 (.+)$/gm,  "<div style='color:#dc2626;font-weight:700;margin:6px 0;'>🔴 $1</div>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");

  return `<div style="
    font-size:14px;line-height:1.7;color:#334155;
    border-left:3px solid #4f46e5;
    padding:12px 14px;
    background:linear-gradient(135deg,#f8f9ff,#fafbff);
    border-radius:0 12px 12px 0;
  ">
    <div style="font-size:11px;font-weight:700;color:#6366f1;
      text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">
      ${icon} AI нәтижесі
    </div>
    ${html}
  </div>`;
}

window.generateAI = async function () {
  const prompt     = document.getElementById("aiPrompt")?.value?.trim() || "";
  const action     = document.getElementById("aiActionSelect")?.value || "chat";
  const imageInput = document.getElementById("aiImageInput");
  const file       = imageInput?.files?.[0] || null;
  const outputEl   = document.getElementById("aiOutput");
  const btn        = document.querySelector(".ai-btn");

  if (!prompt && !file) {
    if (outputEl) outputEl.innerHTML = "<span style='color:#ef4444;font-size:12px;'>⚠️ Мәтін жазыңыз немесе фото жүктеңіз</span>";
    return;
  }

  // Loading state
  if (btn) { btn.textContent = "⏳ Генерация..."; btn.disabled = true; }
  if (outputEl) outputEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:#6366f1;font-size:12px;">
      <span style="animation:spin 1s linear infinite;display:inline-block;">⚙️</span>
      AI жұмыс жасап жатыр...
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;

  // Placeholder блок тақтаға
  addBlock("ai", "🧠 AI жауап дайындалуда...");
  renderBoard();

  let imageBase64 = null;
  try {
    // Фото → base64
    if (file) {
      imageBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Фотоны тақтаға шығару
      addBlock("image", imageBase64);
    }

    // AI сұранысы
    const answer = await callAI({
      action,
      prompt,
      image: imageBase64,
    });

    // Тақтадағы соңғы AI блокты жаңарту
    const blocks = getCurrentBlocks();
    const lastAI = [...blocks].reverse().find(b => b.type === "ai");
    if (lastAI) lastAI.content = formatAIResult(answer, action);

    // Sidebar output
    if (outputEl) outputEl.innerHTML = formatAIResult(answer, action);

    if (window.MathJax) MathJax.typesetPromise();

  } catch (e) {
    const errMsg = "❌ " + (e.message || "AI сервер қатесі");
    const blocks = getCurrentBlocks();
    const lastAI = [...blocks].reverse().find(b => b.type === "ai");
    if (lastAI) lastAI.content = errMsg;
    if (outputEl) outputEl.innerHTML = `<span style='color:#ef4444;font-size:12px;'>${errMsg}</span>`;
  }

  renderBoard();

  // Тазалау
  const promptEl = document.getElementById("aiPrompt");
  if (promptEl) promptEl.value = "";
  if (imageInput) imageInput.value = "";
  if (btn) { btn.textContent = "⚡ Генерация"; btn.disabled = false; }
};
// =====================================================
// 🔬 Фото талдау (AI photo analyze) v2.0
// =====================================================
window.analyzePhoto = async function () {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    // Фото → base64
    const imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    // Фото + placeholder тақтаға
    addBlock("image", imageBase64);
    addBlock("ai", "🔬 Фото талданып жатыр...");
    renderBoard();

    try {
      const promptEl = document.getElementById("aiPrompt");
      const ctx = promptEl?.value?.trim() || "";

      const answer = await callAI({
        action: "photo_analyze",
        prompt: ctx || "Оқушының жазбасын тексер",
        image:  imageBase64,
      });

      const blocks = getCurrentBlocks();
      const lastAI = [...blocks].reverse().find(b => b.type === "ai");
      if (lastAI) lastAI.content = formatAIResult(answer, "photo_analyze");

    } catch (e) {
      const blocks = getCurrentBlocks();
      const lastAI = [...blocks].reverse().find(b => b.type === "ai");
      if (lastAI) lastAI.content = "❌ AI фото талдау қатесі: " + e.message;
    }

    renderBoard();
  };

  input.click();
};

// =====================================================
// LIVEROOM + QR + Firebase streams
// =====================================================
let currentRoom = null;
let lastStudentPhotoKey = null;

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
localStorage.setItem("sb_roomId", currentRoom);

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

  // Алдыңғы QR-ді тазалау
  qrDiv.innerHTML = "";

  const url = `${location.origin}/student.html?room=${currentRoom}`;

  // URL hint
  const hint = $("roomHint");
  if (hint) {
    hint.innerHTML = `Оқушылар <b>QR арқылы</b> қосылады &mdash; <a href="${url}" target="_blank"
      style="color:#818cf8;font-size:10px;word-break:break-all;">${url}</a>`;
  }

  const doQR = () => {
    if (typeof QRCode !== "undefined") {
      try {
        new QRCode(qrDiv, { text: url, width: 160, height: 160 });

        // QRCode.js canvas + img екеуін жасайды — canvas-ты жасырамыз, тек img қалады
        setTimeout(() => {
          const img = qrDiv.querySelector("img");
          const cvs = qrDiv.querySelector("canvas");

          // Canvas-ты жасыру (img жеткілікті)
          if (cvs) cvs.style.display = "none";

          // Img стилі
          if (img) {
            img.style.cssText = "width:160px;height:160px;border-radius:8px;display:block;margin:0 auto;";
          }
        }, 200);
        return;
      } catch (e) { /* fallback */ }
    }
    // Fallback: Google QR API (QRCode.js жоқ болса)
    qrDiv.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}"
      width="160" height="160" style="border-radius:8px;display:block;margin:0 auto;" alt="QR"/>`;
  };

  if (typeof QRCode !== "undefined") {
    doQR();
  } else {
    let tries = 0;
    const wait = setInterval(() => {
      tries++;
      if (typeof QRCode !== "undefined" || tries > 20) {
        clearInterval(wait);
        doQR();
      }
    }, 150);
  }
}

function listenStudentStreams() {
  if (!currentRoom) return;
// STUDENTS LISTENER
const studentsRef = ref(db, `rooms/${currentRoom}/students`);
onValue(studentsRef, (snap) => {
  const data = snap.val();
  const box = document.getElementById("studentsList");

  if (!data) {
    if (box) box.innerHTML = "Оқушылар жоқ";
    return;
  }

  const list = Object.values(data);

  if (box) {
    box.innerHTML = list
      .map((s) => `<div>🟢 ${s.name}</div>`)
      .join("");
  }
});

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
      const sid = a.studentId || "";

      return `
        <div class="answer-item">
          <b>${avatar} ${name}</b><br>
          ${text}

          <div style="margin-top:6px; display:flex; gap:6px;">
            <button type="button" data-answer-name="${name}" data-answer-studentid="${sid}" data-answer-reaction="✅">✅</button>
            <button type="button" data-answer-name="${name}" data-answer-studentid="${sid}" data-answer-reaction="⭐">⭐</button>
          </div>

          <div style="margin-top:6px; display:flex; gap:6px;">
            <input type="text" class="fb-text-input" data-fb-studentid="${sid}" data-fb-name="${name}"
              placeholder="Жауапқа пікір жазу..." style="flex:1;min-width:0;font-size:12px;padding:6px 8px;border:1px solid #e2e6f0;border-radius:8px;">
            <button type="button" class="fb-text-send" data-fb-studentid="${sid}" data-fb-name="${name}"
              style="font-size:12px;padding:6px 10px;border-radius:8px;background:#4f46e5;color:white;border:none;cursor:pointer;">Жіберу</button>
          </div>
        </div>
      `;
    })
    .join("");

  box.querySelectorAll("[data-answer-reaction]").forEach((btn) => {
    btn.onclick = () => {
      const name = btn.dataset.answerName || "Оқушы";
      const sid  = btn.dataset.answerStudentid || "";
      const reaction = btn.dataset.answerReaction || "✅";
      sendAnswerReaction(sid, name, reaction);
    };
  });

  box.querySelectorAll(".fb-text-send").forEach((btn) => {
    btn.onclick = () => {
      const sid   = btn.dataset.fbStudentid || "";
      const name  = btn.dataset.fbName || "Оқушы";
      const input = box.querySelector(`.fb-text-input[data-fb-studentid="${sid}"]`);
      const text  = (input?.value || "").trim();
      if (!text) { showToast("Алдымен пікір жазыңыз", "info"); return; }
      sendTextFeedback(sid, name, text);
      if (input) input.value = "";
    };
  });
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
    // STUDENT PHOTOS
const photosRef = ref(db, `rooms/${currentRoom}/studentPhotos`);
onValue(photosRef, (snap) => {

  const box = $("studentPhotos");
  const data = snap.val();

  if (!data) {
    if (box) box.innerHTML = "Әзірше фото жоқ...";
    return;
  }

  if (box) {
    const entries = Object.entries(data)
      .sort((a, b) => (a[1].time || 0) - (b[1].time || 0))
      .reverse();

    box.innerHTML = entries
      .map(([photoKey, p]) => {
        const name = p.name || "Оқушы";
        const avatar = p.avatar || "🙂";
        const url = p.url || "";
        const sid = p.studentId || "";

        return `
          <div style="
            background:#fff;
            border-radius:10px;
            padding:8px;
            margin-bottom:8px;
            border:1px solid #e5e7eb;
          ">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>${avatar} ${name}</span>

              <div style="display:flex; gap:6px;">
                <button type="button" data-open="${url}">👁</button>
                <button type="button" data-download="${url}">⬇</button>
                <button type="button" data-react="⭐" data-key="${photoKey}" data-name="${name}" data-studentid="${sid}">⭐</button>
              </div>
            </div>
            <div style="margin-top:6px; display:flex; gap:6px;">
              <input type="text" class="photo-fb-input" data-fb-studentid="${sid}"
                placeholder="Фотоға пікір жазу..." style="flex:1;min-width:0;font-size:12px;padding:6px 8px;border:1px solid #e2e6f0;border-radius:8px;">
              <button type="button" class="photo-fb-send" data-fb-studentid="${sid}" data-fb-name="${name}"
                style="font-size:12px;padding:6px 10px;border-radius:8px;background:#4f46e5;color:white;border:none;cursor:pointer;">Жіберу</button>
            </div>
          </div>
        `;
      })
      .join("");

  box.querySelectorAll("[data-open]").forEach((btn) => {
  btn.onclick = () => {
    openPhotoModal(btn.dataset.open, "Фото");
  };
});

box.querySelectorAll("[data-download]").forEach((btn) => {
  btn.onclick = () => {
    const url = btn.dataset.download || "";
    if (!url) return;
    window.open(url, "_blank");
  };
});

   box.querySelectorAll("[data-react]").forEach((btn) => {
  btn.onclick = () => {
    window.sendFeedback(btn.dataset.studentid, btn.dataset.name, "⭐");
  };
});

  box.querySelectorAll(".photo-fb-send").forEach((btn) => {
    btn.onclick = () => {
      const sid   = btn.dataset.fbStudentid || "";
      const name  = btn.dataset.fbName || "Оқушы";
      const input = box.querySelector(`.photo-fb-input[data-fb-studentid="${sid}"]`);
      const text  = (input?.value || "").trim();
      if (!text) { showToast("Алдымен пікір жазыңыз", "info"); return; }
      window.sendTextFeedback(sid, name, text);
      if (input) input.value = "";
    };
  });
  }
});
  }
// =========================
// FULLSCREEN BLOCK
// =========================

function openFullscreenBlock(id) {
  const card = document.getElementById("blk_" + id);
  if (!card) return;

  // Тренажер iframe бар болса -- оны fullscreen ашамыз
  const iframe = card.querySelector(".trainer-frame, .geogebra-frame, .board-video");
  const target = iframe || card;

  // Background ақ болу үшін
  target.style.background = "#fff";

  if (target.requestFullscreen) target.requestFullscreen();
  else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
  else if (target.msRequestFullscreen) target.msRequestFullscreen();
}

function sendAnswerReaction(studentId, name, reaction) {
  if (!currentRoom) return;
  if (!studentId) {
    showToast("Бұл жауапта оқушы ID жоқ — реакция жіберілмеді", "info");
    return;
  }

  const fbRef = ref(db, `rooms/${currentRoom}/studentFeedback/${studentId}`);

  set(fbRef, {
    reaction,
    time: Date.now()
  }).then(() => {
    showToast(`${name} үшін реакция жіберілді: ${reaction}`, "info");
  }).catch((err) => {
    console.error("Реакция қатесі:", err);
    showToast("Реакция жіберілмеді", "info");
  });
}

window.sendAnswerReaction = sendAnswerReaction;

// ── Жауапқа/жұмысқа мәтінмен пікір жіберу (ЖАҢА) ─────
function sendTextFeedback(studentId, name, text) {
  if (!currentRoom) return;
  if (!studentId) {
    showToast("Бұл жауапта оқушы ID жоқ — пікір жіберілмеді", "info");
    return;
  }

  const fbRef = ref(db, `rooms/${currentRoom}/studentFeedback/${studentId}`);

  set(fbRef, {
    reaction: "💬",
    text,
    time: Date.now()
  }).then(() => {
    showToast(`${name} үшін пікір жіберілді`, "info");
  }).catch((err) => {
    console.error("Пікір жіберу қатесі:", err);
    showToast("Пікір жіберілмеді", "info");
  });
}

window.sendTextFeedback = sendTextFeedback;
    
  
// =========================
// LINK OVERLAY (opens any URL over the board)
// =========================
let sbOverlayEl = null;

function sbEnsureOverlay() {
  if (sbOverlayEl) return sbOverlayEl;

  const wrap = document.createElement("div");
  wrap.id = "sbOverlay";
  wrap.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    display: none; align-items: center; justify-content: center;
    background: rgba(0,0,0,.55); padding: 14px;
  `;

  wrap.innerHTML = `
    <div style="
      width: min(1200px, 96vw);
      height: min(760px, 92vh);
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
      display:flex; flex-direction:column;
    ">
      <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding: 10px 12px; background:#0f172a; color:#fff; gap:10px;
      ">
        <div id="sbOverlayTitle" style="font-weight:700; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          Link
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <a id="sbOverlayOpenTab" href="#" target="_blank" rel="noopener"
             style="color:#fff; text-decoration:underline; font-size:13px;">
             ↗ Открыть в новой вкладке
          </a>
          <button id="sbOverlayClose" style="
            border:none; background:#ef4444; color:#fff; border-radius:10px;
            padding:8px 10px; font-weight:700; cursor:pointer;
          ">✕</button>
        </div>
      </div>

      <div style="flex:1; background:#111827;">
        <iframe id="sbOverlayFrame"
          src="about:blank"
          style="width:100%; height:100%; border:0; background:#fff;"
          allow="fullscreen; microphone; camera; clipboard-read; clipboard-write"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;

  // close on dark background click
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) sbCloseOverlay();
  });

  // close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") sbCloseOverlay();
  });

  document.body.appendChild(wrap);

  wrap.querySelector("#sbOverlayClose").onclick = sbCloseOverlay;

  sbOverlayEl = wrap;
  return sbOverlayEl;
}

function sbOpenOverlay(url, titleText = "Link") {
  const wrap = sbEnsureOverlay();
  const frame = wrap.querySelector("#sbOverlayFrame");
  const title = wrap.querySelector("#sbOverlayTitle");
  const openTab = wrap.querySelector("#sbOverlayOpenTab");

  if (title) title.textContent = titleText;
  if (openTab) openTab.href = url || "#";
  if (frame) frame.src = url || "about:blank";

  wrap.style.display = "flex";
}

function sbCloseOverlay() {
  if (!sbOverlayEl) return;
  const frame = sbOverlayEl.querySelector("#sbOverlayFrame");
  if (frame) frame.src = "about:blank";
  sbOverlayEl.style.display = "none";
}

document.addEventListener("fullscreenchange", () => {
    // Қаласақ, fullscreen-нен шыққанда стилдерді түзетуге болады
});

let photoModalEl = null;

function ensurePhotoModal() {
  if (photoModalEl) return photoModalEl;

  const wrap = document.createElement("div");
  wrap.id = "photoPreviewModal";
  wrap.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,.75);
    padding: 20px;
  `;

  wrap.innerHTML = `
    <div style="
      position: relative;
      max-width: 92vw;
      max-height: 92vh;
      background: white;
      border-radius: 16px;
      padding: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
    ">
      <button id="photoModalClose" style="
        position:absolute;
        top:10px;
        right:10px;
        border:none;
        background:#ef4444;
        color:white;
        border-radius:10px;
        padding:8px 10px;
        cursor:pointer;
        font-weight:700;
      ">✕</button>

      <img id="photoModalImg" src="" style="
        display:block;
        max-width: 88vw;
        max-height: 82vh;
        border-radius: 12px;
      ">
    </div>
  `;

  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) closePhotoModal();
  });

  document.body.appendChild(wrap);

  wrap.querySelector("#photoModalClose").onclick = closePhotoModal;

  photoModalEl = wrap;
  return photoModalEl;
}

function openPhotoModal(url) {
  const wrap = ensurePhotoModal();
  const img = wrap.querySelector("#photoModalImg");
  if (!img) return;

  img.src = url || "";
  wrap.style.display = "flex";
}

function closePhotoModal() {
  if (!photoModalEl) return;
  const img = photoModalEl.querySelector("#photoModalImg");
  if (img) img.src = "";
  photoModalEl.style.display = "none";
}

// =====================================================
// INIT
// =====================================================
safeReady(() => {
  setupLanguage();
  setupModalEvents();
  renderPages();
  renderBoard();

  // AI Usage Counter жасырылды (план жоқ — барлығы ашық)

  const savedRoom = localStorage.getItem("sb_roomId");
if (savedRoom) {
  currentRoom = savedRoom;

  const roomIdEl = $("roomId");
  if (roomIdEl) roomIdEl.textContent = currentRoom;
  generateQR();
  listenStudentStreams();
}

  const addPageBtn = $("addPageBtn");
  if (addPageBtn) addPageBtn.onclick = addPage;

  // Тренажер панелі DOM-ды құру
  buildTrainerPanelDom();
// =====================================================
// FULLSCREEN MODE
// =====================================================

window.toggleFullscreen = () => {
  const board = document.documentElement; // бүкіл экран

  if (!document.fullscreenElement) {
    // FULL ENTER
    if (board.requestFullscreen) board.requestFullscreen();
    else if (board.webkitRequestFullscreen) board.webkitRequestFullscreen();
    else if (board.msRequestFullscreen) board.msRequestFullscreen();
  } else {
    // FULL EXIT
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
};

  // ================================
  // 🔐 AUTH CHECK — access-control.js арқылы
  // ================================
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    const access = await checkAccess(user);

    if (!access.allowed) {
      auth.signOut();
      location.href = "login.html?err=access";
      return;
    }

    // ── Бір реттік қолжетімділік (тек unlimited емес адамдарға) ──
    if (!access.unlimited) {
      const usedRef = ref(db, `users/${user.uid}/accessUsed`);
      try {
        const snap = await get(usedRef);
        if (snap.val() === true) {
          auth.signOut();
          location.href = "login.html?err=used";
          return;
        }
      } catch (e) { /* желі қатесі — жалғастырамыз, кейін қайта тексеріледі */ }

      // Қосылым үзілгенде (терезе/бет жабылғанда) автоматты түрде "пайдаланылды" деп белгілейміз
      try {
        usedRef.onDisconnect().set(true);
      } catch (e) { console.warn("onDisconnect орнатылмады:", e); }

      window._accessLockRef = usedRef;
    }

    // Рұқсат берілген барлығы — барлық мүмкіндік ашық (PRO жоқ)
    currentUID  = user.uid;
    currentPlan = "pro";
    localStorage.setItem("sb_uid",   user.uid);
    localStorage.setItem("sb_email", user.email || "");
    localStorage.setItem("sb_plan",  "pro");

    setupLogout();
  });
});

// =====================
// TEXT EDITOR TOOLBAR (FIXED)
// =====================

// RichText терезесін ашу (Жаңа блок)
window.addRichText = function () {
  const toolbar = $("textToolbar");
  const editor = $("textEditor");
  const content = $("textEditorContent");

  if (!toolbar || !editor || !content) {
    // fallback → жай мәтін
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
    return;
  }

  editingBlockId = null; // жаңа блок

  toolbar.style.display = "flex";
  editor.style.display = "flex";   // flex-direction:column үшін flex болу керек
  content.innerHTML = "";
  setTimeout(() => content.focus(), 100);
};

// ── Rich Text Editor функциялары ────────────────────

// Команда орындау
window.rtCmd = function(cmd, value) {
  document.getElementById("textEditorContent")?.focus();
  document.execCommand(cmd, false, value || null);
};

// Backward compat
window.execTextCmd = window.rtCmd;

// Шрифт өлшемі —  px арқылы (execCommand fontSize 1-7 ғана, span арқылы)
window.rtSetSize = function(px) {
  const editor = document.getElementById("textEditorContent");
  if (!editor) return;
  editor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    // Таңдалмаса —  жаңа span жасап курсорға қою
    const span = document.createElement("span");
    span.style.fontSize = px + "px";
    span.textContent = "​"; // zero-width space
    range.insertNode(span);
    range.setStartAfter(span);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    // Таңдалған мәтінге span орау
    const span = document.createElement("span");
    span.style.fontSize = px + "px";
    range.surroundContents(span);
  }
};

// Сілтеме кірістіру
window.rtInsertLink = function() {
  const url = window.prompt("Сілтеме URL:");
  if (!url) return;
  const text = window.prompt("Сілтеме мәтіні (бос қалдырса URL шығады):", url);
  document.getElementById("textEditorContent")?.focus();
  document.execCommand("insertHTML", false,
    `<a href="${url}" target="_blank" style="color:#4f46e5;text-decoration:underline;">${text || url}</a>`
  );
};

// Кескін кірістіру
window.rtInsertImage = function() {
  const url = window.prompt("Кескін URL немесе сілтеме:");
  if (!url) return;
  document.getElementById("textEditorContent")?.focus();
  document.execCommand("insertHTML", false,
    `<img src="${url}" style="max-width:100%;border-radius:8px;margin:4px 0;" alt="кескін"/>`
  );
};

// Сөз/таңба санаушы
window.rtUpdateCount = function() {
  const el   = document.getElementById("textEditorContent");
  const wcEl = document.getElementById("rtWordCount");
  const ccEl = document.getElementById("rtCharCount");
  if (!el) return;
  const text   = el.innerText || "";
  const words  = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars  = text.length;
  if (wcEl) wcEl.textContent = words + " сөз";
  if (ccEl) ccEl.textContent = chars + " таңба";
};

// Сақтау (тақтаға қосу)
window.rtSave = function() {
  window.closeTextEditor();
};

// RichText терезесін жабу: Жаңа блок қосу НЕМЕСЕ бар блокты жаңарту
window.closeTextEditor = function () {
  const toolbar = $("textToolbar");
  const editor = $("textEditor");
  const content = $("textEditorContent");
  if (!content) return;

  const html = content.innerHTML.trim();
  if (!html) {
    if (toolbar) toolbar.style.display = "none";
    if (editor) editor.style.display = "none";
    return;
  }

  const blocks = getCurrentBlocks();

  if (editingBlockId) {
    // ✏ Бар блокты жаңарту
    const blk = blocks.find((b) => b.id === editingBlockId);
    if (blk) blk.content = html;
  } else {
    // ➕ Жаңа блок
    blocks.push({
      id: "blk_" + Math.random().toString(36).slice(2, 9),
      type: "rich",
      content: html,
    });
  }

  editingBlockId = null;

  if (toolbar) toolbar.style.display = "none";
  if (editor) editor.style.display = "none";
  content.innerHTML = "";

  renderBoard();
};

// ✏ Бар Rich блокты өңдеу үшін функция
function openRichEditorForBlock(blockId, html) {
  const toolbar = $("textToolbar");
  const editor = $("textEditor");
  const content = $("textEditorContent");
  if (!toolbar || !editor || !content) return;

  editingBlockId = blockId;

  toolbar.style.display = "flex";
  editor.style.display = "block";
  content.innerHTML = html || "";
  content.focus();
}


function sendFeedback(studentId, studentName, reaction) {
  if (!currentRoom) return;
  if (!studentId) {
    showToast("Бұл фотода оқушы ID жоқ — реакция жіберілмеді", "info");
    return;
  }

  const fbRef = ref(db, `rooms/${currentRoom}/studentFeedback/${studentId}`);

  set(fbRef, {
    reaction,
    time: Date.now()
  })
    .then(() => {
      showToast(`${studentName} үшін реакция жіберілді: ${reaction}`, "info");
    })
    .catch((err) => {
      console.error("Фото реакция қатесі:", err);
      showToast("Фотоға реакция жіберілмеді", "info");
    });
}

window.sendFeedback = sendFeedback;

// =====================================================
// 📊 ANALYTICS MODULE -- SmartBoardAI PRO
// =====================================================

// Аналитика деректері (memory)
const analyticsData = {
  students: {},   // {name, avatar, time}
  answers:  {},   // {name, text, time}
  photos:   {},   // {name, url, time}
  emotions: {},   // {emoji: count}
};

// effectiveness.js — бөлек module, teacher.js-тің ішкі
// айнымалысын тікелей көрмейді. Сол үшін window-ға да
// шығарып қоямыз (объект бойымен сілтеме болғандықтан,
// келешектегі өзгерістер автоматты түрде көрінеді).
window.analyticsData = analyticsData;

// ── Analytics listeners ──────────────────────────────
function startAnalytics(roomId) {
  if (!roomId) return;

  // 1. Оқушылар
  onValue(ref(db, `rooms/${roomId}/students`), (snap) => {
    analyticsData.students = snap.val() || {};
    updateAnalyticsUI();
  });

  // 2. Жауаптар
  onValue(ref(db, `rooms/${roomId}/answers`), (snap) => {
    analyticsData.answers = snap.val() || {};
    updateAnalyticsUI();
  });

  // 3. Фотолар
  onValue(ref(db, `rooms/${roomId}/studentPhotos`), (snap) => {
    analyticsData.photos = snap.val() || {};
    updateAnalyticsUI();
  });

  // 4. Эмоциялар
  onValue(ref(db, `rooms/${roomId}/emotions`), (snap) => {
    const raw = snap.val() || {};
    // Emoji санын есептеу
    const counts = {};
    Object.values(raw).forEach(item => {
      if (item.emoji) counts[item.emoji] = (counts[item.emoji] || 0) + 1;
    });
    analyticsData.emotions = counts;
    updateAnalyticsUI();
  });
}

// ── UI жаңарту ───────────────────────────────────────
function updateAnalyticsUI() {
  const students  = Object.values(analyticsData.students);
  const answers   = Object.values(analyticsData.answers);
  const photos    = Object.values(analyticsData.photos);
  const emotions  = analyticsData.emotions;

  const studentCount = students.length;
  const answerCount  = answers.length;
  const photoCount   = photos.length;
  const emoCount     = Object.values(emotions).reduce((s, c) => s + c, 0);

  // Санақтар
  const sc = document.getElementById("anStudentCount");
  const ac = document.getElementById("anAnswerCount");
  const pc = document.getElementById("anPhotoCount");
  const ec = document.getElementById("anEmoCount");
  if (sc) sc.textContent = studentCount;
  if (ac) ac.textContent = answerCount;
  if (pc) pc.textContent = photoCount;
  if (ec) ec.textContent = emoCount;

  // Белсенділік %
  const answeredNames = new Set(answers.map(a => a.name));
  const pct = studentCount > 0
    ? Math.round((answeredNames.size / studentCount) * 100)
    : 0;
  const pctEl  = document.getElementById("anActivityPct");
  const barEl  = document.getElementById("anActivityBar");
  if (pctEl) pctEl.textContent = pct + "%";
  if (barEl) barEl.style.width = pct + "%";

  // Оқушылар тізімі
  const listEl = document.getElementById("anStudentList");
  if (listEl) {
    if (!studentCount) {
      listEl.innerHTML = `<div style="font-size:12px;color:#9ca3af;text-align:center;padding:12px 0;">Оқушылар жоқ</div>`;
    } else {
      listEl.innerHTML = students.map(s => {
        const hasAnswer = answeredNames.has(s.name);
        const hasPhoto  = Object.values(analyticsData.photos).some(p => p.name === s.name);
        return `
          <div style="
            display:flex;align-items:center;gap:8px;
            padding:6px 8px;border-radius:10px;
            background:${hasAnswer ? "#f0fdf4" : "#f9fafb"};
            border:1px solid ${hasAnswer ? "#86efac" : "#e5e7eb"};
            margin-bottom:4px;
          ">
            <span style="font-size:18px;">${s.avatar || "🙂"}</span>
            <span style="flex:1;font-size:12px;font-weight:600;color:#374151;">
              ${s.name || "--"}
            </span>
            <span title="Жауап берді">${hasAnswer ? "✅" : "⬜"}</span>
            <span title="Фото жіберді">${hasPhoto ? "📷" : "⬜"}</span>
          </div>`;
      }).join("");
    }
  }

  // Эмоция статистикасы
  const emoEl = document.getElementById("anEmoStats");
  if (emoEl) {
    const entries = Object.entries(emotions);
    if (!entries.length) {
      emoEl.innerHTML = `<div style="font-size:12px;color:#9ca3af;">Эмоция жоқ</div>`;
    } else {
      // Санға қарай сортировка
      entries.sort((a, b) => b[1] - a[1]);
      emoEl.innerHTML = entries.map(([emoji, count]) => `
        <div style="
          display:flex;align-items:center;gap:4px;
          background:#f3f4f6;border-radius:999px;
          padding:4px 10px;font-size:12px;
        ">
          <span style="font-size:16px;">${emoji}</span>
          <span style="font-weight:700;color:#374151;">${count}</span>
        </div>
      `).join("");
    }
  }
}

// ── CSV Экспорт ──────────────────────────────────────
window.exportAnalytics = function() {
  const students = Object.values(analyticsData.students);
  const answers  = Object.values(analyticsData.answers);
  const photos   = Object.values(analyticsData.photos);

  if (!students.length) {
    showToast("Аналитика деректері жоқ. Алдымен бөлме ашыңыз.", "info");
    return;
  }

  // CSV жолдары
  const rows = [
    ["Оқушы аты", "Аватар", "Қосылды", "Жауап берді", "Жауап мәтіні", "Фото жіберді"],
  ];

  students.forEach(s => {
    const ans   = answers.find(a => a.name === s.name);
    const photo = photos.find(p => p.name === s.name);
    const joinTime = s.time
      ? new Date(s.time).toLocaleTimeString("kk-KZ", {hour:"2-digit",minute:"2-digit"})
      : "--";
    rows.push([
      s.name || "--",
      s.avatar || "🙂",
      joinTime,
      ans ? "Иә" : "Жоқ",
      ans ? (ans.text || "").replace(/,/g, ";") : "--",
      photo ? "Иә" : "Жоқ",
    ]);
  });

  // CSV мазмұны
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const bom  = "\uFEFF"; // UTF-8 BOM (Excel үшін)
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href     = url;
  a.download = `smartboard_analytics_${new Date().toLocaleDateString("kk-KZ").replace(/\./g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── createRoom-ға analytics hook ──────────────────────
// DOMContentLoaded кейін wrap -- сол кезде window.createRoom нақты бар
safeReady(() => {
  const _origCR = window.createRoom;
  if (typeof _origCR === "function") {
    window.createRoom = function() {
      _origCR();
      setTimeout(() => {
        if (currentRoom) startAnalytics(currentRoom);
      }, 600);
    };
  }
  // Бұрынғы room болса
  const savedRoom = localStorage.getItem("sb_roomId");
  if (savedRoom) setTimeout(() => startAnalytics(savedRoom), 1200);
});

// =====================================================
// 🎮 AI INTERACTIVE GENERATOR -- SmartBoardAI PRO
// =====================================================

let generatedHTMLContent = null;
let selectedGenType = "quiz";

// ── Тип таңдау ────────────────────────────────────────
window.selectGenType = function(btn) {
  document.querySelectorAll(".gen-type-btn").forEach(b => {
    b.style.background  = "#f9fafb";
    b.style.borderColor = "#e5e7eb";
    b.style.color       = "#374151";
  });
  btn.style.background  = "#eef2ff";
  btn.style.borderColor = "#c7d2fe";
  btn.style.color       = "#4f46e5";
  selectedGenType = btn.dataset.type;
};

// ── Модалды ашу / жабу ───────────────────────────────
window.openAIGenerator = function() {
  const modal = document.getElementById("aiGeneratorModal");
  if (modal) modal.style.display = "flex";
};

window.closeAIGenerator = function() {
  const modal = document.getElementById("aiGeneratorModal");
  if (modal) modal.style.display = "none";
};

// ── Ойын генерациясы ─────────────────────────────────
window.generateInteractive = async function() {
  const prompt  = document.getElementById("genPrompt")?.value.trim() || "";
  const subject = document.getElementById("genSubject")?.value.trim() || "";
  const grade   = document.getElementById("genGrade")?.value.trim() || "";
  const btn     = document.getElementById("genBtn");
  const status  = document.getElementById("genStatus");
  const addBtn  = document.getElementById("genAddBtn");

  if (!prompt) {
    if (status) {
      status.style.color = "#ef4444";
      status.textContent = "⚠️ Тақырып жазыңыз!";
    }
    return;
  }

  // Ойын типі + prompt
  const typeLabels = {
    quiz:       "4 нұсқалы Quiz тесті",
    matching:   "Сәйкестендіру ойыны (Matching)",
    flashcards: "Flashcard карточкалары",
    truefalse:  "Иә/Жоқ ойыны (True/False)",
    fillblanks: "Бос орын толтыру",
    memory:     "Жады ойыны (Memory)",
  };
  const typeLabel = typeLabels[selectedGenType] || "интерактив ойын";
  const fullPrompt = `${typeLabel} жаса. Тақырып: ${prompt}`;

  // Loading
  if (btn) { btn.textContent = "⏳ Жасалуда..."; btn.disabled = true; }
  if (status) { status.style.color = "#6366f1"; status.textContent = "🤖 AI ойын кодын жазуда..."; }
  if (addBtn) addBtn.style.display = "none";

  // Preview reset
  const iframe   = document.getElementById("genPreviewIframe");
  const empty    = document.getElementById("genEmptyState");
  const label    = document.getElementById("genPreviewLabel");
  if (iframe) iframe.style.display = "none";
  if (empty)  empty.style.display  = "flex";

  try {
    // AI-ға сұраныс
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action:  "generate_interactive",
        prompt:  fullPrompt,
        lang:    currentLang,
        subject: subject,
        grade:   grade,
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    let html = data.answer || "";

    // HTML тазалау (markdown backticks алып тастау)
    html = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // HTML болуы тексеру
    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      throw new Error("AI жарамды HTML қайтармады");
    }

    generatedHTMLContent = html;

    // Preview iframe-ге жүктеу
    if (iframe && empty) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      iframe.src = url;
      iframe.style.display = "block";
      empty.style.display  = "none";
      if (label) label.textContent = `✅ ${typeLabel} дайын!`;
    }

    if (status) { status.style.color = "#16a34a"; status.textContent = "✅ Ойын дайын! Тақтаға қосыңыз."; }
    if (addBtn) addBtn.style.display = "block";

  } catch(e) {
    console.error("Generator error:", e);
    if (status) { status.style.color = "#ef4444"; status.textContent = "❌ " + e.message; }
    if (label)  label.textContent = "Қате орын алды";
  }

  if (btn) { btn.textContent = "✨ Ойын жасау"; btn.disabled = false; }
};

// ── Тақтаға қосу ─────────────────────────────────────
window.addGeneratedToBoard = function() {
  if (!generatedHTMLContent) return;

  // HTML-ды blob URL арқылы iframe-ге салу
  const blob = new Blob([generatedHTMLContent], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);

  // trainer блок ретінде қосу
  addBlock("trainer", url);

  // Модалды жабу
  closeAIGenerator();

  // Status хабарлама
  if (window.showStudentStatus) {
    window.showStudentStatus("✅ AI ойын тақтаға қосылды!", "ok");
  }

  // Сондай-ақ оқушыларға жіберу (LiveRoom арқылы)
  if (currentRoom) {
    const blockRef = ref(db, `rooms/${currentRoom}/activeBlock`);
    set(blockRef, {
      type: "trainer",
      content: url,
      time: Date.now(),
    }).catch(console.error);
  }
};

// Escape пернесі -- модалды жабу
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAIGenerator();
});

// =====================================================
// 🔒 PRO SYSTEM -- SmartBoardAI PRO
// =====================================================
// FREE:  Тренажерлер, LiveRoom, блоктар, 💬 Жалпы AI
// PRO:   AI Center (8 режим), AI Generator, Фото AI,
//        Teacher Cabinet (шексіз), Analytics export

// PRO email тізімі (немесе Firebase-тан алуға болады)
const PRO_EMAILS = [
  "naz-erke_k@mail.ru",
  // Қосымша PRO пайдаланушылар осында
];

// Ағымдағы план
// ── Plan жүйесі ─────────────────────────────────────
// localStorage-тан оқу (login.html орнатады)
let currentPlan = localStorage.getItem("sb_plan") || "free";
let currentUID  = localStorage.getItem("sb_uid")  || null;

// FREE лимит —  жалпы 10 сұраныс (бір рет, мәңгілік)
const FREE_LIMIT = 10;
const LIMIT_KEY  = "sb_aiUsedTotal"; // Күнге байланыссыз, жалпы санауыш

function getAIUsed() {
  return parseInt(localStorage.getItem(LIMIT_KEY) || "0");
}
function incAIUsed() {
  return; // Лимит жоқ
}
function updateAICounter() {
  const el = document.getElementById("aiUsageCounter");
  if (!el) return;
  const used = getAIUsed();

  if (currentPlan === "pro") {
    el.innerHTML = '<span style="color:#10b981;font-weight:700;font-size:12px;">⚡ PRO —  шексіз</span>';
    return;
  }

  const left  = Math.max(0, FREE_LIMIT - used);
  const pct   = Math.min(100, (used / FREE_LIMIT) * 100);
  const color = left === 0 ? "#dc2626" : left <= 3 ? "#f59e0b" : "#10b981";

  el.innerHTML = `
    <span style="font-size:11px;color:rgba(255,255,255,0.7);">Тегін AI:</span>
    <span style="font-size:12px;font-weight:800;color:${left===0?"#fca5a5":left<=3?"#fde68a":"#86efac"};">${left}/${FREE_LIMIT}</span>
    <div style="background:rgba(255,255,255,0.15);border-radius:999px;height:4px;width:50px;overflow:hidden;margin-left:3px;">
      <div style="height:100%;border-radius:999px;background:${left===0?"#ef4444":left<=3?"#f59e0b":"#10b981"};width:${100-pct}%;transition:.4s;"></div>
    </div>
    ${left === 0 ? `<button onclick="openUpgradeModal()" style="font-size:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:999px;padding:2px 8px;cursor:pointer;font-weight:800;margin-left:2px;">PRO ⭐</button>` : ""}
  `;
}
let currentUserEmail = "";

// ── Plan анықтау ──────────────────────────────────────
function detectPlan(user) {
  if (!user) { currentPlan = "free"; return; }
  currentUserEmail = user.email || "";

  // PRO тізімінде бар ма?
  if (PRO_EMAILS.includes(currentUserEmail)) {
    currentPlan = "pro";
  } else {
    // Firebase-тан тексеру (болашақта)
    currentPlan = "free";
  }

  applyPlanUI();
}

// ── PRO функциясын тексеру ────────────────────────────
window.requirePRO = function(featureName) {
  return true; // Барлық UI мүмкіндіктер ашық (лимит API-да тексеріледі)
};

// AI лимит тексеру — лимит жоқ, барлығына рұқсат
function checkAILimit() {
  return true;
}

// Upgrade modal
window.openUpgradeModal = function() {
  if (document.getElementById("upgradeModal")) {
    document.getElementById("upgradeModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "upgradeModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(8px);z-index:600;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:24px;width:min(480px,96vw);overflow:hidden;box-shadow:0 32px 80px rgba(15,23,42,0.4);";

  wrap.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#312e81,#4f46e5,#7c3aed);padding:28px 24px;text-align:center;">
      <div style="font-size:52px;margin-bottom:10px;">🚀</div>
      <div style="font-size:20px;font-weight:800;color:white;margin-bottom:6px;">PRO жоспарына өтіңіз</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);">
        Күніне ${FREE_LIMIT} тегін AI сұраныс біткен
      </div>
    </div>

    <!-- Features -->
    <div style="padding:20px 24px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
        ${[
          ["⚡","Шексіз AI сұраныс"],
          ["🎨","AI Дифференциация"],
          ["📊","Analytics Dashboard"],
          ["🧠","Memory Game + ойындар"],
          ["🏆","AI Сертификат"],
          ["🎤","Voice Control"],
          ["📈","Оқушы прогресі"],
          ["💌","Ата-ана хабарламасы"],
        ].map(([ic,lbl]) => `
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#334155;">
            <span style="font-size:16px;">${ic}</span>${lbl}
          </div>`).join("")}
      </div>

      <!-- Price -->
      <div style="background:linear-gradient(135deg,#f5f3ff,#eef2ff);border:2px solid #c7d2fe;border-radius:16px;padding:16px;text-align:center;margin-bottom:14px;">
        <div style="font-size:32px;font-weight:800;color:#4f46e5;">₸4 900</div>
        <div style="font-size:13px;color:#64748b;">айына • Сарқылатын мерзімсіз</div>
      </div>

      <!-- CTA -->
      <a href="mailto:smartboardai@gmail.com?subject=PRO жоспары&body=Аты: %0AEmail: ${localStorage.getItem('sb_email')||''}" style="
        display:block;width:100%;padding:14px;border-radius:12px;
        background:linear-gradient(135deg,#4f46e5,#7c3aed);
        color:white;font-size:15px;font-weight:800;text-align:center;
        text-decoration:none;box-shadow:0 6px 20px rgba(79,70,229,0.4);
        margin-bottom:8px;box-sizing:border-box;
      ">📧 PRO алу —  Email жіберу</a>

      <a href="https://wa.me/77771234567?text=SmartBoardAI PRO алғым келеді. Email: ${localStorage.getItem('sb_email')||''}" target="_blank" style="
        display:block;width:100%;padding:12px;border-radius:12px;
        background:linear-gradient(135deg,#128c7e,#25d366);
        color:white;font-size:14px;font-weight:700;text-align:center;
        text-decoration:none;margin-bottom:10px;box-sizing:border-box;
      ">💬 WhatsApp арқылы хабарласу</a>

      <button onclick="document.getElementById('upgradeModal').style.display='none'" style="
        width:100%;padding:10px;border:1.5px solid #e2e6f0;border-radius:10px;
        background:#f9fafb;color:#374151;font-size:13px;font-weight:700;cursor:pointer;
        font-family:inherit;
      ">Кейінірек</button>

      <div style="text-align:center;margin-top:10px;font-size:11px;color:#94a3b8;">
        Тегін: ${FREE_LIMIT - getAIUsed()} сұраныс қалды барлығы
      </div>
    </div>
  `;

  modal.appendChild(wrap);
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.body.appendChild(modal);
};

// ── UI-ге план қолдану ────────────────────────────────
function applyPlanUI() {
  // PRO badge topbar-да
  updatePlanBadge();

  if (currentPlan === "pro") {
    // PRO: бәрі ашық -- lock иконкаларды жасыру
    document.querySelectorAll(".pro-lock-overlay").forEach(el => el.style.display = "none");
    document.querySelectorAll(".pro-badge").forEach(el => el.style.display = "inline-flex");
  } else {
    // FREE: кейбір батырмаларды lock
    document.querySelectorAll(".pro-lock-overlay").forEach(el => el.style.display = "flex");
  }
}

// ── Topbar plan badge ─────────────────────────────────
function updatePlanBadge() {
  const existing = document.getElementById("planBadge");
  if (existing) existing.remove();

  const topbarRight = document.querySelector(".topbar-right");
  if (!topbarRight) return;

  const badge = document.createElement("div");
  badge.id = "planBadge";

  if (currentPlan === "pro") {
    badge.innerHTML = `
      <div style="
        background:linear-gradient(135deg,#f59e0b,#fbbf24);
        color:#7c2d12;
        font-size:10px;font-weight:800;
        padding:4px 10px;border-radius:999px;
        letter-spacing:.05em;
        box-shadow:0 2px 8px rgba(245,158,11,0.35);
        display:flex;align-items:center;gap:4px;
      ">⭐ PRO</div>`;
  } else {
    badge.innerHTML = `
      <button onclick="showUpgradeModal('plan')" style="
        background:rgba(255,255,255,0.12);
        color:rgba(255,255,255,0.8);
        border:1.5px solid rgba(255,255,255,0.2);
        font-size:10px;font-weight:700;
        padding:4px 10px;border-radius:999px;
        cursor:pointer;
        display:flex;align-items:center;gap:4px;
        transition:all .18s;
      " onmouseover="this.style.background='rgba(255,255,255,0.22)'"
         onmouseout="this.style.background='rgba(255,255,255,0.12)'">
        🔓 FREE → PRO
      </button>`;
  }

  // Logout алдына қосу
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    topbarRight.insertBefore(badge, logoutBtn);
  } else {
    topbarRight.prepend(badge);
  }
}

// ── Upgrade Modal ─────────────────────────────────────
window.showUpgradeModal = function(feature) {
  let modal = document.getElementById("upgradeModal");
  if (!modal) {
    modal = buildUpgradeModal();
    document.body.appendChild(modal);
  }

  // Feature атауын жаңарту
  const featureNames = {
    "plan":              "PRO мүмкіндіктері",
    "ai_center":         "AI Center (8 режим)",
    "ai_generator":      "AI Ойын Жасаушы",
    "photo_analyze":     "AI Фото Талдау",
    "cabinet_unlimited": "Шексіз Сабақ Кабинеті",
    "analytics_export":  "Analytics Export",
    "pisa":              "PISA/TIMSS Generator",
  };

  const featureLabel = featureNames[feature] || feature;
  const featureEl = document.getElementById("upgradeFeatureName");
  if (featureEl) featureEl.textContent = featureLabel;

  modal.style.display = "flex";
};

window.closeUpgradeModal = function() {
  const modal = document.getElementById("upgradeModal");
  if (modal) modal.style.display = "none";
};

function buildUpgradeModal() {
  const modal = document.createElement("div");
  modal.id = "upgradeModal";
  modal.style.cssText = `
    position:fixed;inset:0;
    background:rgba(15,23,42,0.6);
    backdrop-filter:blur(6px);
    display:none;align-items:center;justify-content:center;
    z-index:500;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:24px;
      width:min(480px,94vw);
      box-shadow:0 24px 64px rgba(15,23,42,0.2);
      overflow:hidden;
    ">

      <!-- Header gradient -->
      <div style="
        background:linear-gradient(135deg,#3730a3,#4f46e5,#7c3aed);
        padding:28px 24px 24px;text-align:center;
        position:relative;
      ">
        <div style="font-size:42px;margin-bottom:10px;">⭐</div>
        <div style="font-size:20px;font-weight:800;color:white;margin-bottom:6px;">
          SmartBoardAI PRO
        </div>
        <div style="font-size:13px;color:rgba(255,255,255,0.75);">
          <span id="upgradeFeatureName">PRO мүмкіндіктері</span> үшін PRO керек
        </div>
      </div>

      <!-- Features list -->
      <div style="padding:22px 24px;">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px;">
          PRO-да не бар:
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
          ${[
            ["🤖", "AI Center -- 8 педагогикалық режим"],
            ["🎮", "AI Ойын Жасаушы (Quiz, Matching, Flashcards...)"],
            ["🔬", "AI Фото Талдау (оқушы жазбасын тексеру)"],
            ["📚", "Шексіз Сабақ Кабинеті"],
            ["📊", "Analytics + CSV Экспорт"],
            ["🧪", "PISA/TIMSS Generator"],
            ["⚡", "Барлық болашақ мүмкіндіктер"],
          ].map(([icon, text]) => `
            <div style="
              display:flex;align-items:center;gap:10px;
              padding:8px 12px;
              background:#f8f9ff;border-radius:10px;
              border:1px solid #e0e7ff;
              font-size:13px;color:#374151;
            ">
              <span style="font-size:18px;">${icon}</span>
              <span>${text}</span>
              <span style="margin-left:auto;color:#16a34a;font-weight:700;">✓</span>
            </div>
          `).join("")}
        </div>

        <!-- FREE vs PRO -->
        <div style="
          background:#fef3c7;border:1px solid #fbbf24;
          border-radius:12px;padding:12px 14px;
          font-size:12px;color:#92400e;
          margin-bottom:18px;
          display:flex;align-items:flex-start;gap:8px;
        ">
          <span style="font-size:16px;">💡</span>
          <div>
            <b>FREE нұсқада</b> барлық тренажерлер, LiveRoom, GeoGebra, 
            блоктар және базалық AI (жалпы сұрақ) ашық.
          </div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:10px;">
          <button onclick="contactForPRO()" style="
            flex:1;padding:13px;border-radius:12px;border:none;
            background:linear-gradient(135deg,#4f46e5,#7c3aed);
            color:white;font-size:14px;font-weight:700;
            cursor:pointer;
            box-shadow:0 4px 14px rgba(79,70,229,0.35);
            transition:all .18s;
          " onmouseover="this.style.transform='translateY(-1px)'"
             onmouseout="this.style.transform='translateY(0)'">
            📩 PRO алу
          </button>
          <button onclick="closeUpgradeModal()" style="
            padding:13px 18px;border-radius:12px;
            border:1.5px solid #e5e7eb;
            background:#f9fafb;color:#374151;
            font-size:14px;font-weight:600;
            cursor:pointer;transition:all .18s;
          ">Болдырмау</button>
        </div>

        <div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:12px;">
          PRO алу үшін авторға хабарласыңыз
        </div>
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeUpgradeModal();
  });

  return modal;
}

// ── PRO алу хабарламасы ───────────────────────────────
window.contactForPRO = function() {
  // WhatsApp немесе email арқылы хабарласу
  const msg = encodeURIComponent("Сәлем! SmartBoardAI PRO алғым келеді.");
  window.open(`https://wa.me/?text=${msg}`, "_blank");
  closeUpgradeModal();
};

// PRO wrappers -- барлығы ашық (lock жоқ)

// generateAI -- барлық режимдер ашық (PRO check жоқ)

// selectAIMode -- PRO белгісі (DOMContentLoaded-та)
safeReady(() => {
  const _origSM = window.selectAIMode;
  if (typeof _origSM !== "function") return;
  window.selectAIMode = function(btn, mode) {
    _origSM(btn, mode);
    const freeActions = ["chat"];
    if (!freeActions.includes(mode) && typeof currentPlan !== "undefined" && currentPlan !== "pro") {
      const desc = document.getElementById("aiModeDesc");
      if (desc && !desc.querySelector(".pro-tag")) {
        const tag = document.createElement("span");
        tag.className = "pro-tag";
        tag.style.cssText = "background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;margin-left:4px;";
        tag.textContent = "⭐ PRO";
        desc.appendChild(tag);
      }
    }
  };
}, { once: true });

// ── Auth-қа план detect hook ──────────────────────────
// DOMContentLoaded кезінде onAuthStateChanged арқылы plan анықтау
safeReady(() => {
  // onAuthStateChanged бар болса -- plan detect
  if (typeof onAuthStateChanged === "function" && typeof auth !== "undefined") {
    onAuthStateChanged(auth, (user) => {
      if (user) detectPlan(user);
    });
  }
});

// =====================================================
// 🌐 HUB RESOURCE LISTENER
// hub.html-ден postMessage арқылы ресурс қабылдау
// =====================================================
window.addEventListener("message", (event) => {
  if (event.data?.type === "ADD_HUB_RESOURCE") {
    const { url, title } = event.data;
    if (!url) return;

    // Trainer блок ретінде тақтаға қосу
    addBlock("trainer", url);

    // Оқушыларға LiveRoom арқылы жіберу
    if (currentRoom) {
      const blockRef = ref(db, `rooms/${currentRoom}/activeBlock`);
      set(blockRef, {
        type:    "trainer",
        content: url,
        title:   title || "3D/AR/VR ресурсы",
        time:    Date.now(),
      }).catch(console.error);
    }

    // Status хабарлама
    if (window.showStudentStatus) {
      window.showStudentStatus(`✅ "${title}" тақтаға қосылды!`, "ok");
    }
  }
});

// LocalStorage арқылы hub ресурс тексеру
safeReady(() => {
  const stored = localStorage.getItem("sb_hubResource");
  if (stored) {
    try {
      const res = JSON.parse(stored);
      // 10 секунд ішінде болса -- қосу
      if (Date.now() - res.time < 10000) {
        setTimeout(() => {
          addBlock("trainer", res.url);
          if (window.showStudentStatus) {
            window.showStudentStatus(`✅ "${res.title}" тақтаға қосылды!`, "ok");
          }
        }, 1500);
      }
      localStorage.removeItem("sb_hubResource");
    } catch(e) { localStorage.removeItem("sb_hubResource"); }
  }
});

// =====================================================
// ✏️ DRAW MODE -- SmartBoardAI PRO (Gynzy стилі)
// =====================================================

let drawMode   = false;
let drawing    = false;
let drawTool   = "pen";      // pen | marker | eraser | line | rect | circle | arrow
let drawColor  = "#1e1b4b";
let strokeW    = 2;
let drawHistory = [];        // Undo стегі
let snapX = 0, snapY = 0;   // Пішін сызу үшін бастапқы нүкте
let ctx, canvas;

// ── Draw Mode ON/OFF ─────────────────────────────────
window.toggleDrawMode = function() {
  drawMode = !drawMode;
  const cvs     = document.getElementById("drawCanvas");
  const toolbar = document.getElementById("drawToolbar");
  const btn     = document.getElementById("drawModeBtn");
  const board   = document.getElementById("board");

  if (!cvs || !toolbar) return;

  if (drawMode) {
    // Canvas-ты board өлшемімен баптау
    const wrap = cvs.parentElement;
    cvs.width  = wrap.clientWidth;
    cvs.height = wrap.clientHeight;
    cvs.style.display = "block";
    toolbar.style.display = "flex";

    ctx = cvs.getContext("2d");
    ctx.lineCap   = "round";
    ctx.lineJoin  = "round";
    initDrawEvents(cvs);

    if (btn) {
      btn.style.background = "rgba(255,255,255,0.3)";
      btn.style.borderColor = "rgba(255,255,255,0.6)";
      btn.textContent = "✏️ Режим қосулы";
    }
    if (board) board.style.pointerEvents = "none";
  } else {
    cvs.style.display  = "none";
    toolbar.style.display = "none";
    if (btn) {
      btn.style.background = "rgba(255,255,255,0.12)";
      btn.style.borderColor = "rgba(255,255,255,0.2)";
      btn.textContent = "✏️ Сурет";
    }
    if (board) board.style.pointerEvents = "";
  }
};

// ── Tool таңдау ──────────────────────────────────────
window.setDrawTool = function(tool) {
  drawTool = tool;
  document.querySelectorAll(".dtool-btn").forEach(b => {
    b.style.borderColor = "#e5e7eb";
    b.style.background  = "#f9fafb";
  });
  const active = document.getElementById("dt-" + tool);
  if (active) {
    active.style.borderColor = "#c7d2fe";
    active.style.background  = "#eef2ff";
  }
  const cvs = document.getElementById("drawCanvas");
  if (cvs) cvs.style.cursor = tool === "eraser" ? "cell" : "crosshair";
};

// ── Stroke width ─────────────────────────────────────
window.setStrokeWidth = function(w) {
  strokeW = w;
  document.querySelectorAll(".sw-btn").forEach(b => {
    b.style.borderColor = b.dataset.w == w ? "#c7d2fe" : "#e5e7eb";
    b.style.background  = b.dataset.w == w ? "#eef2ff" : "#f9fafb";
  });
};

// ── Түс таңдау ───────────────────────────────────────
window.setDrawColor = function(color) {
  drawColor = color;
  document.querySelectorAll(".cp-btn").forEach(b => {
    b.style.borderColor = "transparent";
    b.style.outline = "none";
  });
  document.getElementById("customColor").value = color;
};

// ── Canvas event handlers ────────────────────────────
function initDrawEvents(cvs) {
  // Mouse
  cvs.onmousedown = (e) => startDraw(e.offsetX, e.offsetY);
  cvs.onmousemove = (e) => moveDraw(e.offsetX, e.offsetY);
  cvs.onmouseup   = () => endDraw();
  cvs.onmouseleave = () => endDraw();

  // Touch (мобильді)
  cvs.ontouchstart = (e) => {
    e.preventDefault();
    const r = cvs.getBoundingClientRect();
    const t = e.touches[0];
    startDraw(t.clientX - r.left, t.clientY - r.top);
  };
  cvs.ontouchmove = (e) => {
    e.preventDefault();
    const r = cvs.getBoundingClientRect();
    const t = e.touches[0];
    moveDraw(t.clientX - r.left, t.clientY - r.top);
  };
  cvs.ontouchend = () => endDraw();
}

function startDraw(x, y) {
  if (!ctx || !drawMode) return;
  drawing = true;
  snapX = x; snapY = y;

  if (drawTool === "pen" || drawTool === "marker" || drawTool === "eraser") {
    // Snapshot сақтау (undo үшін)
    drawHistory.push(ctx.getImageData(0, 0, canvas?.width || 1, canvas?.height || 1));
    if (drawHistory.length > 30) drawHistory.shift();

    ctx.beginPath();
    ctx.moveTo(x, y);
    applyDrawStyle();
  } else {
    // Пішін -- snapshot сақтаймыз
    const cvs = document.getElementById("drawCanvas");
    drawHistory.push(ctx.getImageData(0, 0, cvs.width, cvs.height));
    if (drawHistory.length > 30) drawHistory.shift();
  }

  // Canvas ref
  canvas = document.getElementById("drawCanvas");
}

let shapeSnapshot = null;

function moveDraw(x, y) {
  if (!drawing || !ctx || !drawMode) return;

  if (drawTool === "pen") {
    applyDrawStyle();
    ctx.lineTo(x, y);
    ctx.stroke();
  } else if (drawTool === "marker") {
    ctx.globalAlpha = 0.35;
    applyDrawStyle();
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (drawTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = strokeW * 6;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  } else {
    // Пішін -- preview үшін snapshot-тан қалпына келтір
    if (shapeSnapshot) {
      ctx.putImageData(shapeSnapshot, 0, 0);
    } else {
      shapeSnapshot = drawHistory[drawHistory.length - 1];
    }
    if (shapeSnapshot) ctx.putImageData(shapeSnapshot, 0, 0);

    applyDrawStyle();
    drawShape(drawTool, snapX, snapY, x, y);
  }
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  shapeSnapshot = null;
  if (ctx) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
  }
}

function applyDrawStyle() {
  if (!ctx) return;
  ctx.strokeStyle = drawTool === "eraser" ? "rgba(0,0,0,1)" : drawColor;
  ctx.lineWidth   = drawTool === "marker" ? strokeW * 3 : strokeW;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
}

// ── Пішін сызу ────────────────────────────────────────
function drawShape(tool, x1, y1, x2, y2) {
  if (!ctx) return;
  ctx.beginPath();

  if (tool === "line") {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

  } else if (tool === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

  } else if (tool === "circle") {
    const rx = (x2 - x1) / 2;
    const ry = (y2 - y1) / 2;
    ctx.ellipse(x1 + rx, y1 + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    ctx.stroke();

  } else if (tool === "arrow") {
    // Сызық
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Жебе басы
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len   = 16;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - len * Math.cos(angle - Math.PI / 6),
      y2 - len * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - len * Math.cos(angle + Math.PI / 6),
      y2 - len * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }
}

// ── Undo ─────────────────────────────────────────────
window.undoDraw = function() {
  if (!ctx || !drawHistory.length) return;
  const prev = drawHistory.pop();
  ctx.putImageData(prev, 0, 0);
};

// ── Canvas тазалау ───────────────────────────────────
window.clearCanvas = function() {
  if (!ctx) return;
  const cvs = document.getElementById("drawCanvas");
  if (!cvs) return;
  // Snapshot сақтау (undo)
  drawHistory.push(ctx.getImageData(0, 0, cvs.width, cvs.height));
  ctx.clearRect(0, 0, cvs.width, cvs.height);
};

// ── Window resize → canvas resize ────────────────────
window.addEventListener("resize", () => {
  if (!drawMode) return;
  const cvs  = document.getElementById("drawCanvas");
  if (!cvs || !ctx) return;
  const img  = ctx.getImageData(0, 0, cvs.width, cvs.height);
  const wrap = cvs.parentElement;
  cvs.width  = wrap.clientWidth;
  cvs.height = wrap.clientHeight;
  ctx.putImageData(img, 0, 0);
});

// =====================================================
// 🔦📝🙈 FLOATING TOOLS -- SmartBoardAI PRO
// Spotlight | Cover | Sticky Note
// =====================================================

// ═══════════════════════════════════════
// 📝 STICKY NOTE
// ═══════════════════════════════════════

let stickyCount = 0;

window.addStickyNote = function() {
  stickyCount++;
  const container = document.getElementById("stickyContainer");
  if (!container) return;

  const COLORS = [
    { bg: "#fef08a", border: "#facc15", text: "#713f12" },
    { bg: "#bbf7d0", border: "#4ade80", text: "#14532d" },
    { bg: "#bfdbfe", border: "#60a5fa", text: "#1e3a8a" },
    { bg: "#fca5a5", border: "#f87171", text: "#7f1d1d" },
    { bg: "#e9d5ff", border: "#c084fc", text: "#581c87" },
  ];
  const c = COLORS[(stickyCount - 1) % COLORS.length];

  // Позиция -- экранның ортасына жақын, бірақ кездейсоқ
  const x = 200 + Math.random() * 300;
  const y = 150 + Math.random() * 200;

  const note = document.createElement("div");
  note.className = "sticky-note";
  note.id = `sticky_${stickyCount}`;
  note.style.cssText = `
    position:fixed;
    left:${x}px; top:${y}px;
    width:200px; min-height:160px;
    background:${c.bg};
    border:1.5px solid ${c.border};
    border-radius:4px 16px 16px 16px;
    box-shadow:3px 4px 14px rgba(0,0,0,0.15);
    z-index:180;
    display:flex; flex-direction:column;
    font-family:inherit;
    animation:sticky-in .2s ease;
  `;

  note.innerHTML = `
    <style>
      @keyframes sticky-in {
        from { opacity:0; transform:scale(0.85) rotate(-2deg); }
        to   { opacity:1; transform:scale(1) rotate(0deg); }
      }
    </style>

    <!-- Header (drag handle) -->
    <div class="sticky-header" style="
      background:${c.border};
      padding:6px 8px;
      border-radius:2px 14px 0 0;
      display:flex; align-items:center; justify-content:space-between;
      cursor:move; user-select:none;
    ">
      <div style="display:flex;gap:4px;">
        ${COLORS.map((col, i) => `
          <button onclick="changeStickyColor(event,'sticky_${stickyCount}',${i})"
            style="width:14px;height:14px;border-radius:50%;background:${col.bg};
            border:1.5px solid ${col.border};cursor:pointer;padding:0;"></button>
        `).join("")}
      </div>
      <button onclick="removeSticky('sticky_${stickyCount}')" style="
        background:transparent;border:none;cursor:pointer;
        color:${c.text};font-size:14px;font-weight:700;opacity:0.7;
        line-height:1;padding:0 2px;
      ">✕</button>
    </div>

    <!-- Text area -->
    <textarea placeholder="Жазыңыз..." style="
      flex:1; padding:10px; border:none; outline:none;
      background:transparent; resize:none;
      font-size:14px; line-height:1.5;
      color:${c.text}; font-family:inherit;
      min-height:120px;
    "></textarea>

    <!-- Resize handle -->
    <div style="
      text-align:right; padding:3px 6px;
      color:${c.border}; font-size:16px;
      cursor:se-resize; user-select:none;
    " class="sticky-resize">⤡</div>
  `;

  container.appendChild(note);
  makeDraggable(note);
  makeStickyResizable(note);

  // Focus textarea
  setTimeout(() => note.querySelector("textarea")?.focus(), 100);
};

window.removeSticky = function(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
};

window.changeStickyColor = function(e, id, colorIdx) {
  e.stopPropagation();
  const COLORS = [
    { bg: "#fef08a", border: "#facc15", text: "#713f12" },
    { bg: "#bbf7d0", border: "#4ade80", text: "#14532d" },
    { bg: "#bfdbfe", border: "#60a5fa", text: "#1e3a8a" },
    { bg: "#fca5a5", border: "#f87171", text: "#7f1d1d" },
    { bg: "#e9d5ff", border: "#c084fc", text: "#581c87" },
  ];
  const c   = COLORS[colorIdx];
  const el  = document.getElementById(id);
  if (!el) return;
  el.style.background   = c.bg;
  el.style.borderColor  = c.border;
  const header = el.querySelector(".sticky-header");
  if (header) header.style.background = c.border;
  const ta = el.querySelector("textarea");
  if (ta) ta.style.color = c.text;
};

// Drag (mouse + touch)
function makeDraggable(el, handleSelector) {
  // sticky-header (жабысқақ жазба), widget-header (мини құралдар),
  // ешқайсысы болмаса — элементтің өзін сүйрейміз (сызғыш, транспортир)
  const handle = handleSelector
    ? el.querySelector(handleSelector)
    : (el.querySelector(".sticky-header") || el.querySelector(".widget-header") || el);
  if (!handle) return;
  let dx = 0, dy = 0;

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dx = e.clientX - el.offsetLeft;
    dy = e.clientY - el.offsetTop;
    const move = (e2) => {
      el.style.left = (e2.clientX - dx) + "px";
      el.style.top  = (e2.clientY - dy) + "px";
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });

  handle.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    dx = t.clientX - el.offsetLeft;
    dy = t.clientY - el.offsetTop;
    const move = (e2) => {
      const t2 = e2.touches[0];
      el.style.left = (t2.clientX - dx) + "px";
      el.style.top  = (t2.clientY - dy) + "px";
    };
    const up = () => {
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
    };
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up);
  });
}

function makeStickyResizable(el) {
  const handle = el.querySelector(".sticky-resize");
  if (!handle) return;
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (e2) => {
      el.style.width     = Math.max(150, startW + e2.clientX - startX) + "px";
      el.style.minHeight = Math.max(120, startH + e2.clientY - startY) + "px";
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

// ═══════════════════════════════════════
// 🔦 SPOTLIGHT
// ═══════════════════════════════════════

let spotlightOn = false;
let spotlightR  = 120;

window.toggleSpotlight = function() {
  spotlightOn = !spotlightOn;
  const overlay = document.getElementById("spotlightOverlay");
  const btn     = document.getElementById("spotlightBtn");
  if (!overlay) return;

  overlay.style.display = spotlightOn ? "block" : "none";

  if (btn) {
    btn.style.background = spotlightOn
      ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)";
    btn.textContent = spotlightOn ? "🔦 Қосулы" : "🔦 Прожектор";
  }

  if (spotlightOn) {
    overlay.addEventListener("mousemove", moveSpotlight);
    overlay.addEventListener("touchmove", touchSpotlight, { passive: false });
  } else {
    overlay.removeEventListener("mousemove", moveSpotlight);
    overlay.removeEventListener("touchmove", touchSpotlight);
  }
};

function moveSpotlight(e) {
  const circle = document.getElementById("spotlightCircle");
  if (circle) {
    circle.setAttribute("cx", e.clientX);
    circle.setAttribute("cy", e.clientY);
  }
}

function touchSpotlight(e) {
  e.preventDefault();
  const t = e.touches[0];
  const circle = document.getElementById("spotlightCircle");
  if (circle) {
    circle.setAttribute("cx", t.clientX);
    circle.setAttribute("cy", t.clientY);
  }
}

window.resizeSpotlight = function(val) {
  spotlightR = parseInt(val);
  const circle = document.getElementById("spotlightCircle");
  if (circle) circle.setAttribute("r", spotlightR);
};

// ═══════════════════════════════════════
// 🙈 COVER (Reveal панелі)
// ═══════════════════════════════════════

let coverOn     = false;
let coverPct    = 50;   // жоғарғы cover % (0=ашық, 100=жабық)
let coverDragging = false;

window.toggleCover = function() {
  coverOn = !coverOn;
  const overlay = document.getElementById("coverOverlay");
  const btn     = document.getElementById("coverBtn");
  if (!overlay) return;

  overlay.style.display = coverOn ? "block" : "none";
  updateCoverPosition();

  if (btn) {
    btn.style.background = coverOn
      ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)";
    btn.textContent = coverOn ? "🙈 Жабылды" : "🙈 Жасыру";
  }
};

window.revealAll = function() {
  coverPct = 0;
  updateCoverPosition();
};

function updateCoverPosition() {
  const top    = document.getElementById("coverTop");
  const handle = document.getElementById("coverHandle");
  const bottom = document.getElementById("coverBottom");
  if (!top || !handle) return;

  top.style.height    = coverPct + "vh";
  handle.style.top    = coverPct + "vh";
  if (bottom) bottom.style.height = Math.max(0, 100 - coverPct - 4) + "vh";
}

// Handle drag
safeReady(() => {
  const handle = document.getElementById("coverHandle");
  if (!handle) return;

  handle.addEventListener("mousedown", (e) => {
    coverDragging = true;
    const move = (e2) => {
      if (!coverDragging) return;
      coverPct = Math.max(0, Math.min(95, (e2.clientY / window.innerHeight) * 100));
      updateCoverPosition();
    };
    const up = () => { coverDragging = false; };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up, { once: true });
  });

  handle.addEventListener("touchstart", (e) => {
    const move = (e2) => {
      const t = e2.touches[0];
      coverPct = Math.max(0, Math.min(95, (t.clientY / window.innerHeight) * 100));
      updateCoverPosition();
    };
    const up = () => {
      document.removeEventListener("touchmove", move);
    };
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up, { once: true });
  });
});

// =====================================================
// 📋 BOARD BACKGROUND -- SmartBoardAI PRO
// Gynzy сияқты: Blank, Lines, Squares, Dots, MM, Coord...
// =====================================================

const BG_PATTERNS = {
  none: {
    background: "#ffffff",
    backgroundImage: "none",
  },
  lines: {
    backgroundColor: "#ffffff",
    backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #93c5fd 27px, #93c5fd 28px)",
  },
  squares: {
    backgroundColor: "#ffffff",
    backgroundImage: "linear-gradient(#bfdbfe 1px, transparent 1px), linear-gradient(90deg, #bfdbfe 1px, transparent 1px)",
    backgroundSize: "28px 28px",
  },
  dots: {
    backgroundColor: "#ffffff",
    backgroundImage: "radial-gradient(circle, #93c5fd 1.5px, transparent 1.5px)",
    backgroundSize: "24px 24px",
  },
  mm: {
    backgroundColor: "#ffffff",
    backgroundImage: `
      linear-gradient(#93c5fd 1px, transparent 1px),
      linear-gradient(90deg, #93c5fd 1px, transparent 1px),
      linear-gradient(rgba(147,197,253,0.4) 1px, transparent 1px),
      linear-gradient(90deg, rgba(147,197,253,0.4) 1px, transparent 1px)
    `,
    backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
  },
  coord: {
    backgroundColor: "#ffffff",
    backgroundImage: `
      linear-gradient(#4f46e5 1.5px, transparent 1.5px),
      linear-gradient(90deg, #4f46e5 1.5px, transparent 1.5px),
      linear-gradient(rgba(147,197,253,0.5) 1px, transparent 1px),
      linear-gradient(90deg, rgba(147,197,253,0.5) 1px, transparent 1px)
    `,
    backgroundSize: "60px 60px, 60px 60px, 12px 12px, 12px 12px",
  },
  notebook: {
    backgroundColor: "#fff9f0",
    backgroundImage: `
      repeating-linear-gradient(transparent, transparent 29px, #bfdbfe 29px, #bfdbfe 30px)
    `,
    backgroundPosition: "0 32px",
  },
  dark: {
    backgroundColor: "#1e1b4b",
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
    `,
    backgroundSize: "32px 32px",
  },
  green: {
    backgroundColor: "#166534",
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
    `,
    backgroundSize: "32px 32px",
  },
};

// Ағымдағы фон
let currentBoardBg = "none";

// ── Фон қолдану ─────────────────────────────────────
window.setBoardBg = function(type) {
  currentBoardBg = type;
  const board = document.getElementById("board");
  if (!board) return;

  const pat = BG_PATTERNS[type];
  if (!pat) return;

  // Барлық background стильдерін тазалау
  board.style.background = "";
  board.style.backgroundImage = "";
  board.style.backgroundColor = "";
  board.style.backgroundSize = "";
  board.style.backgroundPosition = "";

  // Жаңа стиль қолдану
  Object.entries(pat).forEach(([prop, val]) => {
    board.style[prop] = val;
  });

  // Фон контентпен бірге толық "созылып" тұруы үшін
  board.style.backgroundAttachment = "local";

  // Active батырманы белгілеу
  document.querySelectorAll(".bg-opt").forEach(b => {
    b.style.borderColor = b.dataset.bg === type ? "#c7d2fe" : "#e5e7eb";
    b.style.background  = b.dataset.bg === type ? "#eef2ff" : "#f9fafb";
  });

  // Drawer canvas фонын да өзгерту
  const canvas = document.getElementById("drawCanvas");
  if (canvas) {
    canvas.style.backgroundColor = "transparent";
  }
};

// ── Түс қолдану ─────────────────────────────────────
window.setBoardColor = function(color) {
  const board = document.getElementById("board");
  if (!board) return;
  board.style.background      = color;
  board.style.backgroundImage = "none";
  board.style.backgroundAttachment = "local";
  currentBoardBg = "color_" + color;
};

// ── Сурет фон ───────────────────────────────────────
window.setBoardImage = function(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const board = document.getElementById("board");
    if (!board) return;
    board.style.backgroundImage  = `url(${e.target.result})`;
    board.style.backgroundSize   = "cover";
    board.style.backgroundPosition = "center";
    board.style.backgroundColor  = "transparent";
    board.style.backgroundAttachment = "local";
    currentBoardBg = "image";
    toggleBgPicker();
  };
  reader.readAsDataURL(file);
};

// ── Picker ашу/жабу ─────────────────────────────────
let bgPickerOpen = false;

window.toggleBgPicker = function() {
  bgPickerOpen = !bgPickerOpen;
  const picker = document.getElementById("bgPicker");
  const btn    = document.getElementById("bgBtn");
  if (!picker) return;
  picker.style.display = bgPickerOpen ? "block" : "none";
  if (btn) {
    btn.style.background = bgPickerOpen
      ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)";
  }
};

// ── Tab ауыстыру ─────────────────────────────────────
window.switchBgTab = function(tab, btn) {
  document.querySelectorAll(".bg-panel").forEach(p => p.style.display = "none");
  document.querySelectorAll(".bg-tab").forEach(b => {
    b.style.color       = "#6b7280";
    b.style.borderBottom = "2px solid transparent";
    b.style.fontWeight  = "600";
  });
  const panel = document.getElementById("bgTab-" + tab);
  if (panel) panel.style.display = "block";
  if (btn) {
    btn.style.color       = "#4f46e5";
    btn.style.borderBottom = "2px solid #4f46e5";
    btn.style.fontWeight  = "700";
  }
};

// Сыртты бассаңыз жабылады
document.addEventListener("click", (e) => {
  const picker = document.getElementById("bgPicker");
  const btn    = document.getElementById("bgBtn");
  if (!picker || !bgPickerOpen) return;
  if (!picker.contains(e.target) && !btn?.contains(e.target)) {
    bgPickerOpen = false;
    picker.style.display = "none";
    if (btn) btn.style.background = "rgba(255,255,255,0.12)";
  }
});

// =====================================================
// 🧰 MINI TOOLS -- SmartBoardAI PRO
// Dice | Traffic Light | Sound Meter | Date | Clock | Counter
// Барлығы draggable floating widget
// =====================================================

// ── Dropdown ─────────────────────────────────────────
let miniDropOpen = false;

window.toggleMiniTools = function() {
  miniDropOpen = !miniDropOpen;
  const drop = document.getElementById("miniToolsDropdown");
  const btn  = document.getElementById("miniToolsBtn");
  if (!drop) return;
  drop.style.display = miniDropOpen ? "block" : "none";
  if (btn) btn.style.background = miniDropOpen
    ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)";
};

document.addEventListener("click", (e) => {
  if (!miniDropOpen) return;
  const drop = document.getElementById("miniToolsDropdown");
  const btn  = document.getElementById("miniToolsBtn");
  if (!drop?.contains(e.target) && !btn?.contains(e.target)) {
    miniDropOpen = false;
    if (drop) drop.style.display = "none";
    if (btn)  btn.style.background = "rgba(255,255,255,0.12)";
  }
});

// ── Widget жасаушы ───────────────────────────────────
let widgetCount = 0;

function createWidget({ id, title, icon, color, width, content, onMount }) {
  widgetCount++;
  const wId = id || `widget_${widgetCount}`;

  // Бұрын бар болса -- тек focus
  const existing = document.getElementById(wId);
  if (existing) {
    existing.style.zIndex = 500 + widgetCount;
    miniDropOpen = false;
    const drop = document.getElementById("miniToolsDropdown");
    if (drop) drop.style.display = "none";
    return existing;
  }

  const container = document.getElementById("miniToolsContainer");
  if (!container) return null;

  const w = document.createElement("div");
  w.id = wId;
  w.style.cssText = `
    position:fixed;
    left:${120 + widgetCount * 20}px;
    top:${100 + widgetCount * 20}px;
    width:${width || 220}px;
    background:white;
    border-radius:18px;
    box-shadow:0 10px 36px rgba(15,23,42,0.18);
    border:1px solid #e2e6f0;
    z-index:${400 + widgetCount};
    overflow:hidden;
    animation:modal-in .2s ease;
    user-select:none;
  `;

  w.innerHTML = `
    <!-- Header (drag handle) -->
    <div class="widget-header" style="
      background:${color || "linear-gradient(135deg,#4f46e5,#818cf8)"};
      padding:8px 12px;
      display:flex;align-items:center;justify-content:space-between;
      cursor:move;
    ">
      <span style="color:white;font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;">
        ${icon} ${title}
      </span>
      <button onclick="document.getElementById('${wId}').remove()" style="
        background:rgba(255,255,255,0.2);color:white;
        border:none;border-radius:6px;
        width:22px;height:22px;font-size:14px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        line-height:1;
      ">✕</button>
    </div>

    <!-- Body -->
    <div class="widget-body" id="${wId}-body" style="padding:14px;">
      ${content}
    </div>
  `;

  container.appendChild(w);
  makeDraggable(w);
  if (onMount) setTimeout(() => onMount(w), 50);

  // Dropdown жабу
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";
  const btn = document.getElementById("miniToolsBtn");
  if (btn) btn.style.background = "rgba(255,255,255,0.12)";

  return w;
}

// ── Tool ашу роутері ─────────────────────────────────
window.openMiniTool = function(type) {
  switch(type) {
    case "dice":    openDice();    break;
    case "traffic": openTrafficLight(); break;
    case "sound":   openSoundMeter();   break;
    case "date":    openDateWidget();   break;
    case "clock":   openClock();        break;
    case "counter": openCounter();      break;
  }
};

// ══════════════════════════════════════════
// 🎲 DIGITAL DICE
// ══════════════════════════════════════════
function openDice() {
  const DICE_FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];

  createWidget({
    id: "widget-dice",
    title: "Электрондық кубик",
    icon: "🎲",
    color: "linear-gradient(135deg,#7c3aed,#a78bfa)",
    width: 200,
    content: `
      <div style="text-align:center;">
        <!-- Кубик саны таңдау -->
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:11px;font-weight:700;color:#6b7280;">Кубик саны:</span>
          <button onclick="changeDiceCount(-1)" style="
            width:24px;height:24px;border-radius:6px;
            background:#f3f4f6;border:1px solid #e5e7eb;
            font-size:14px;cursor:pointer;font-weight:700;
          ">-</button>
          <span id="diceCount" style="font-weight:800;font-size:16px;color:#4f46e5;min-width:20px;text-align:center;">1</span>
          <button onclick="changeDiceCount(1)" style="
            width:24px;height:24px;border-radius:6px;
            background:#f3f4f6;border:1px solid #e5e7eb;
            font-size:14px;cursor:pointer;font-weight:700;
          ">+</button>
        </div>

        <!-- Кубик нәтижесі -->
        <div id="diceResult" style="
          font-size:56px;line-height:1;margin-bottom:10px;
          min-height:64px;display:flex;align-items:center;
          justify-content:center;gap:4px;flex-wrap:wrap;
        ">⚀</div>

        <!-- Сандық мән -->
        <div id="diceSum" style="
          font-size:13px;font-weight:700;color:#6b7280;
          margin-bottom:12px;
        ">Мән: 1</div>

        <!-- Roll батырмасы -->
        <button onclick="rollDice()" style="
          width:100%;padding:10px;border:none;border-radius:10px;
          background:linear-gradient(135deg,#7c3aed,#a78bfa);
          color:white;font-size:14px;font-weight:800;
          cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,0.3);
          transition:all .18s;
        " onmouseover="this.style.transform='translateY(-1px)'"
           onmouseout="this.style.transform='translateY(0)'">
          🎲 Лақтыру!
        </button>
      </div>
    `,
  });

  // Инициализация
  window._diceCount = 1;
}

window.changeDiceCount = function(delta) {
  window._diceCount = Math.max(1, Math.min(6, (window._diceCount || 1) + delta));
  const el = document.getElementById("diceCount");
  if (el) el.textContent = window._diceCount;
  rollDice();
};

window.rollDice = function() {
  const DICE_FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];
  const count  = window._diceCount || 1;
  const result = document.getElementById("diceResult");
  const sumEl  = document.getElementById("diceSum");
  if (!result) return;

  // Анимация
  let frames = 0;
  const anim = setInterval(() => {
    result.style.opacity = "0.3";
    const vals = Array.from({length: count}, () => Math.floor(Math.random() * 6));
    result.textContent = vals.map(v => DICE_FACES[v]).join(" ");
    frames++;
    if (frames > 8) {
      clearInterval(anim);
      result.style.opacity = "1";
      result.style.transform = "scale(1.1)";
      setTimeout(() => result.style.transform = "scale(1)", 200);
      const finalVals = vals;
      const sum = finalVals.reduce((a, v) => a + v + 1, 0);
      if (sumEl) sumEl.textContent = count > 1 ? `Жиыны: ${sum}` : `Мән: ${sum}`;
    }
  }, 60);
};

// ══════════════════════════════════════════
// 🚦 TRAFFIC LIGHT (Дыбыс деңгейі)
// ══════════════════════════════════════════
function openTrafficLight() {
  createWidget({
    id: "widget-traffic",
    title: "Дыбыс деңгейі",
    icon: "🚦",
    color: "linear-gradient(135deg,#374151,#1f2937)",
    width: 180,
    content: `
      <div style="text-align:center;">
        <!-- Бағдаршам -->
        <div style="
          background:#1f2937;border-radius:16px;
          padding:16px 20px;margin-bottom:12px;
          display:inline-flex;flex-direction:column;gap:12px;
          box-shadow:inset 0 2px 8px rgba(0,0,0,0.4);
        ">
          <div id="tl-red" onclick="setTrafficLight('red')" style="
            width:56px;height:56px;border-radius:50%;
            background:#6b7280;cursor:pointer;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            transition:all .25s;
          "></div>
          <div id="tl-yellow" onclick="setTrafficLight('yellow')" style="
            width:56px;height:56px;border-radius:50%;
            background:#6b7280;cursor:pointer;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            transition:all .25s;
          "></div>
          <div id="tl-green" onclick="setTrafficLight('green')" style="
            width:56px;height:56px;border-radius:50%;
            background:#6b7280;cursor:pointer;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            transition:all .25s;
          "></div>
        </div>

        <div id="tlLabel" style="
          font-size:13px;font-weight:700;color:#374151;margin-bottom:10px;
        ">Деңгей таңдаңыз</div>

        <div style="display:flex;gap:6px;justify-content:center;">
          <button onclick="setTrafficLight('red')" style="
            flex:1;padding:7px;border:none;border-radius:8px;
            background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;cursor:pointer;
          ">🔴 Тыныш</button>
          <button onclick="setTrafficLight('yellow')" style="
            flex:1;padding:7px;border:none;border-radius:8px;
            background:#fef3c7;color:#d97706;font-size:11px;font-weight:700;cursor:pointer;
          ">🟡 Жай</button>
          <button onclick="setTrafficLight('green')" style="
            flex:1;padding:7px;border:none;border-radius:8px;
            background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;cursor:pointer;
          ">🟢 Еркін</button>
        </div>
      </div>
    `,
  });
}

window.setTrafficLight = function(color) {
  const lights = { red: "#6b7280", yellow: "#6b7280", green: "#6b7280" };
  const labels = {
    red:    { text: "🔴 Толық тыныштық!", bg: "#fef2f2", col: "#dc2626" },
    yellow: { text: "🟡 Жай сөйлесуге болады", bg: "#fef3c7", col: "#d97706" },
    green:  { text: "🟢 Еркін жұмыс!", bg: "#f0fdf4", col: "#16a34a" },
  };
  const glows = {
    red:    "#ef4444",
    yellow: "#f59e0b",
    green:  "#22c55e",
  };

  ["red","yellow","green"].forEach(c => {
    const el = document.getElementById("tl-" + c);
    if (!el) return;
    if (c === color) {
      el.style.background  = glows[c];
      el.style.boxShadow   = `0 0 24px ${glows[c]}, 0 0 8px ${glows[c]}`;
      el.style.transform   = "scale(1.08)";
    } else {
      el.style.background  = "#374151";
      el.style.boxShadow   = "0 2px 6px rgba(0,0,0,0.3)";
      el.style.transform   = "scale(1)";
    }
  });

  const lbl = document.getElementById("tlLabel");
  if (lbl) {
    const l = labels[color];
    lbl.textContent       = l.text;
    lbl.style.color       = l.col;
    lbl.style.background  = l.bg;
    lbl.style.borderRadius = "8px";
    lbl.style.padding     = "5px 10px";
  }
};

// ══════════════════════════════════════════
// 🔊 SOUND METER
// ══════════════════════════════════════════
let soundMeterStream = null;
let soundMeterAnim   = null;

function openSoundMeter() {
  createWidget({
    id: "widget-sound",
    title: "Шу өлшегіш",
    icon: "🔊",
    color: "linear-gradient(135deg,#0369a1,#06b6d4)",
    width: 210,
    content: `
      <div style="text-align:center;">
        <!-- Деңгей бар -->
        <div style="
          background:#f0f2f8;border-radius:12px;
          padding:12px 14px;margin-bottom:10px;
          position:relative;overflow:hidden;
        ">
          <div id="soundBar" style="
            height:32px;border-radius:8px;
            background:linear-gradient(90deg,#22c55e,#f59e0b,#ef4444);
            width:5%;transition:width .08s ease;
          "></div>
          <div id="soundPct" style="
            position:absolute;top:50%;right:10px;transform:translateY(-50%);
            font-size:13px;font-weight:800;color:#374151;
          ">0%</div>
        </div>

        <!-- Деңгей emoji -->
        <div id="soundEmoji" style="font-size:36px;margin-bottom:8px;">😶</div>
        <div id="soundLabel" style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:12px;">
          Микрофонды іске қосыңыз
        </div>

        <!-- Батырмалар -->
        <div style="display:flex;gap:8px;">
          <button onclick="startSoundMeter()" style="
            flex:1;padding:9px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#0369a1,#06b6d4);
            color:white;font-size:12px;font-weight:700;cursor:pointer;
          ">🎤 Қосу</button>
          <button onclick="stopSoundMeter()" style="
            flex:1;padding:9px;border:none;border-radius:10px;
            background:#f3f4f6;color:#374151;
            font-size:12px;font-weight:700;cursor:pointer;
            border:1px solid #e5e7eb;
          ">⏹ Өшіру</button>
        </div>
      </div>
    `,
  });
}

window.startSoundMeter = async function() {
  try {
    soundMeterStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    const analyser   = audioCtx.createAnalyser();
    const source     = audioCtx.createMediaStreamSource(soundMeterStream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const dataArray  = new Uint8Array(analyser.frequencyBinCount);

    const EMOJIS = [
      { max: 10,  emoji: "😶", label: "Тыныш", color: "#22c55e"  },
      { max: 30,  emoji: "🤫", label: "Жай",   color: "#84cc16"  },
      { max: 50,  emoji: "😊", label: "Қалыпты", color: "#f59e0b" },
      { max: 70,  emoji: "😲", label: "Шулы!",  color: "#f97316" },
      { max: 100, emoji: "😱", label: "Тым шулы!", color: "#ef4444" },
    ];

    soundMeterAnim = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const pct = Math.min(100, Math.round(avg * 2.5));

      const bar   = document.getElementById("soundBar");
      const pctEl = document.getElementById("soundPct");
      const emoEl = document.getElementById("soundEmoji");
      const lblEl = document.getElementById("soundLabel");

      if (bar)   bar.style.width = Math.max(3, pct) + "%";
      if (pctEl) pctEl.textContent = pct + "%";

      const level = EMOJIS.find(e => pct <= e.max) || EMOJIS[EMOJIS.length - 1];
      if (emoEl) emoEl.textContent = level.emoji;
      if (lblEl) { lblEl.textContent = level.label; lblEl.style.color = level.color; }
    }, 100);

  } catch(e) {
    const lbl = document.getElementById("soundLabel");
    if (lbl) lbl.textContent = "Микрофон рұқсаты жоқ";
  }
};

window.stopSoundMeter = function() {
  if (soundMeterAnim) { clearInterval(soundMeterAnim); soundMeterAnim = null; }
  if (soundMeterStream) {
    soundMeterStream.getTracks().forEach(t => t.stop());
    soundMeterStream = null;
  }
  const bar   = document.getElementById("soundBar");
  const pctEl = document.getElementById("soundPct");
  const emoEl = document.getElementById("soundEmoji");
  const lblEl = document.getElementById("soundLabel");
  if (bar)   bar.style.width = "3%";
  if (pctEl) pctEl.textContent = "0%";
  if (emoEl) emoEl.textContent = "😶";
  if (lblEl) { lblEl.textContent = "Тоқтатылды"; lblEl.style.color = "#9ca3af"; }
};

// ══════════════════════════════════════════
// 📅 TODAY'S DATE
// ══════════════════════════════════════════
function openDateWidget() {
  const now = new Date();
  const KK_MONTHS = [
    "Қаңтар","Ақпан","Наурыз","Сәуір","Мамыр","Маусым",
    "Шілде","Тамыз","Қыркүйек","Қазан","Қараша","Желтоқсан"
  ];
  const KK_DAYS = ["Жексенбі","Дүйсенбі","Сейсенбі","Сәрсенбі","Бейсенбі","Жұма","Сенбі"];

  createWidget({
    id: "widget-date",
    title: "Бүгінгі күн",
    icon: "📅",
    color: "linear-gradient(135deg,#0f172a,#1e3a8a)",
    width: 230,
    content: `
      <div style="text-align:center;padding:6px 0;">
        <div style="
          font-size:11px;font-weight:700;letter-spacing:.1em;
          text-transform:uppercase;color:#9ca3af;margin-bottom:4px;
        ">${KK_DAYS[now.getDay()]}</div>

        <div style="
          font-size:52px;font-weight:800;color:#0f172a;
          line-height:1;margin-bottom:4px;
        ">${now.getDate()}</div>

        <div style="
          font-size:18px;font-weight:700;color:#4f46e5;margin-bottom:2px;
        ">${KK_MONTHS[now.getMonth()]}</div>

        <div style="
          font-size:14px;font-weight:600;color:#6b7280;
        ">${now.getFullYear()}</div>

        <div id="liveTime" style="
          font-size:24px;font-weight:800;color:#0f172a;
          margin-top:10px;letter-spacing:.05em;
          background:#f0f2f8;border-radius:10px;padding:6px 14px;
        "></div>
      </div>
    `,
    onMount: () => {
      const updateTime = () => {
        const t = new Date();
        const el = document.getElementById("liveTime");
        if (el) el.textContent =
          String(t.getHours()).padStart(2,"0") + ":" +
          String(t.getMinutes()).padStart(2,"0") + ":" +
          String(t.getSeconds()).padStart(2,"0");
      };
      updateTime();
      setInterval(updateTime, 1000);
    }
  });
}

// ══════════════════════════════════════════
// 🕐 АНАЛОГТЫ САҒАТ
// ══════════════════════════════════════════
function openClock() {
  createWidget({
    id: "widget-clock",
    title: "Аналогты сағат",
    icon: "🕐",
    color: "linear-gradient(135deg,#374151,#1f2937)",
    width: 200,
    content: `
      <div style="text-align:center;">
        <canvas id="clockCanvas" width="160" height="160"
          style="border-radius:50%;box-shadow:0 4px 16px rgba(0,0,0,0.12);"></canvas>
      </div>
    `,
    onMount: () => {
      const canvas = document.getElementById("clockCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const drawClock = () => {
        const now = new Date();
        const W = canvas.width, H = canvas.height, R = W / 2 - 4;
        ctx.clearRect(0, 0, W, H);

        // Фон
        ctx.beginPath();
        ctx.arc(W/2, H/2, R, 0, Math.PI*2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#e2e6f0";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Сандар
        ctx.fillStyle = "#374151";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 1; i <= 12; i++) {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          ctx.fillText(i, W/2 + (R-18)*Math.cos(a), H/2 + (R-18)*Math.sin(a));
        }

        // Минут белгілері
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const len = i % 5 === 0 ? 10 : 5;
          ctx.beginPath();
          ctx.moveTo(W/2 + (R-4)*Math.cos(a), H/2 + (R-4)*Math.sin(a));
          ctx.lineTo(W/2 + (R-4-len)*Math.cos(a), H/2 + (R-4-len)*Math.sin(a));
          ctx.strokeStyle = i % 5 === 0 ? "#374151" : "#d1d5db";
          ctx.lineWidth = i % 5 === 0 ? 2 : 1;
          ctx.stroke();
        }

        const drawHand = (angle, length, width, color) => {
          ctx.beginPath();
          ctx.moveTo(W/2, H/2);
          ctx.lineTo(W/2 + length*Math.cos(angle), H/2 + length*Math.sin(angle));
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = "round";
          ctx.stroke();
        };

        const sec  = now.getSeconds();
        const min  = now.getMinutes();
        const hour = now.getHours() % 12;

        // Сағат тілі
        drawHand((hour/12 + min/(60*12))*Math.PI*2 - Math.PI/2, R*0.5, 5, "#1f2937");
        // Минут тілі
        drawHand((min/60 + sec/(60*60))*Math.PI*2 - Math.PI/2, R*0.72, 3.5, "#374151");
        // Секунд тілі
        drawHand(sec/60*Math.PI*2 - Math.PI/2, R*0.78, 1.5, "#ef4444");

        // Орталық нүкте
        ctx.beginPath();
        ctx.arc(W/2, H/2, 5, 0, Math.PI*2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      };

      drawClock();
      setInterval(drawClock, 1000);
    }
  });
}

// ══════════════════════════════════════════
// 🔢 САНАҚ ЕСЕПТЕГІШ (Counter)
// ══════════════════════════════════════════
function openCounter() {
  createWidget({
    id: "widget-counter",
    title: "Санақ есептегіш",
    icon: "🔢",
    color: "linear-gradient(135deg,#059669,#10b981)",
    width: 200,
    content: `
      <div style="text-align:center;">
        <div id="counterVal" style="
          font-size:64px;font-weight:800;color:#0f172a;
          line-height:1;margin-bottom:16px;
          background:#f0fdf4;border-radius:14px;
          padding:12px;
        ">0</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <button onclick="counterChange(-1)" style="
            padding:12px;border:none;border-radius:10px;
            background:#fef2f2;color:#dc2626;
            font-size:24px;font-weight:800;cursor:pointer;
            transition:.15s;
          " onmouseover="this.style.background='#fecaca'"
             onmouseout="this.style.background='#fef2f2'">-</button>

          <button onclick="counterChange(1)" style="
            padding:12px;border:none;border-radius:10px;
            background:#f0fdf4;color:#16a34a;
            font-size:24px;font-weight:800;cursor:pointer;
            transition:.15s;
          " onmouseover="this.style.background='#bbf7d0'"
             onmouseout="this.style.background='#f0fdf4'">+</button>
        </div>

        <button onclick="counterReset()" style="
          width:100%;padding:8px;border:none;border-radius:8px;
          background:#f3f4f6;color:#6b7280;font-size:12px;font-weight:700;
          cursor:pointer;border:1px solid #e5e7eb;
        ">↺ Нөлге қайтару</button>
      </div>
    `,
  });
  window._counterVal = 0;
}

window.counterChange = function(delta) {
  window._counterVal = (window._counterVal || 0) + delta;
  const el = document.getElementById("counterVal");
  if (el) {
    el.textContent = window._counterVal;
    el.style.color = window._counterVal > 0 ? "#059669"
                   : window._counterVal < 0 ? "#dc2626"
                   : "#0f172a";
    el.style.transform = "scale(1.1)";
    setTimeout(() => el.style.transform = "scale(1)", 150);
  }
};

window.counterReset = function() {
  window._counterVal = 0;
  const el = document.getElementById("counterVal");
  if (el) { el.textContent = "0"; el.style.color = "#0f172a"; }
};

// =====================================================
// 📐 MATH TOOLS -- SmartBoardAI PRO
// Ruler | Protractor | Calculator | Number Line | Fraction
// =====================================================

window.openMathTool = function(type) {
  // Dropdown жабу
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";
  const btn = document.getElementById("miniToolsBtn");
  if (btn) btn.style.background = "rgba(255,255,255,0.12)";

  switch(type) {
    case "ruler":       openRuler();       break;
    case "protractor":  openProtractor();  break;
    case "calculator":  openCalculator();  break;
    case "numberline":  openNumberLine();  break;
    case "fraction":    openFraction();    break;
  }
};

// ══════════════════════════════════════════
// 📏 СЫЗҒЫШ (Ruler)
// ══════════════════════════════════════════
function openRuler() {
  const wId = "widget-ruler";
  if (document.getElementById(wId)) {
    document.getElementById(wId).remove();
  }

  const container = document.getElementById("miniToolsContainer");
  if (!container) return;

  const ruler = document.createElement("div");
  ruler.id = wId;
  ruler.style.cssText = `
    position:fixed; left:200px; top:180px;
    z-index:500; cursor:move; user-select:none;
    animation:modal-in .2s ease;
  `;

  ruler.innerHTML = `
    <canvas id="rulerCanvas" width="500" height="70"
      style="display:block;border-radius:8px;
      box-shadow:0 6px 20px rgba(0,0,0,0.2);cursor:move;"></canvas>
    <div style="
      position:absolute;top:2px;right:6px;
      display:flex;gap:4px;align-items:center;
    ">
      <button onclick="rotateRuler()" style="
        background:rgba(255,255,255,0.3);color:#374151;
        border:none;border-radius:5px;
        padding:2px 7px;font-size:10px;font-weight:700;cursor:pointer;
      ">↻ Айналдыру</button>
      <button onclick="document.getElementById('widget-ruler').remove()" style="
        background:rgba(255,100,100,0.3);color:#7f1d1d;
        border:none;border-radius:5px;
        padding:2px 7px;font-size:10px;font-weight:700;cursor:pointer;
      ">✕</button>
    </div>
  `;

  container.appendChild(ruler);
  makeDraggable(ruler);

  let angle = 0;

  window.rotateRuler = function() {
    angle = (angle + 15) % 360;
    ruler.style.transform = `rotate(${angle}deg)`;
  };

  // Canvas draw
  const cvs = document.getElementById("rulerCanvas");
  const ctx  = cvs.getContext("2d");
  drawRulerCanvas(ctx, cvs.width, cvs.height);
}

function drawRulerCanvas(ctx, W, H) {
  // Фон
  ctx.fillStyle = "#fef9c3";
  ctx.roundRect(0, 0, W, H, 8);
  ctx.fill();

  // Жоғарғы жиек
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(0, 0, W, 6);
  ctx.fillRect(0, H-6, W, 6);

  // Бөлінділер
  for (let i = 0; i <= 25; i++) {
    const x = 10 + i * 19;
    // CM белгі
    const cmH = i % 5 === 0 ? 30 : i % 1 === 0 ? 18 : 10;
    ctx.fillStyle = "#92400e";
    ctx.fillRect(x, 6, 1.5, cmH);

    // MM белгілер
    if (i < 25) {
      for (let m = 1; m <= 9; m++) {
        const mx = x + m * 1.9;
        const mh = m === 5 ? 14 : 8;
        ctx.fillRect(mx, 6, 0.8, mh);
      }
    }

    // CM сандар
    if (i % 5 === 0 && i > 0) {
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(i, x, H - 12);
    }
  }

  // cm белгісі
  ctx.fillStyle = "#b45309";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("cm", 12, H - 12);
}

// ══════════════════════════════════════════
// 📐 ТРАНСПОРТИР (Protractor)
// ══════════════════════════════════════════
function openProtractor() {
  const wId = "widget-protractor";
  if (document.getElementById(wId)) {
    document.getElementById(wId).remove();
  }

  const container = document.getElementById("miniToolsContainer");
  if (!container) return;

  const el = document.createElement("div");
  el.id = wId;
  el.style.cssText = `
    position:fixed; left:250px; top:160px;
    z-index:500; user-select:none;
    animation:modal-in .2s ease;
  `;

  el.innerHTML = `
    <div style="position:relative;">
      <canvas id="protractorCanvas" width="260" height="140"
        style="display:block;cursor:move;"></canvas>
      <div style="
        position:absolute;top:4px;right:4px;
        display:flex;gap:4px;
      ">
        <div id="protractorAngle" style="
          background:rgba(255,255,255,0.9);
          border-radius:6px;padding:2px 8px;
          font-size:12px;font-weight:800;color:#4f46e5;
        ">0°</div>
        <button onclick="document.getElementById('widget-protractor').remove()" style="
          background:rgba(255,100,100,0.3);color:#7f1d1d;
          border:none;border-radius:5px;
          padding:2px 7px;font-size:10px;font-weight:700;cursor:pointer;
        ">✕</button>
      </div>
    </div>
  `;

  container.appendChild(el);
  makeDraggable(el);

  const cvs = document.getElementById("protractorCanvas");
  const ctx  = cvs.getContext("2d");
  const W = cvs.width, H = cvs.height;
  const cx = W / 2, cy = H - 10, R = 120;

  // Draw
  ctx.clearRect(0, 0, W, H);

  // Жартышеңбер фоны
  ctx.beginPath();
  ctx.arc(cx, cy, R, Math.PI, 0);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = "rgba(254,243,199,0.95)";
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Белгілер (0-180)
  for (let a = 0; a <= 180; a++) {
    const rad = (Math.PI - a * Math.PI / 180);
    const isMaj = a % 10 === 0;
    const isMed = a % 5 === 0;
    const tickLen = isMaj ? 14 : isMed ? 9 : 5;
    const x1 = cx + R * Math.cos(rad);
    const y1 = cy + R * Math.sin(rad);
    const x2 = cx + (R - tickLen) * Math.cos(rad);
    const y2 = cy + (R - tickLen) * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = isMaj ? 1.5 : 0.8;
    ctx.stroke();

    if (isMaj) {
      ctx.fillStyle = "#92400e";
      ctx.font = `bold ${a % 30 === 0 ? "11" : "9"}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tx = cx + (R - 22) * Math.cos(rad);
      const ty = cy + (R - 22) * Math.sin(rad);
      ctx.fillText(a, tx, ty);
    }
  }

  // Горизонталь сызық
  ctx.beginPath();
  ctx.moveTo(cx - R, cy);
  ctx.lineTo(cx + R, cy);
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Орта нүкте
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI*2);
  ctx.fillStyle = "#4f46e5";
  ctx.fill();

  // Интерактивті бұрыш өлшеу
  cvs.addEventListener("mousemove", (e) => {
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (my > cy) return;
    const dx = mx - cx, dy = cy - my;
    let angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
    if (angle < 0) angle = 0;
    if (angle > 180) angle = 180;
    const el = document.getElementById("protractorAngle");
    if (el) el.textContent = angle + "°";
  });
}

// ══════════════════════════════════════════
// 🧮 КАЛЬКУЛЯТОР
// ══════════════════════════════════════════
function openCalculator() {
  createWidget({
    id: "widget-calc",
    title: "Калькулятор",
    icon: "🧮",
    color: "linear-gradient(135deg,#374151,#1f2937)",
    width: 220,
    content: `
      <div>
        <!-- Display -->
        <div id="calcDisplay" style="
          background:#1f2937;color:#34d399;
          font-size:26px;font-weight:800;
          text-align:right;padding:10px 12px;
          border-radius:10px;margin-bottom:10px;
          font-family:monospace;
          min-height:48px;word-break:break-all;
          line-height:1.3;
        ">0</div>

        <div id="calcExpr" style="
          font-size:11px;color:#9ca3af;
          text-align:right;margin-bottom:8px;
          min-height:14px;font-family:monospace;
        "></div>

        <!-- Buttons -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;">
          ${[
            ["C","#fef2f2","#dc2626"],["±","#f0fdf4","#16a34a"],["%","#f0fdf4","#16a34a"],["/","#eef2ff","#4f46e5"],
            ["7","#f9fafb","#111827"],["8","#f9fafb","#111827"],["9","#f9fafb","#111827"],["*","#eef2ff","#4f46e5"],
            ["4","#f9fafb","#111827"],["5","#f9fafb","#111827"],["6","#f9fafb","#111827"],["-","#eef2ff","#4f46e5"],
            ["1","#f9fafb","#111827"],["2","#f9fafb","#111827"],["3","#f9fafb","#111827"],["+","#eef2ff","#4f46e5"],
            ["0","#f9fafb","#111827"],[".","#f9fafb","#111827"],["⌫","#fef3c7","#92400e"],["=","#4f46e5","white"],
          ].map(([k, bg, col]) => `
            <button onclick="calcPress('${k}')" style="
              padding:12px 4px;border:none;border-radius:8px;
              background:${bg};color:${col};
              font-size:16px;font-weight:700;cursor:pointer;
              transition:.12s;
            " onmouseover="this.style.opacity='.8'"
               onmouseout="this.style.opacity='1'">${k}</button>
          `).join("")}
        </div>
      </div>
    `,
  });

  window._calcExpr = "";
  window._calcNew  = true;
}

window.calcPress = function(key) {
  const disp = document.getElementById("calcDisplay");
  const expr = document.getElementById("calcExpr");
  if (!disp) return;

  let cur = disp.textContent;

  if (key === "C") {
    window._calcExpr = "";
    window._calcNew  = true;
    disp.textContent = "0";
    if (expr) expr.textContent = "";
    return;
  }

  if (key === "=") {
    try {
      const expression = (window._calcExpr || cur)
;
      if (expr) expr.textContent = window._calcExpr + " =";
      const result = Function('"use strict"; return (' + expression + ')')();
      const rounded = Math.round(result * 1e10) / 1e10;
      disp.textContent = rounded;
      window._calcExpr = String(rounded);
      window._calcNew  = true;
    } catch {
      disp.textContent = "Қате";
      window._calcExpr = "";
      window._calcNew  = true;
    }
    return;
  }

  if (key === "⌫") {
    if (window._calcExpr.length > 0) {
      window._calcExpr = window._calcExpr.slice(0, -1) || "0";
      disp.textContent = window._calcExpr || "0";
    }
    return;
  }

  if (key === "±") {
    const v = parseFloat(window._calcExpr || cur);
    window._calcExpr = String(-v);
    disp.textContent = window._calcExpr;
    return;
  }

  if (key === "%") {
    const v = parseFloat(window._calcExpr || cur);
    window._calcExpr = String(v / 100);
    disp.textContent = window._calcExpr;
    return;
  }

  // Сан немесе оператор
  if (window._calcNew && ["+","-","*","/"].includes(key)) {
    window._calcExpr = (window._calcExpr || cur) + " " + key + " ";
    window._calcNew  = false;
  } else if (window._calcNew) {
    window._calcExpr = key;
    window._calcNew  = false;
  } else {
    window._calcExpr = (window._calcExpr || "") + key;
  }

  disp.textContent = window._calcExpr;
  if (expr) expr.textContent = "";
};

// ══════════════════════════════════════════
// 🔢 САН СЫЗЫҒЫ (Number Line)
// ══════════════════════════════════════════
function openNumberLine() {
  createWidget({
    id: "widget-numline",
    title: "Сан сызығы",
    icon: "🔢",
    color: "linear-gradient(135deg,#0369a1,#0ea5e9)",
    width: 360,
    content: `
      <div>
        <!-- Settings -->
        <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:4px;">
            <label style="font-size:11px;font-weight:700;color:#6b7280;">Бастапқы:</label>
            <input id="nlMin" type="number" value="-10" style="
              width:52px;padding:4px 6px;border:1px solid #e5e7eb;
              border-radius:6px;font-size:12px;text-align:center;
            " oninput="renderNumberLine()"/>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <label style="font-size:11px;font-weight:700;color:#6b7280;">Соңғы:</label>
            <input id="nlMax" type="number" value="10" style="
              width:52px;padding:4px 6px;border:1px solid #e5e7eb;
              border-radius:6px;font-size:12px;text-align:center;
            " oninput="renderNumberLine()"/>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <label style="font-size:11px;font-weight:700;color:#6b7280;">Қадам:</label>
            <input id="nlStep" type="number" value="1" min="0.5" style="
              width:44px;padding:4px 6px;border:1px solid #e5e7eb;
              border-radius:6px;font-size:12px;text-align:center;
            " oninput="renderNumberLine()"/>
          </div>
        </div>

        <!-- Canvas -->
        <canvas id="nlCanvas" width="330" height="80"
          style="border-radius:8px;background:#f8f9ff;border:1px solid #e0e7ff;
          cursor:crosshair;"
          onclick="nlMark(event)">
        </canvas>

        <div style="font-size:10px;color:#9ca3af;margin-top:5px;text-align:center;">
          Сан сызығына басып нүкте қою
        </div>
      </div>
    `,
    onMount: () => renderNumberLine(),
  });

  window._nlMarks = [];
}

window.renderNumberLine = function() {
  const cvs  = document.getElementById("nlCanvas");
  if (!cvs) return;
  const ctx  = cvs.getContext("2d");
  const W = cvs.width, H = cvs.height;
  const min  = parseFloat(document.getElementById("nlMin")?.value) || -10;
  const max  = parseFloat(document.getElementById("nlMax")?.value) || 10;
  const step = parseFloat(document.getElementById("nlStep")?.value) || 1;

  ctx.clearRect(0, 0, W, H);

  const pad  = 20;
  const y    = H / 2;
  const span = max - min;
  const toX  = (v) => pad + ((v - min) / span) * (W - pad * 2);

  // Сызық
  ctx.beginPath();
  ctx.moveTo(pad - 10, y);
  ctx.lineTo(W - pad + 10, y);
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Жебелер
  ctx.beginPath();
  ctx.moveTo(W - pad + 10, y);
  ctx.lineTo(W - pad, y - 5);
  ctx.moveTo(W - pad + 10, y);
  ctx.lineTo(W - pad, y + 5);
  ctx.moveTo(pad - 10, y);
  ctx.lineTo(pad, y - 5);
  ctx.moveTo(pad - 10, y);
  ctx.lineTo(pad, y + 5);
  ctx.stroke();

  // Белгілер
  for (let v = min; v <= max; v += step) {
    const x = toX(v);
    const isMaj = Number.isInteger(v);
    ctx.beginPath();
    ctx.moveTo(x, y - (isMaj ? 10 : 6));
    ctx.lineTo(x, y + (isMaj ? 10 : 6));
    ctx.strokeStyle = isMaj ? "#1e3a8a" : "#93c5fd";
    ctx.lineWidth = isMaj ? 1.5 : 0.8;
    ctx.stroke();

    if (isMaj) {
      ctx.fillStyle = "#1e3a8a";
      ctx.font = "bold 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(v, x, y + 22);
    }
  }

  // Нүктелер (белгіленген)
  (window._nlMarks || []).forEach(({ x: mx, color }) => {
    const px = toX(mx);
    ctx.beginPath();
    ctx.arc(px, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color || "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#1e3a8a";
    ctx.font = "bold 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(mx, px, y - 14);
  });

  window._nlCtx = ctx;
  window._nlMin = min; window._nlMax = max; window._nlPad = pad;
  window._nlW = W; window._nlH = H; window._nlY = y;
};

window.nlMark = function(e) {
  const cvs = document.getElementById("nlCanvas");
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  const px   = e.clientX - rect.left;
  const min  = window._nlMin || -10, max = window._nlMax || 10;
  const pad  = window._nlPad || 20, W = window._nlW || 330;
  const val  = Math.round(((px - pad) / (W - pad*2)) * (max - min) + min);
  if (val < min || val > max) return;
  const COLORS = ["#ef4444","#4f46e5","#10b981","#f59e0b","#8b5cf6"];
  window._nlMarks = window._nlMarks || [];
  const existing = window._nlMarks.findIndex(m => m.x === val);
  if (existing >= 0) {
    window._nlMarks.splice(existing, 1);
  } else {
    window._nlMarks.push({ x: val, color: COLORS[window._nlMarks.length % COLORS.length] });
  }
  renderNumberLine();
};

// ══════════════════════════════════════════
// ½ БӨЛШЕК (Fraction Bar)
// ══════════════════════════════════════════
function openFraction() {
  createWidget({
    id: "widget-fraction",
    title: "Бөлшек",
    icon: "½",
    color: "linear-gradient(135deg,#dc2626,#f87171)",
    width: 280,
    content: `
      <div>
        <!-- Input -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;justify-content:center;">
          <input id="fracNum" type="number" value="1" min="0" style="
            width:56px;padding:8px;border:1.5px solid #e5e7eb;
            border-radius:8px;font-size:18px;text-align:center;font-weight:700;
          " oninput="renderFraction()"/>
          <div style="font-size:22px;color:#374151;font-weight:800;">/</div>
          <input id="fracDen" type="number" value="4" min="1" style="
            width:56px;padding:8px;border:1.5px solid #e5e7eb;
            border-radius:8px;font-size:18px;text-align:center;font-weight:700;
          " oninput="renderFraction()"/>

          <div style="text-align:center;">
            <div id="fracDecimal" style="font-size:13px;font-weight:700;color:#4f46e5;"></div>
            <div id="fracPct" style="font-size:12px;color:#6b7280;"></div>
          </div>
        </div>

        <!-- Visual bar -->
        <canvas id="fracCanvas" width="255" height="50"
          style="display:block;border-radius:8px;border:1px solid #e5e7eb;"></canvas>

        <!-- Пайыз bar -->
        <div style="margin-top:8px;background:#f3f4f6;border-radius:999px;height:8px;overflow:hidden;">
          <div id="fracBar" style="
            height:100%;background:linear-gradient(90deg,#ef4444,#f87171);
            width:25%;border-radius:999px;transition:width .3s;
          "></div>
        </div>

        <div style="font-size:10px;color:#9ca3af;text-align:center;margin-top:5px;">
          Бөлшек визуализациясы
        </div>
      </div>
    `,
    onMount: () => renderFraction(),
  });
}

window.renderFraction = function() {
  const num = parseInt(document.getElementById("fracNum")?.value) || 0;
  const den = parseInt(document.getElementById("fracDen")?.value) || 1;

  const pct = den > 0 ? (num / den) * 100 : 0;
  const dec = den > 0 ? Math.round((num / den) * 1000) / 1000 : 0;

  const decEl = document.getElementById("fracDecimal");
  const pctEl = document.getElementById("fracPct");
  const bar   = document.getElementById("fracBar");
  if (decEl) decEl.textContent = "= " + dec;
  if (pctEl) pctEl.textContent = Math.round(pct) + "%";
  if (bar)   bar.style.width   = Math.min(100, Math.max(0, pct)) + "%";

  // Canvas -- блок бар
  const cvs = document.getElementById("fracCanvas");
  if (!cvs || den <= 0) return;
  const ctx = cvs.getContext("2d");
  const W = cvs.width, H = cvs.height;
  ctx.clearRect(0, 0, W, H);

  const blockW = W / Math.min(den, 20);
  const filled = Math.min(num, den);
  const total  = Math.min(den, 20);

  for (let i = 0; i < total; i++) {
    const x = i * blockW;
    ctx.fillStyle = i < filled ? "#ef4444" : "#f3f4f6";
    ctx.fillRect(x + 1, 1, blockW - 2, H - 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 0, blockW, H);

    // Бөлінді
    if (total <= 12) {
      ctx.fillStyle = i < filled ? "white" : "#9ca3af";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i + 1, x + blockW / 2, H / 2);
    }
  }
};

// =====================================================
// ШАМ 13-20: Spin Wheel, Name Picker, Scoreboard,
// Timer, Student Voting, PDF Viewer, Kahoot, QR, Dark Mode
// =====================================================

// ══════════════════════════════════════════
// 🎡 SPIN THE WHEEL
// ══════════════════════════════════════════
function openSpinWheel() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  const wId = "widget-spinwheel";
  if (document.getElementById(wId)) {
    document.getElementById(wId).remove(); return;
  }

  const defaultItems = ["Айгерім","Болат","Дана","Ержан","Фарида","Ғалым","Нұрай","Тимур"];

  const w = createWidget({
    id: wId,
    title: "Spin the Wheel",
    icon: "🎡",
    color: "linear-gradient(135deg,#7c3aed,#c026d3)",
    width: 320,
    content: `
      <div style="text-align:center;">
        <canvas id="wheelCanvas" width="260" height="260"
          style="display:block;margin:0 auto 10px;cursor:pointer;border-radius:50%;"
          onclick="spinWheel()"></canvas>

        <div id="wheelResult" style="
          font-size:18px;font-weight:800;color:#7c3aed;
          min-height:28px;margin-bottom:10px;
        "></div>

        <button onclick="spinWheel()" id="spinBtn" style="
          width:100%;padding:11px;border:none;border-radius:12px;
          background:linear-gradient(135deg,#7c3aed,#c026d3);
          color:white;font-size:15px;font-weight:800;cursor:pointer;
          box-shadow:0 4px 14px rgba(124,58,237,0.35);
          transition:all .18s;margin-bottom:8px;
        ">🎡 Айналдыру!</button>

        <details style="text-align:left;">
          <summary style="font-size:11px;font-weight:700;color:#6b7280;cursor:pointer;margin-bottom:6px;">
            ✏️ Тізімді өзгерту
          </summary>
          <textarea id="wheelItems" style="
            width:100%;height:80px;padding:8px;
            border:1.5px solid #e5e7eb;border-radius:8px;
            font-size:12px;resize:none;font-family:inherit;
          " oninput="drawWheel()">${defaultItems.join("\n")}</textarea>
        </details>
      </div>
    `,
    onMount: () => {
      window._wheelAngle   = 0;
      window._wheelSpinning = false;
      drawWheel();
    }
  });
}

window.drawWheel = function() {
  const cvs = document.getElementById("wheelCanvas");
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  const W = cvs.width, H = cvs.height;
  const cx = W/2, cy = H/2, R = Math.min(W,H)/2 - 6;

  const raw   = document.getElementById("wheelItems")?.value || "";
  const items = raw.split("\n").map(s => s.trim()).filter(Boolean);
  if (!items.length) return;

  window._wheelItems = items;
  const n = items.length;
  const arc = (Math.PI * 2) / n;

  const COLORS = [
    "#ef4444","#f97316","#f59e0b","#22c55e",
    "#06b6d4","#4f46e5","#8b5cf6","#ec4899",
    "#10b981","#3b82f6","#a855f7","#f43f5e",
  ];

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < n; i++) {
    const start = (window._wheelAngle || 0) + i * arc - Math.PI/2;
    const end   = start + arc;

    // Сектор
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Мәтін
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.max(9, Math.min(13, 120/n))}px Inter, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 3;
    ctx.fillText(items[i].length > 10 ? items[i].slice(0,10)+"…" : items[i], R - 10, 4);
    ctx.restore();
  }

  // Орталық
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI*2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Жебе (жоғарыда)
  ctx.beginPath();
  ctx.moveTo(cx, cy - R + 2);
  ctx.lineTo(cx - 10, cy - R - 16);
  ctx.lineTo(cx + 10, cy - R - 16);
  ctx.closePath();
  ctx.fillStyle = "#1f2937";
  ctx.fill();
};

window.spinWheel = function() {
  if (window._wheelSpinning) return;
  window._wheelSpinning = true;
  const btn = document.getElementById("spinBtn");
  const res = document.getElementById("wheelResult");
  if (btn) btn.disabled = true;
  if (res) res.textContent = "⏳";

  const totalSpin = Math.PI * 2 * (8 + Math.random() * 10);
  const duration  = 4000;
  const start     = performance.now();
  const startAngle = window._wheelAngle || 0;

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    window._wheelAngle = startAngle + totalSpin * ease;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      window._wheelSpinning = false;
      if (btn) btn.disabled = false;

      // Нәтиже анықтау
      const items = window._wheelItems || [];
      const n     = items.length;
      const arc   = (Math.PI * 2) / n;
      const normalizedAngle = ((window._wheelAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const idx   = Math.floor(((Math.PI * 2 - normalizedAngle + Math.PI/2 + arc/2) % (Math.PI * 2)) / arc) % n;
      const winner = items[idx] || items[0];

      if (res) {
        res.textContent = "🎉 " + winner + "!";
        res.style.animation = "none";
        res.offsetHeight;
        res.style.animation = "card-in .3s ease";
      }
    }
  }
  requestAnimationFrame(animate);
};

// ══════════════════════════════════════════
// 🎯 NAME PICKER (Оқушы таңдау)
// ══════════════════════════════════════════
window.openNamePicker = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  createWidget({
    id: "widget-namepicker",
    title: "Оқушы таңдау",
    icon: "🎯",
    color: "linear-gradient(135deg,#0369a1,#0ea5e9)",
    width: 260,
    content: `
      <div style="text-align:center;">
        <div id="npResult" style="
          font-size:28px;font-weight:800;color:#0369a1;
          background:#f0f9ff;border-radius:14px;
          padding:14px;margin-bottom:10px;min-height:60px;
          display:flex;align-items:center;justify-content:center;
        ">?</div>

        <button onclick="pickName()" style="
          width:100%;padding:11px;border:none;border-radius:12px;
          background:linear-gradient(135deg,#0369a1,#0ea5e9);
          color:white;font-size:14px;font-weight:800;cursor:pointer;
          box-shadow:0 4px 12px rgba(3,105,161,0.3);
          margin-bottom:8px;transition:all .18s;
        ">🎯 Таңдау!</button>

        <details style="text-align:left;">
          <summary style="font-size:11px;font-weight:700;color:#6b7280;cursor:pointer;margin-bottom:5px;">
            ✏️ Оқушылар тізімі
          </summary>
          <textarea id="npNames" style="
            width:100%;height:80px;padding:8px;
            border:1.5px solid #e5e7eb;border-radius:8px;
            font-size:12px;resize:none;font-family:inherit;
          ">Айгерім
Болат
Дана
Ержан
Фарида
Ғалым
Нұрай
Тимур</textarea>
        </details>

        <div id="npHistory" style="
          margin-top:8px;display:flex;flex-wrap:wrap;
          gap:4px;min-height:20px;
        "></div>
      </div>
    `,
  });
  window._npPicked = [];
};

window.pickName = function() {
  const raw   = document.getElementById("npNames")?.value || "";
  const names = raw.split("\n").map(s => s.trim()).filter(Boolean);
  const res   = document.getElementById("npResult");
  const hist  = document.getElementById("npHistory");
  if (!names.length || !res) return;

  // Таңдалмағандарды алу
  const remaining = names.filter(n => !(window._npPicked || []).includes(n));
  const pool = remaining.length ? remaining : names;
  if (!remaining.length) window._npPicked = [];

  // Shuffle анимация
  let frames = 0;
  res.style.fontSize = "16px";
  const anim = setInterval(() => {
    const r = pool[Math.floor(Math.random() * pool.length)];
    res.textContent = r;
    frames++;
    if (frames > 12) {
      clearInterval(anim);
      const winner = pool[Math.floor(Math.random() * pool.length)];
      res.textContent = "🎉 " + winner;
      res.style.fontSize = "22px";
      res.style.color = "#7c3aed";

      window._npPicked = window._npPicked || [];
      window._npPicked.push(winner);

      if (hist) {
        const chip = document.createElement("span");
        chip.style.cssText = `
          background:#eef2ff;color:#4f46e5;
          font-size:10px;font-weight:700;
          padding:2px 7px;border-radius:999px;
        `;
        chip.textContent = winner;
        hist.appendChild(chip);
      }
    }
  }, 60);
};

// ══════════════════════════════════════════
// 🏆 SCOREBOARD
// ══════════════════════════════════════════
window.openScoreboard = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  createWidget({
    id: "widget-scoreboard",
    title: "Scoreboard",
    icon: "🏆",
    color: "linear-gradient(135deg,#b45309,#f59e0b)",
    width: 280,
    content: `
      <div>
        <!-- Команда қосу -->
        <div style="display:flex;gap:6px;margin-bottom:10px;">
          <input id="sbTeamName" placeholder="Команда атауы" style="
            flex:1;padding:7px 10px;border:1.5px solid #e5e7eb;
            border-radius:8px;font-size:13px;font-family:inherit;
          "/>
          <button onclick="sbAddTeam()" style="
            padding:7px 12px;border:none;border-radius:8px;
            background:#f59e0b;color:white;font-weight:700;
            font-size:13px;cursor:pointer;
          ">+</button>
        </div>

        <!-- Команда тізімі -->
        <div id="sbList" style="
          display:flex;flex-direction:column;gap:6px;
          max-height:280px;overflow-y:auto;
        ">
          <div style="text-align:center;color:#9ca3af;font-size:12px;padding:16px;">
            Команда қосыңыз
          </div>
        </div>

        <!-- Reset -->
        <button onclick="sbReset()" style="
          width:100%;margin-top:8px;padding:7px;border:none;border-radius:8px;
          background:#f3f4f6;color:#6b7280;font-size:12px;font-weight:700;
          cursor:pointer;border:1px solid #e5e7eb;
        ">↺ Нөлге қайтару</button>
      </div>
    `,
  });
  window._sbTeams = [];
};

window.sbAddTeam = function() {
  const inp  = document.getElementById("sbTeamName");
  const name = inp?.value.trim();
  if (!name) return;
  window._sbTeams = window._sbTeams || [];
  const COLORS = ["#ef4444","#4f46e5","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
  window._sbTeams.push({ name, score: 0, color: COLORS[window._sbTeams.length % COLORS.length] });
  if (inp) inp.value = "";
  sbRender();
};

window.sbChange = function(idx, delta) {
  if (!window._sbTeams?.[idx]) return;
  window._sbTeams[idx].score += delta;
  sbRender();
};

window.sbReset = function() {
  (window._sbTeams || []).forEach(t => t.score = 0);
  sbRender();
};

window.sbRemove = function(idx) {
  window._sbTeams?.splice(idx, 1);
  sbRender();
};

function sbRender() {
  const list = document.getElementById("sbList");
  if (!list) return;
  const teams = window._sbTeams || [];
  if (!teams.length) {
    list.innerHTML = `<div style="text-align:center;color:#9ca3af;font-size:12px;padding:16px;">Команда қосыңыз</div>`;
    return;
  }

  // Ұпай бойынша сорт
  const sorted = [...teams].sort((a,b) => b.score - a.score);

  list.innerHTML = sorted.map((t, rank) => {
    const origIdx = teams.indexOf(t);
    const medals  = ["🥇","🥈","🥉"];
    return `
      <div style="
        display:flex;align-items:center;gap:8px;
        background:${rank === 0 ? "#fef3c7" : "#f9fafb"};
        border:1.5px solid ${rank === 0 ? "#fbbf24" : "#e5e7eb"};
        border-radius:12px;padding:8px 10px;
      ">
        <span style="font-size:18px;">${medals[rank] || "🔵"}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:700;color:#111827;">${t.name}</div>
        </div>
        <div style="font-size:22px;font-weight:800;color:${t.color};min-width:36px;text-align:center;">
          ${t.score}
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <button onclick="sbChange(${origIdx},1)" style="
            width:26px;height:22px;border:none;border-radius:5px;
            background:#f0fdf4;color:#16a34a;font-size:14px;font-weight:800;
            cursor:pointer;line-height:1;
          ">+</button>
          <button onclick="sbChange(${origIdx},-1)" style="
            width:26px;height:22px;border:none;border-radius:5px;
            background:#fef2f2;color:#dc2626;font-size:14px;font-weight:800;
            cursor:pointer;line-height:1;
          ">-</button>
        </div>
        <button onclick="sbRemove(${origIdx})" style="
          width:22px;height:22px;border:none;border-radius:5px;
          background:transparent;color:#9ca3af;font-size:12px;cursor:pointer;
        ">✕</button>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════
// ⏱ TIMER WIDGET
// ══════════════════════════════════════════
window.openTimerWidget = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  createWidget({
    id: "widget-timer",
    title: "Таймер",
    icon: "⏱",
    color: "linear-gradient(135deg,#0f172a,#1e3a8a)",
    width: 220,
    content: `
      <div style="text-align:center;">
        <!-- Уақыт орнату -->
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:12px;">
          <input id="timerMin" type="number" value="5" min="0" max="99" style="
            width:56px;padding:8px;border:1.5px solid #e5e7eb;border-radius:8px;
            font-size:22px;font-weight:800;text-align:center;font-family:monospace;
          "/>
          <span style="font-size:22px;font-weight:800;color:#374151;">:</span>
          <input id="timerSec" type="number" value="0" min="0" max="59" style="
            width:56px;padding:8px;border:1.5px solid #e5e7eb;border-radius:8px;
            font-size:22px;font-weight:800;text-align:center;font-family:monospace;
          "/>
        </div>

        <!-- Дисплей -->
        <div id="timerDisplay" style="
          font-size:52px;font-weight:800;color:#0f172a;
          font-family:monospace;letter-spacing:.05em;
          background:#f0f2f8;border-radius:16px;
          padding:12px;margin-bottom:12px;
          transition:background .3s;
        ">05:00</div>

        <!-- Прогресс -->
        <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;margin-bottom:12px;">
          <div id="timerBar" style="
            height:100%;width:100%;
            background:linear-gradient(90deg,#22c55e,#f59e0b);
            border-radius:999px;transition:width .5s,background .5s;
          "></div>
        </div>

        <!-- Батырмалар -->
        <div style="display:flex;gap:6px;">
          <button id="timerStartBtn" onclick="timerToggle()" style="
            flex:1;padding:10px;border:none;border-radius:10px;
            background:linear-gradient(135deg,#059669,#10b981);
            color:white;font-size:14px;font-weight:700;cursor:pointer;
          ">▶ Бастау</button>
          <button onclick="timerReset()" style="
            padding:10px 14px;border:none;border-radius:10px;
            background:#f3f4f6;color:#374151;font-size:14px;cursor:pointer;
            border:1px solid #e5e7eb;
          ">↺</button>
        </div>
      </div>
    `,
  });
  window._timerInterval = null;
  window._timerRunning  = false;
  window._timerTotal    = 5 * 60;
  window._timerLeft     = 5 * 60;
};

window.timerToggle = function() {
  const btn = document.getElementById("timerStartBtn");
  if (window._timerRunning) {
    clearInterval(window._timerInterval);
    window._timerRunning = false;
    if (btn) { btn.textContent = "▶ Жалғастыру"; btn.style.background = "linear-gradient(135deg,#059669,#10b981)"; }
  } else {
    if (window._timerLeft <= 0) { timerReset(); return; }
    const m = parseInt(document.getElementById("timerMin")?.value || 5);
    const s = parseInt(document.getElementById("timerSec")?.value || 0);
    if (!window._timerStarted) {
      window._timerTotal = m * 60 + s;
      window._timerLeft  = window._timerTotal;
      window._timerStarted = true;
    }
    window._timerRunning = true;
    if (btn) { btn.textContent = "⏸ Тоқтату"; btn.style.background = "linear-gradient(135deg,#dc2626,#ef4444)"; }

    window._timerInterval = setInterval(() => {
      window._timerLeft--;
      timerUpdateDisplay();
      if (window._timerLeft <= 0) {
        clearInterval(window._timerInterval);
        window._timerRunning = false;
        const disp = document.getElementById("timerDisplay");
        if (disp) { disp.style.background = "#fef2f2"; disp.style.color = "#dc2626"; }
        if (btn) { btn.textContent = "⏰ Уақыт аяқталды!"; btn.style.background = "#fef2f2"; btn.style.color = "#dc2626"; }
      }
    }, 1000);
  }
};

function timerUpdateDisplay() {
  const disp = document.getElementById("timerDisplay");
  const bar  = document.getElementById("timerBar");
  const left = window._timerLeft || 0;
  const total = window._timerTotal || 1;
  const m = Math.floor(left / 60);
  const s = left % 60;
  if (disp) disp.textContent = String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
  const pct = (left / total) * 100;
  if (bar) {
    bar.style.width = pct + "%";
    bar.style.background = pct > 50 ? "linear-gradient(90deg,#22c55e,#86efac)"
      : pct > 20 ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
      : "linear-gradient(90deg,#ef4444,#f87171)";
  }
}

window.timerReset = function() {
  clearInterval(window._timerInterval);
  window._timerRunning  = false;
  window._timerStarted  = false;
  const m = parseInt(document.getElementById("timerMin")?.value || 5);
  const s = parseInt(document.getElementById("timerSec")?.value || 0);
  window._timerTotal = m * 60 + s;
  window._timerLeft  = window._timerTotal;
  timerUpdateDisplay();
  const btn  = document.getElementById("timerStartBtn");
  const disp = document.getElementById("timerDisplay");
  if (btn)  { btn.textContent = "▶ Бастау"; btn.style.background = "linear-gradient(135deg,#059669,#10b981)"; btn.style.color = "white"; }
  if (disp) { disp.style.background = "#f0f2f8"; disp.style.color = "#0f172a"; }
};

// ══════════════════════════════════════════
// 🗳 STUDENT VOTING
// ══════════════════════════════════════════
window.openStudentVoting = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  createWidget({
    id: "widget-voting",
    title: "Дауыс беру",
    icon: "🗳",
    color: "linear-gradient(135deg,#0f766e,#14b8a6)",
    width: 300,
    content: `
      <div>
        <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:8px;">
          Сұрақ:
        </div>
        <input id="voteQuestion" placeholder="Сұрақ жазыңыз..." style="
          width:100%;padding:8px 10px;border:1.5px solid #e5e7eb;
          border-radius:8px;font-size:13px;font-family:inherit;
          margin-bottom:8px;
        "/>

        <div id="voteOptions">
          <div style="display:flex;gap:5px;margin-bottom:5px;">
            <input placeholder="А нұсқасы" class="vote-opt" style="
              flex:1;padding:7px 9px;border:1.5px solid #e5e7eb;border-radius:7px;
              font-size:12px;font-family:inherit;
            "/>
          </div>
          <div style="display:flex;gap:5px;margin-bottom:5px;">
            <input placeholder="Б нұсқасы" class="vote-opt" style="
              flex:1;padding:7px 9px;border:1.5px solid #e5e7eb;border-radius:7px;
              font-size:12px;font-family:inherit;
            "/>
          </div>
          <div style="display:flex;gap:5px;margin-bottom:5px;">
            <input placeholder="В нұсқасы" class="vote-opt" style="
              flex:1;padding:7px 9px;border:1.5px solid #e5e7eb;border-radius:7px;
              font-size:12px;font-family:inherit;
            "/>
          </div>
          <div style="display:flex;gap:5px;margin-bottom:8px;">
            <input placeholder="Г нұсқасы" class="vote-opt" style="
              flex:1;padding:7px 9px;border:1.5px solid #e5e7eb;border-radius:7px;
              font-size:12px;font-family:inherit;
            "/>
          </div>
        </div>

        <button onclick="startVote()" style="
          width:100%;padding:10px;border:none;border-radius:10px;
          background:linear-gradient(135deg,#0f766e,#14b8a6);
          color:white;font-size:13px;font-weight:700;cursor:pointer;
          margin-bottom:6px;
        ">📡 Дауыс беруді бастау</button>

        <button id="publishVoteBtn" onclick="publishVoteResults()" style="
          width:100%;padding:9px;border:none;border-radius:10px;
          background:linear-gradient(135deg,#4f46e5,#818cf8);
          color:white;font-size:12px;font-weight:700;cursor:pointer;
          margin-bottom:10px;
        ">📊 Нәтижені оқушыларға жіберу</button>

        <div id="voteResults" style="display:none;">
          <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px;">НӘТИЖЕ:</div>
          <div id="voteResultBars"></div>
        </div>
      </div>
    `,
  });
  window._voteData = {};
};

window.startVote = function() {
  const question = document.getElementById("voteQuestion")?.value.trim() || "Сұрақ";
  const opts = Array.from(document.querySelectorAll(".vote-opt"))
    .map(i => i.value.trim()).filter(Boolean);
  if (!opts.length) return;

  window._voteData = {};
  opts.forEach(o => window._voteData[o] = 0);

  // Оқушыларға Firebase арқылы жіберу
  if (currentRoom && typeof ref !== "undefined" && typeof set !== "undefined") {
    set(ref(db, `rooms/${currentRoom}/vote`), {
      question, options: opts, active: true, time: Date.now()
    });

    // Нәтижені тыңдау
    onValue(ref(db, `rooms/${currentRoom}/voteAnswers`), (snap) => {
      const data = snap.val() || {};
      const counts = {};
      opts.forEach(o => counts[o] = 0);
      Object.values(data).forEach(v => { if (counts[v] !== undefined) counts[v]++; });
      window._voteData = counts;
      renderVoteResults(counts, opts);
    });
  }

  // Нәтиже панелін ашу
  const res = document.getElementById("voteResults");
  if (res) res.style.display = "block";
  renderVoteResults(window._voteData, opts);
};

// Дауыс нәтижесін оқушыларға жіберу (мұғалім батырмасы)
window.publishVoteResults = function() {
  if (!currentRoom) return;
  const question = document.getElementById("voteQuestion")?.value.trim() || "";
  const counts   = window._voteData || {};
  set(ref(db, `rooms/${currentRoom}/voteResults`), {
    show: true, question, counts, time: Date.now()
  });
  const btn = document.getElementById("publishVoteBtn");
  if (btn) { btn.textContent = "✅ Нәтиже жіберілді!"; btn.disabled = true; }
};

// Kahoot-та дұрыс жауапты жіберу (мұғалім)
window.revealKahootAnswer = function() {
  if (!currentRoom) return;
  const correct = document.getElementById("khCorrect")?.value || "A";
  set(ref(db, `rooms/${currentRoom}/kahootAnswer`), correct);
  const btn = document.getElementById("revealKahootBtn");
  if (btn) { btn.textContent = "✅ Жауап жіберілді!"; btn.disabled = true; }
};

function renderVoteResults(counts, opts) {
  const el = document.getElementById("voteResultBars");
  if (!el) return;
  const total = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
  const COLORS = ["#4f46e5","#10b981","#f59e0b","#ef4444"];

  el.innerHTML = opts.map((opt, i) => {
    const cnt = counts[opt] || 0;
    const pct = Math.round((cnt / total) * 100);
    return `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#374151;margin-bottom:3px;">
          <span>${opt}</span><span>${cnt} (${pct}%)</span>
        </div>
        <div style="background:#f3f4f6;border-radius:999px;height:10px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${COLORS[i%COLORS.length]};border-radius:999px;transition:width .5s;"></div>
        </div>
      </div>`;
  }).join("");
}

// ══════════════════════════════════════════
// 📄 PDF VIEWER
// ══════════════════════════════════════════
window.openPDFViewer = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  // File picker
  const input = document.createElement("input");
  input.type  = "file";
  input.accept = ".pdf";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    addBlock("trainer", url);
    // Status
    const statusEl = document.getElementById("cabinetStatus");
    if (statusEl) { statusEl.textContent = `✅ ${file.name} тақтаға қосылды!`; setTimeout(() => statusEl.textContent = "", 3000); }
  };
  input.click();
};

// ══════════════════════════════════════════
// 🎮 KAHOOT-STYLE ТЕСТ ЖАРЫСЫ
// ══════════════════════════════════════════
window.openKahoot = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  createWidget({
    id: "widget-kahoot",
    title: "Тест жарысы",
    icon: "🎮",
    color: "linear-gradient(135deg,#4338ca,#7c3aed)",
    width: 310,
    content: `
      <div id="kahootSetup">
        <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:6px;">Сұрақ:</div>
        <input id="khQuestion" placeholder="Сұрақ жазыңыз..." style="
          width:100%;padding:8px;border:1.5px solid #e5e7eb;border-radius:8px;
          font-size:13px;font-family:inherit;margin-bottom:8px;
        "/>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
          <input id="khA" placeholder="🔴 A нұсқасы" style="padding:7px 8px;border:1.5px solid #fecaca;border-radius:8px;font-size:12px;font-family:inherit;background:#fef2f2;"/>
          <input id="khB" placeholder="🔵 B нұсқасы" style="padding:7px 8px;border:1.5px solid #bfdbfe;border-radius:8px;font-size:12px;font-family:inherit;background:#eff6ff;"/>
          <input id="khC" placeholder="🟡 C нұсқасы" style="padding:7px 8px;border:1.5px solid #fde68a;border-radius:8px;font-size:12px;font-family:inherit;background:#fffbeb;"/>
          <input id="khD" placeholder="🟢 D нұсқасы" style="padding:7px 8px;border:1.5px solid #bbf7d0;border-radius:8px;font-size:12px;font-family:inherit;background:#f0fdf4;"/>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:12px;font-weight:700;color:#6b7280;">Дұрыс жауап:</span>
          <select id="khCorrect" style="padding:5px 8px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:12px;font-family:inherit;">
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
        <button onclick="launchKahoot()" style="
          width:100%;padding:11px;border:none;border-radius:12px;
          background:linear-gradient(135deg,#4338ca,#7c3aed);
          color:white;font-size:14px;font-weight:700;cursor:pointer;
          box-shadow:0 4px 14px rgba(67,56,202,0.35);
        ">🚀 Жарысты бастау!</button>
      </div>

      <div id="kahootLive" style="display:none;">
        <div id="khLiveQ" style="font-size:14px;font-weight:700;color:#1e1b4b;
          background:#eef2ff;border-radius:10px;padding:10px;margin-bottom:10px;text-align:center;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
          <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:10px;padding:8px;text-align:center;font-weight:700;font-size:13px;" id="khLiveA"></div>
          <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:10px;padding:8px;text-align:center;font-weight:700;font-size:13px;" id="khLiveB"></div>
          <div style="background:#fffbeb;border:2px solid #fde68a;border-radius:10px;padding:8px;text-align:center;font-weight:700;font-size:13px;" id="khLiveC"></div>
          <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:8px;text-align:center;font-weight:700;font-size:13px;" id="khLiveD"></div>
        </div>
        <div id="khAnswerCount" style="text-align:center;font-size:12px;color:#6b7280;margin-bottom:8px;">Жауаптар: 0</div>
        <button onclick="showKahootAnswer()" style="
          width:100%;padding:9px;border:none;border-radius:10px;
          background:#4338ca;color:white;font-size:13px;font-weight:700;cursor:pointer;
          margin-bottom:6px;
        ">✅ Тақтада дұрыс жауапты көрсету</button>

        <button id="revealKahootBtn" onclick="revealKahootAnswer()" style="
          width:100%;padding:9px;border:none;border-radius:10px;
          background:linear-gradient(135deg,#059669,#10b981);
          color:white;font-size:12px;font-weight:700;cursor:pointer;
          margin-bottom:6px;
        ">📱 Оқушыларға жіберу</button>
        <button onclick="document.getElementById('kahootSetup').style.display='block';document.getElementById('kahootLive').style.display='none';" style="
          width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:10px;
          background:#f9fafb;color:#374151;font-size:12px;font-weight:700;cursor:pointer;
        ">← Жаңа сұрақ</button>
      </div>
    `,
  });
};

window.launchKahoot = function() {
  const q = document.getElementById("khQuestion")?.value.trim() || "Сұрақ";
  const opts = {
    A: document.getElementById("khA")?.value || "A",
    B: document.getElementById("khB")?.value || "B",
    C: document.getElementById("khC")?.value || "C",
    D: document.getElementById("khD")?.value || "D",
  };
  window._khCorrect = document.getElementById("khCorrect")?.value || "A";

  document.getElementById("kahootSetup").style.display = "none";
  document.getElementById("kahootLive").style.display  = "block";

  document.getElementById("khLiveQ").textContent = q;
  document.getElementById("khLiveA").textContent = "🔴 " + opts.A;
  document.getElementById("khLiveB").textContent = "🔵 " + opts.B;
  document.getElementById("khLiveC").textContent = "🟡 " + opts.C;
  document.getElementById("khLiveD").textContent = "🟢 " + opts.D;

  // Firebase-ке жіберу
  if (currentRoom && typeof ref !== "undefined") {
    set(ref(db, `rooms/${currentRoom}/kahoot`), {
      question: q, options: opts, active: true, time: Date.now()
    });
    onValue(ref(db, `rooms/${currentRoom}/kahootAnswers`), (snap) => {
      const count = Object.keys(snap.val() || {}).length;
      const el = document.getElementById("khAnswerCount");
      if (el) el.textContent = `Жауаптар: ${count}`;
    });
  }
};

window.showKahootAnswer = function() {
  const correct = window._khCorrect;
  const ids = { A:"khLiveA", B:"khLiveB", C:"khLiveC", D:"khLiveD" };
  Object.entries(ids).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === correct) {
      el.style.background   = "#f0fdf4";
      el.style.borderColor  = "#22c55e";
      el.style.boxShadow    = "0 0 12px rgba(34,197,94,0.4)";
      el.style.fontSize     = "16px";
    } else {
      el.style.opacity = "0.4";
    }
  });
};

// ══════════════════════════════════════════
// 📱 QR CODE GENERATOR
// ══════════════════════════════════════════
window.openQRGenerator = function() {
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  createWidget({
    id: "widget-qrgen",
    title: "QR Генератор",
    icon: "📱",
    color: "linear-gradient(135deg,#0f172a,#1e293b)",
    width: 260,
    content: `
      <div style="text-align:center;">
        <input id="qrInput" type="text" placeholder="URL немесе мәтін жазыңыз..."
          value="https://smartboardai.vercel.app"
          oninput="generateQR()"
          style="
            width:100%;padding:9px 11px;border:1.5px solid #e5e7eb;
            border-radius:9px;font-size:12px;font-family:inherit;
            margin-bottom:10px;
          "/>
        <div id="qrOutput" style="
          display:flex;align-items:center;justify-content:center;
          min-height:160px;background:#f8f9ff;
          border-radius:12px;border:1px solid #e0e7ff;
          margin-bottom:10px;padding:10px;
        ">
          <div style="color:#9ca3af;font-size:12px;">QR код осында шығады</div>
        </div>
        <button onclick="downloadQR()" style="
          width:100%;padding:9px;border:none;border-radius:10px;
          background:linear-gradient(135deg,#0f172a,#334155);
          color:white;font-size:12px;font-weight:700;cursor:pointer;
        ">📥 QR жүктеу</button>
      </div>
    `,
    onMount: () => generateQR(),
  });
};

window.generateQR = function() {
  const val = document.getElementById("qrInput")?.value.trim();
  const out = document.getElementById("qrOutput");
  if (!val || !out) return;

  out.innerHTML = "";
  try {
    new QRCode(out, {
      text: val,
      width:  150,
      height: 150,
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch(e) {
    out.innerHTML = `<div style="color:#ef4444;font-size:12px;">QRCode.js жүктелмеген</div>`;
  }
};

window.downloadQR = function() {
  const canvas = document.querySelector("#qrOutput canvas");
  if (!canvas) return;
  const a = document.createElement("a");
  a.href     = canvas.toDataURL("image/png");
  a.download = "smartboard-qr.png";
  a.click();
};

// ══════════════════════════════════════════
// 🌙 DARK MODE
// ══════════════════════════════════════════
let darkMode = false;

window.toggleDarkMode = function() {
  darkMode = !darkMode;
  miniDropOpen = false;
  const drop = document.getElementById("miniToolsDropdown");
  if (drop) drop.style.display = "none";

  const icon  = document.getElementById("darkModeIcon");
  const label = document.getElementById("darkModeLabel");

  if (darkMode) {
    document.documentElement.style.setProperty("--primary-light","#1e1b4b");
    document.documentElement.style.setProperty("--bg","#0f172a");
    document.documentElement.style.setProperty("--bg2","#1e293b");
    document.documentElement.style.setProperty("--white","#1e293b");
    document.documentElement.style.setProperty("--border","#334155");
    document.documentElement.style.setProperty("--border2","#1e293b");
    document.documentElement.style.setProperty("--text-1","#f1f5f9");
    document.documentElement.style.setProperty("--text-2","#cbd5e1");
    document.documentElement.style.setProperty("--text-3","#94a3b8");
    document.documentElement.style.setProperty("--text-4","#64748b");
    document.body.style.background = "#0f172a";
    if (icon)  icon.textContent  = "☀️";
    if (label) label.textContent = "Жарық тема";
  } else {
    document.documentElement.style.setProperty("--primary-light","#eef2ff");
    document.documentElement.style.setProperty("--bg","#f0f2f8");
    document.documentElement.style.setProperty("--bg2","#f8f9fc");
    document.documentElement.style.setProperty("--white","#ffffff");
    document.documentElement.style.setProperty("--border","#e2e6f0");
    document.documentElement.style.setProperty("--border2","#edf0f7");
    document.documentElement.style.setProperty("--text-1","#0f172a");
    document.documentElement.style.setProperty("--text-2","#334155");
    document.documentElement.style.setProperty("--text-3","#64748b");
    document.documentElement.style.setProperty("--text-4","#94a3b8");
    document.body.style.background = "";
    if (icon)  icon.textContent  = "🌙";
    if (label) label.textContent = "Қараңғы тема";
  }
};
// openSpinWheel -- teacher.js-тегі Spin the Wheel виджетін ашу
window.openSpinWheel = function() {
  // Егер miniTools dropdown арқылы ашылса
  const existing = document.getElementById('miniTool-spinwheel');
  if (existing) { existing.style.display = 'block'; return; }
  // Немесе openMiniTool арқылы
  if (typeof window.openMiniTool === 'function') {
    window.openMiniTool('spin');
  }
};


window.drawSpinWheel = function() {
  const cvs = document.getElementById('swCanvas');
  if (!cvs) return;
  const ctx = cvs.getContext('2d'), W=260, cx=130, cy=130, R=122;
  const items = (document.getElementById('swItems')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
  window._swItems = items;
  if (!items.length) return;
  const n=items.length, arc=Math.PI*2/n;
  const C=['#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#4f46e5','#8b5cf6','#ec4899'];
  ctx.clearRect(0,0,W,W);
  for(let i=0;i<n;i++){
    const s=(window._swAngle||0)+i*arc-Math.PI/2, e=s+arc;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,s,e);ctx.closePath();
    ctx.fillStyle=C[i%C.length];ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(s+arc/2);ctx.textAlign='right';
    ctx.fillStyle='white';ctx.font=`bold ${Math.max(9,Math.min(13,110/n))}px Inter,sans-serif`;
    ctx.fillText(items[i].length>10?items[i].slice(0,10)+'…':items[i],R-10,4);ctx.restore();
  }
  ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy-R+2);ctx.lineTo(cx-9,cy-R-14);ctx.lineTo(cx+9,cy-R-14);ctx.closePath();ctx.fillStyle='#1f2937';ctx.fill();
};

window.doSpinWheel = function() {
  if(window._swSpinning) return; window._swSpinning=true;
  const tot=Math.PI*2*(8+Math.random()*10), dur=4000, st=performance.now(), sa=window._swAngle||0;
  function anim(now){
    const p=Math.min((now-st)/dur,1), ease=1-Math.pow(1-p,4);
    window._swAngle=sa+tot*ease; drawSpinWheel();
    if(p<1){requestAnimationFrame(anim);}
    else{
      window._swSpinning=false;
      const items=window._swItems||[], n=items.length, arc=Math.PI*2/n;
      const na=((window._swAngle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
      const idx=Math.floor(((Math.PI*2-na+Math.PI/2+arc/2)%(Math.PI*2))/arc)%n;
      const r=document.getElementById('swResult');
      if(r) r.textContent='🎉 '+items[idx]+'!';
    }
  }
  requestAnimationFrame(anim);
};
// openSpinWheel -- Spin the Wheel
window.openSpinWheel = function() {
  const existId = 'wSpinWheel';
  if (document.getElementById(existId)) {
    document.getElementById(existId).style.zIndex = 600;
    return;
  }
  const el = document.createElement('div');
  el.id = existId;
  el.style.cssText = [
    'position:fixed;top:80px;right:20px;z-index:500;',
    'background:white;border-radius:18px;',
    'box-shadow:0 10px 36px rgba(15,23,42,0.18);',
    'width:300px;overflow:hidden;'
  ].join('');

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#c026d3);padding:9px 12px;display:flex;align-items:center;justify-content:space-between;cursor:move;';
  const lbl = document.createElement('span');
  lbl.style.cssText = 'color:white;font-size:13px;font-weight:700;';
  lbl.textContent = '🎡 Spin the Wheel';
  const cls = document.createElement('button');
  cls.style.cssText = 'background:rgba(255,255,255,0.2);color:white;border:none;border-radius:6px;width:22px;height:22px;font-size:13px;cursor:pointer;';
  cls.textContent = '✕';
  cls.onclick = () => el.remove();
  hdr.appendChild(lbl);
  hdr.appendChild(cls);

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'padding:14px;text-align:center;';

  const cvs = document.createElement('canvas');
  cvs.id = 'swCvs'; cvs.width = 260; cvs.height = 260;
  cvs.style.cssText = 'border-radius:50%;cursor:pointer;display:block;margin:0 auto;';
  cvs.onclick = () => window.doSpinW();

  const res = document.createElement('div');
  res.id = 'swRes';
  res.style.cssText = 'font-size:18px;font-weight:800;color:#7c3aed;min-height:26px;margin:10px 0;';

  const spinBtn = document.createElement('button');
  spinBtn.style.cssText = 'width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:white;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:8px;';
  spinBtn.textContent = '🎡 Айналдыру!';
  spinBtn.onclick = () => window.doSpinW();

  const det = document.createElement('details');
  const sum = document.createElement('summary');
  sum.style.cssText = 'font-size:11px;color:#64748b;cursor:pointer;margin-bottom:5px;';
  sum.textContent = '✏️ Тізімді өзгерту';
  const ta = document.createElement('textarea');
  ta.id = 'swItems'; ta.rows = 5;
  ta.style.cssText = 'width:100%;padding:8px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;resize:none;font-family:inherit;';
  ta.value = 'Оқушы 1\nОқушы 2\nОқушы 3\nОқушы 4\nОқушы 5';
  ta.oninput = () => window.drawSpinW();
  det.appendChild(sum); det.appendChild(ta);

  body.appendChild(cvs); body.appendChild(res);
  body.appendChild(spinBtn); body.appendChild(det);
  el.appendChild(hdr); el.appendChild(body);
  document.body.appendChild(el);

  // Drag
  hdr.addEventListener('mousedown', (e) => {
    const ox = e.clientX - el.offsetLeft, oy = e.clientY - el.offsetTop;
    const mm = (e2) => { el.style.left=(e2.clientX-ox)+'px'; el.style.top=(e2.clientY-oy)+'px'; };
    const mu = () => { document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); };
    document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
  });

  window._swAngle = 0; window._swSpinning = false;
  window.drawSpinW();
};

window.drawSpinW = function() {
  const cvs = document.getElementById('swCvs');
  if (!cvs) return;
  const ctx = cvs.getContext('2d'), cx=130, cy=130, R=122;
  const ta = document.getElementById('swItems');
  const items = ta ? ta.value.split('\n').map(s=>s.trim()).filter(Boolean) : ['A','B','C'];
  window._swItems = items;
  const n = items.length, arc = Math.PI*2/n;
  const C = ['#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#4f46e5','#8b5cf6','#ec4899'];
  ctx.clearRect(0,0,260,260);
  for (let i=0;i<n;i++) {
    const s=(window._swAngle||0)+i*arc-Math.PI/2, e=s+arc;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,s,e);ctx.closePath();
    ctx.fillStyle=C[i%C.length];ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(s+arc/2);ctx.textAlign='right';
    ctx.fillStyle='white';
    ctx.font='bold '+Math.max(9,Math.min(13,110/n))+'px Inter,sans-serif';
    const txt = items[i].length>10 ? items[i].slice(0,10)+'…' : items[i];
    ctx.fillText(txt,R-10,4);ctx.restore();
  }
  ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle='white';ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy-R+2);ctx.lineTo(cx-9,cy-R-14);ctx.lineTo(cx+9,cy-R-14);
  ctx.closePath();ctx.fillStyle='#1f2937';ctx.fill();
};

window.doSpinW = function() {
  if (window._swSpinning) return;
  window._swSpinning = true;
  const tot = Math.PI*2*(8+Math.random()*10);
  const dur = 4000, st = performance.now(), sa = window._swAngle||0;
  function anim(now) {
    const p = Math.min((now-st)/dur, 1);
    const ease = 1-Math.pow(1-p, 4);
    window._swAngle = sa+tot*ease;
    window.drawSpinW();
    if (p < 1) { requestAnimationFrame(anim); return; }
    window._swSpinning = false;
    const items = window._swItems||[], n=items.length;
    if (!n) return;
    const arc = Math.PI*2/n;
    const na = ((window._swAngle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    const idx = Math.floor(((Math.PI*2-na+Math.PI/2+arc/2)%(Math.PI*2))/arc)%n;
    const r = document.getElementById('swRes');
    if (r) r.textContent = '🎉 '+items[idx]+'!';
  }
  requestAnimationFrame(anim);
};

// =====================================================
// ШАМ 23: COLLABORATIVE BOARD -- нақты уақыт Firebase
// Оқушылар тақтаға жазады, мұғалім экранда көреді
// =====================================================

let collabOn = false;
let collabListener = null;

window.openCollabBoard = function() {
  if (document.getElementById("collabModal")) {
    document.getElementById("collabModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "collabModal";
  modal.style.cssText = `
    display:flex;position:fixed;inset:0;
    background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);
    z-index:400;align-items:center;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:22px;
      width:min(900px,96vw);max-height:90vh;
      display:flex;flex-direction:column;
      box-shadow:0 24px 64px rgba(15,23,42,0.2);overflow:hidden;
    ">
      <!-- Header -->
      <div style="
        background:linear-gradient(135deg,#0f172a,#1e3a8a,#4f46e5);
        padding:14px 20px;display:flex;align-items:center;justify-content:space-between;
      ">
        <div>
          <div style="font-size:16px;font-weight:800;color:white;">
            🖊 Collaborative Board
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">
            Оқушылар нақты уақытта жазады -- сіз экраннан көресіз
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="collabStatus" style="
            background:rgba(255,255,255,0.15);
            color:white;font-size:12px;font-weight:700;
            padding:5px 12px;border-radius:999px;
            border:1px solid rgba(255,255,255,0.25);
          ">● Жабық</div>
          <button onclick="toggleCollab()" id="collabToggleBtn" style="
            background:linear-gradient(135deg,#10b981,#059669);
            color:white;border:none;border-radius:10px;
            padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;
          ">🟢 Ашу</button>
          <button onclick="clearCollabBoard()" style="
            background:rgba(255,255,255,0.15);color:white;
            border:1px solid rgba(255,255,255,0.25);
            border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;
          ">🗑 Тазалау</button>
          <button onclick="addCollabToBoard()" style="
            background:rgba(255,255,255,0.15);color:white;
            border:1px solid rgba(255,255,255,0.25);
            border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;
          ">📌 Тақтаға қосу</button>
          <button onclick="document.getElementById('collabModal').style.display='none'" style="
            background:rgba(239,68,68,0.3);color:white;
            border:1px solid rgba(239,68,68,0.4);
            border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;
          ">✕ Жабу</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div style="
        padding:10px 16px;background:#f8f9ff;
        border-bottom:1px solid #e2e6f0;
        display:flex;align-items:center;gap:12px;flex-wrap:wrap;
      ">
        <span style="font-size:12px;font-weight:700;color:#64748b;">Сұрыптау:</span>
        <button onclick="collabFilter('all')" class="cf-btn active" data-f="all" style="
          padding:5px 12px;border-radius:999px;border:1.5px solid #c7d2fe;
          background:#eef2ff;color:#4f46e5;font-size:12px;font-weight:700;cursor:pointer;
        ">Барлығы</button>
        <button onclick="collabFilter('recent')" class="cf-btn" data-f="recent" style="
          padding:5px 12px;border-radius:999px;border:1.5px solid #e2e6f0;
          background:#f9fafb;color:#374151;font-size:12px;font-weight:700;cursor:pointer;
        ">Соңғы</button>
        <button onclick="collabFilter('student')" class="cf-btn" data-f="student" style="
          padding:5px 12px;border-radius:999px;border:1.5px solid #e2e6f0;
          background:#f9fafb;color:#374151;font-size:12px;font-weight:700;cursor:pointer;
        ">Оқушыға сорт</button>
        <span id="collabCount" style="
          margin-left:auto;font-size:12px;font-weight:700;color:#64748b;
        ">0 жазба</span>
      </div>

      <!-- Board -->
      <div id="collabBoard" style="
        flex:1;overflow-y:auto;padding:16px;
        display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;
        background:#f0f2f8;min-height:300px;
      ">
        <div id="collabEmpty" style="
          grid-column:1/-1;text-align:center;padding:60px 20px;color:#94a3b8;
        ">
          <div style="font-size:48px;margin-bottom:10px;">🖊</div>
          <div style="font-size:14px;font-weight:600;">Collaborative Board ашыңыз -- оқушылар жаза бастайды</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  window._collabNotes = {};
  startCollabListener();
};

// ── Ашу / Жабу ─────────────────────────────────────
window.toggleCollab = function() {
  collabOn = !collabOn;
  if (!currentRoom) { showToast("⚠️ Алдымен бөлме ашыңыз!", "warn"); collabOn = false; return; }

  set(ref(db, `rooms/${currentRoom}/collab/active`), collabOn);

  const btn    = document.getElementById("collabToggleBtn");
  const status = document.getElementById("collabStatus");
  if (btn) {
    btn.textContent = collabOn ? "🔴 Жабу" : "🟢 Ашу";
    btn.style.background = collabOn
      ? "linear-gradient(135deg,#ef4444,#dc2626)"
      : "linear-gradient(135deg,#10b981,#059669)";
  }
  if (status) {
    status.textContent = collabOn ? "● Ашық -- оқушылар жазуда" : "● Жабық";
    status.style.background = collabOn
      ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.15)";
  }
};

// ── Firebase тыңдаушы ───────────────────────────────
function startCollabListener() {
  if (!currentRoom) return;
  if (collabListener) collabListener();

  collabListener = onValue(ref(db, `rooms/${currentRoom}/collab/notes`), (snap) => {
    window._collabNotes = snap.val() || {};
    renderCollabBoard(window._collabNotes, window._collabCurrentFilter || "all");
  });
}

// ── Рендер ─────────────────────────────────────────
function renderCollabBoard(notes, filter) {
  const board = document.getElementById("collabBoard");
  const empty = document.getElementById("collabEmpty");
  const count = document.getElementById("collabCount");
  if (!board) return;

  let entries = Object.entries(notes);

  if (filter === "recent") {
    entries.sort((a,b) => (b[1].time||0) - (a[1].time||0));
    entries = entries.slice(0, 20);
  } else if (filter === "student") {
    entries.sort((a,b) => (a[1].name||"").localeCompare(b[1].name||""));
  } else {
    entries.sort((a,b) => (a[1].time||0) - (b[1].time||0));
  }

  if (count) count.textContent = entries.length + " жазба";

  if (!entries.length) {
    if (empty) empty.style.display = "block";
    const existing = board.querySelectorAll(".collab-note");
    existing.forEach(el => el.remove());
    return;
  }
  if (empty) empty.style.display = "none";

  // Existing note-тарды тексеру (тек жаңаларды қосу)
  const existingIds = new Set([...board.querySelectorAll(".collab-note")].map(el => el.dataset.id));
  const newIds = new Set(entries.map(([id]) => id));

  // Жойылғандарды алып тастау
  board.querySelectorAll(".collab-note").forEach(el => {
    if (!newIds.has(el.dataset.id)) el.remove();
  });

  const COLORS = [
    {bg:"#fef08a",bd:"#facc15",tx:"#713f12"},
    {bg:"#bbf7d0",bd:"#4ade80",tx:"#14532d"},
    {bg:"#bfdbfe",bd:"#60a5fa",tx:"#1e3a8a"},
    {bg:"#fca5a5",bd:"#f87171",tx:"#7f1d1d"},
    {bg:"#e9d5ff",bd:"#c084fc",tx:"#581c87"},
    {bg:"#fed7aa",bd:"#fb923c",tx:"#7c2d12"},
  ];

  entries.forEach(([id, note], i) => {
    if (existingIds.has(id)) {
      // Мәтінді жаңарту
      const existing = board.querySelector(`[data-id="${id}"]`);
      if (existing) {
        const textEl = existing.querySelector(".cn-text");
        if (textEl && textEl.textContent !== (note.text||"")) {
          textEl.textContent = note.text || "";
          existing.style.animation = "card-in .3s ease";
        }
      }
      return;
    }

    const c = COLORS[i % COLORS.length];
    const card = document.createElement("div");
    card.className = "collab-note";
    card.dataset.id = id;
    card.style.cssText = `
      background:${c.bg};border:1.5px solid ${c.bd};
      border-radius:14px;padding:12px;
      box-shadow:2px 3px 10px rgba(0,0,0,0.08);
      animation:card-in .3s ease;
      display:flex;flex-direction:column;gap:6px;
      min-height:100px;position:relative;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;border-bottom:1px solid ${c.bd};padding-bottom:6px;margin-bottom:4px;">
        <span style="font-size:18px;">${note.avatar||"🙂"}</span>
        <span style="font-size:11px;font-weight:700;color:${c.tx};">${escapeHtml(note.name||"Оқушы")}</span>
        <span style="font-size:10px;color:${c.tx};opacity:.6;margin-left:auto;">
          ${note.time ? new Date(note.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"}) : ""}
        </span>
      </div>
      <div class="cn-text" style="
        font-size:14px;line-height:1.5;color:${c.tx};
        flex:1;word-break:break-word;white-space:pre-wrap;
      ">${note.text||""}</div>
      <button onclick="deleteCollabNote('${id}')" style="
        position:absolute;top:6px;right:8px;
        background:transparent;border:none;cursor:pointer;
        color:${c.tx};opacity:.4;font-size:14px;
      " title="Жою">✕</button>
    `;
    board.appendChild(card);
  });
}

// ── Фильтр ─────────────────────────────────────────
window.collabFilter = function(filter) {
  window._collabCurrentFilter = filter;
  document.querySelectorAll(".cf-btn").forEach(b => {
    b.style.borderColor = b.dataset.f === filter ? "#c7d2fe" : "#e2e6f0";
    b.style.background  = b.dataset.f === filter ? "#eef2ff" : "#f9fafb";
    b.style.color       = b.dataset.f === filter ? "#4f46e5" : "#374151";
  });
  renderCollabBoard(window._collabNotes || {}, filter);
};

// ── Жою ─────────────────────────────────────────────
window.deleteCollabNote = function(id) {
  if (!currentRoom) return;
  set(ref(db, `rooms/${currentRoom}/collab/notes/${id}`), null);
};

// ── Тазалау ─────────────────────────────────────────
window.clearCollabBoard = function() {
  if (!currentRoom) return;
  if (!confirm("Барлық жазбаларды жоясыз ба?")) return;
  set(ref(db, `rooms/${currentRoom}/collab/notes`), null);
};

// ── Тақтаға блок ретінде қосу ──────────────────────
window.addCollabToBoard = function() {
  const notes = window._collabNotes || {};
  const entries = Object.values(notes).sort((a,b)=>(a.time||0)-(b.time||0));
  if (!entries.length) { showToast("⚠️ Жазба жоқ!", "warn"); return; }

  const content = entries.map(n =>
    `<div style="background:#f8f9fc;border-radius:10px;padding:10px 12px;margin-bottom:8px;border-left:3px solid #4f46e5;">
      <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;">${n.avatar||"🙂"} ${n.name||"Оқушы"}</div>
      <div style="font-size:14px;color:#334155;">${n.text||""}</div>
    </div>`
  ).join("");

  addBlock("ai", content);
  document.getElementById("collabModal").style.display = "none";
};

// =====================================================
// ШАМ 24: HOMEWORK MODULE -- Үй тапсырмасы
// Мұғалім жібереді → Firebase → Оқушы телефонда алады
// =====================================================

window.openHomeworkPanel = function() {
  if (document.getElementById("hwModal")) {
    document.getElementById("hwModal").style.display = "flex";
    loadHomeworkList();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "hwModal";
  modal.style.cssText = `
    display:flex;position:fixed;inset:0;
    background:rgba(15,23,42,0.6);backdrop-filter:blur(6px);
    z-index:400;align-items:center;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff;border-radius:22px;
      width:min(820px,96vw);max-height:90vh;
      display:flex;flex-direction:column;
      box-shadow:0 24px 64px rgba(15,23,42,0.2);overflow:hidden;
    ">
      <!-- Header -->
      <div style="
        background:linear-gradient(135deg,#7c2d12,#ea580c,#f97316);
        padding:14px 20px;display:flex;align-items:center;justify-content:space-between;
      ">
        <div>
          <div style="font-size:16px;font-weight:800;color:white;">📚 Үй тапсырмасы модулі</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">
            Тапсырма жіберу → оқушылар телефонда автоматты алады
          </div>
        </div>
        <button onclick="document.getElementById('hwModal').style.display='none'" style="
          background:rgba(255,255,255,0.2);color:white;border:none;
          border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;
        ">✕ Жабу</button>
      </div>

      <div style="display:flex;flex:1;overflow:hidden;">

        <!-- LEFT: Жіберу формасы -->
        <div style="
          width:320px;flex-shrink:0;padding:16px;
          border-right:1px solid #e2e6f0;overflow-y:auto;
          background:#fafbff;
        ">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;
            text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">
            Жаңа тапсырма
          </div>

          <!-- Тақырып -->
          <div style="margin-bottom:10px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">
              Тақырып
            </label>
            <input id="hwSubject" type="text" placeholder="Мысалы: Математика, 7-сынып"
              style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;
              font-size:13px;font-family:inherit;background:#fff;"/>
          </div>

          <!-- Тапсырма мәтіні -->
          <div style="margin-bottom:10px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">
              Тапсырма
            </label>
            <textarea id="hwText" rows="5" placeholder="Тапсырма мәтінін жазыңыз..."
              style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;
              font-size:13px;font-family:inherit;resize:vertical;background:#fff;"></textarea>
          </div>

          <!-- Мерзімі -->
          <div style="margin-bottom:10px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">
              Орындау мерзімі
            </label>
            <input id="hwDeadline" type="date"
              style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;
              font-size:13px;font-family:inherit;background:#fff;cursor:pointer;"/>
          </div>

          <!-- Маңыздылық -->
          <div style="margin-bottom:14px;">
            <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">
              Маңыздылық
            </label>
            <div style="display:flex;gap:6px;">
              ${[["normal","🟢 Жай","#f0fdf4","#16a34a"],
                 ["important","🟡 Маңызды","#fef3c7","#d97706"],
                 ["urgent","🔴 Шұғыл","#fef2f2","#dc2626"]].map(([v,l,bg,c]) =>
                `<button class="hw-priority-btn" data-p="${v}" onclick="setHWPriority('${v}')"
                  style="flex:1;padding:7px 4px;border-radius:8px;font-size:11px;font-weight:700;
                  cursor:pointer;border:1.5px solid ${v==='normal'?c:'#e2e6f0'};
                  background:${v==='normal'?bg:'#f9fafb'};color:${v==='normal'?c:'#374151'};">
                  ${l}
                </button>`
              ).join("")}
            </div>
          </div>

          <!-- Жіберу батырмасы -->
          <button onclick="sendHomework()" style="
            width:100%;padding:12px;border:none;border-radius:12px;
            background:linear-gradient(135deg,#ea580c,#f97316);
            color:white;font-size:14px;font-weight:800;cursor:pointer;
            box-shadow:0 4px 14px rgba(234,88,12,0.3);font-family:inherit;
          ">📤 Оқушыларға жіберу</button>

          <div id="hwSendStatus" style="
            margin-top:8px;font-size:12px;font-weight:600;
            text-align:center;min-height:18px;
          "></div>
        </div>

        <!-- RIGHT: Тапсырмалар тізімі -->
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
          <!-- Filter tabs -->
          <div style="
            display:flex;border-bottom:1px solid #e2e6f0;
            padding:0 16px;background:#fff;
          ">
            ${[["all","Барлығы"],["active","Белсенді"],["done","Аяқталған"]].map(([v,l]) =>
              `<button class="hw-filter-btn" data-f="${v}" onclick="filterHW('${v}')"
                style="padding:11px 16px;border:none;background:transparent;
                font-size:13px;font-weight:${v==='all'?'700':'600'};cursor:pointer;
                color:${v==='all'?'#4f46e5':'#64748b'};
                border-bottom:2px solid ${v==='all'?'#4f46e5':'transparent'};
                font-family:inherit;">${l}</button>`
            ).join("")}
            <span id="hwTotalCount" style="margin-left:auto;font-size:12px;
              color:#64748b;display:flex;align-items:center;">0 тапсырма</span>
          </div>

          <!-- List -->
          <div id="hwList" style="flex:1;overflow-y:auto;padding:14px;">
            <div id="hwListEmpty" style="
              text-align:center;padding:60px 20px;color:#94a3b8;
            ">
              <div style="font-size:48px;margin-bottom:10px;">📚</div>
              <div style="font-size:14px;font-weight:600;">Тапсырмалар жоқ</div>
              <div style="font-size:12px;margin-top:4px;">Жаңа тапсырма жіберіңіз</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Мерзімді бүгін + 1 күн ретінде орнату
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById("hwDeadline").value = tomorrow.toISOString().split("T")[0];

  window._hwPriority = "normal";
  window._hwFilter   = "all";
  loadHomeworkList();
};

// ── Маңыздылық ─────────────────────────────────────
window.setHWPriority = function(p) {
  window._hwPriority = p;
  const colors = {
    normal:    ["#f0fdf4","#16a34a"],
    important: ["#fef3c7","#d97706"],
    urgent:    ["#fef2f2","#dc2626"],
  };
  document.querySelectorAll(".hw-priority-btn").forEach(btn => {
    const [bg, c] = btn.dataset.p === p ? colors[p] : ["#f9fafb","#374151"];
    btn.style.background   = bg;
    btn.style.color        = c;
    btn.style.borderColor  = btn.dataset.p === p ? c : "#e2e6f0";
  });
};

// ── Жіберу ─────────────────────────────────────────
window.sendHomework = async function() {
  if (!currentRoom) { showToast("⚠️ Алдымен бөлме ашыңыз!", "warn"); return; }
  const subject  = document.getElementById("hwSubject")?.value.trim() || "";
  const text     = document.getElementById("hwText")?.value.trim() || "";
  const deadline = document.getElementById("hwDeadline")?.value || "";
  const priority = window._hwPriority || "normal";
  const status   = document.getElementById("hwSendStatus");

  if (!subject) { if (status) { status.textContent = "❗ Тақырып жазыңыз!"; status.style.color = "#dc2626"; } return; }
  if (!text)    { if (status) { status.textContent = "❗ Тапсырма жазыңыз!"; status.style.color = "#dc2626"; } return; }

  if (status) { status.textContent = "⏳ Жіберіліп жатыр..."; status.style.color = "#f59e0b"; }

  try {
    const hwRef = push(ref(db, `rooms/${currentRoom}/homework`));
    await set(hwRef, {
      subject, text, deadline, priority,
      id: hwRef.key,
      time: Date.now(),
      doneBy: {},
    });

    // Формаларды тазалау
    document.getElementById("hwSubject").value = "";
    document.getElementById("hwText").value    = "";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById("hwDeadline").value = tomorrow.toISOString().split("T")[0];

    if (status) { status.textContent = "✅ Тапсырма жіберілді!"; status.style.color = "#10b981"; }
    setTimeout(() => { if (status) status.textContent = ""; }, 3000);
  } catch(e) {
    if (status) { status.textContent = "❌ Қате: " + e.message; status.style.color = "#dc2626"; }
  }
};

// ── Тізім жүктеу ────────────────────────────────────
function loadHomeworkList() {
  if (!currentRoom) return;
  onValue(ref(db, `rooms/${currentRoom}/homework`), (snap) => {
    const data = snap.val() || {};
    window._hwData = data;
    renderHomeworkList(data, window._hwFilter || "all");
  });
}

function renderHomeworkList(data, filter) {
  const list    = document.getElementById("hwList");
  const empty   = document.getElementById("hwListEmpty");
  const counter = document.getElementById("hwTotalCount");
  if (!list) return;

  let entries = Object.entries(data).sort((a,b) => (b[1].time||0) - (a[1].time||0));

  if (filter === "active") {
    entries = entries.filter(([,hw]) => {
      if (!hw.deadline) return true;
      return new Date(hw.deadline) >= new Date();
    });
  } else if (filter === "done") {
    entries = entries.filter(([,hw]) => {
      if (!hw.deadline) return false;
      return new Date(hw.deadline) < new Date();
    });
  }

  if (counter) counter.textContent = entries.length + " тапсырма";

  if (!entries.length) {
    if (empty) empty.style.display = "block";
    list.querySelectorAll(".hw-card").forEach(el => el.remove());
    return;
  }
  if (empty) empty.style.display = "none";

  list.querySelectorAll(".hw-card").forEach(el => el.remove());

  const PRIORITY_STYLES = {
    normal:    { icon:"🟢", bg:"#f0fdf4", bd:"#86efac", label:"Жай" },
    important: { icon:"🟡", bg:"#fef3c7", bd:"#fde68a", label:"Маңызды" },
    urgent:    { icon:"🔴", bg:"#fef2f2", bd:"#fca5a5", label:"Шұғыл" },
  };

  entries.forEach(([id, hw]) => {
    const ps = PRIORITY_STYLES[hw.priority] || PRIORITY_STYLES.normal;
    const doneCount = Object.keys(hw.doneBy || {}).length;
    const deadlineStr = hw.deadline
      ? new Date(hw.deadline).toLocaleDateString("kk-KZ", {day:"numeric",month:"long"})
      : "Мерзім жоқ";
    const isOverdue = hw.deadline && new Date(hw.deadline) < new Date();

    const card = document.createElement("div");
    card.className = "hw-card";
    card.style.cssText = `
      background:#fff;border:1.5px solid ${ps.bd};border-radius:16px;
      padding:14px;margin-bottom:10px;
      box-shadow:0 2px 8px rgba(15,23,42,0.06);
      animation:card-in .25s ease;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        <div style="background:${ps.bg};border-radius:10px;padding:8px;font-size:18px;flex-shrink:0;">${ps.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;">${escapeHtml(hw.subject||"Тапсырма")}</div>
          <div style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">
            <span>${ps.label}</span>
            <span>•</span>
            <span style="color:${isOverdue?'#dc2626':'#64748b'};">
              ${isOverdue ? "⚠️" : "📅"} ${deadlineStr}
            </span>
          </div>
        </div>
        <button onclick="deleteHomework('${id}')" style="
          background:#fef2f2;border:1px solid #fecaca;border-radius:8px;
          padding:4px 9px;font-size:11px;font-weight:700;color:#dc2626;cursor:pointer;
          flex-shrink:0;
        ">✕</button>
      </div>

      <div style="
        font-size:13px;color:#334155;line-height:1.6;
        background:#f8f9fc;border-radius:10px;padding:10px;
        margin-bottom:10px;white-space:pre-wrap;word-break:break-word;
      ">${hw.text||""}</div>

      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:12px;color:#64748b;">
          ✅ Орындады: <b style="color:#10b981;">${doneCount}</b> оқушы
        </div>
        <div style="font-size:11px;color:#94a3b8;">
          ${hw.time ? new Date(hw.time).toLocaleString("kk-KZ",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : ""}
        </div>
      </div>

      ${doneCount > 0 ? `
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
          ${Object.values(hw.doneBy||{}).map(d =>
            `<span style="background:#f0fdf4;border:1px solid #86efac;color:#14532d;
              font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;">
              ${d.avatar||"🙂"} ${d.name||""}
            </span>`
          ).join("")}
        </div>` : ""}
    `;
    list.appendChild(card);
  });
}

// ── Фильтр ─────────────────────────────────────────
window.filterHW = function(filter) {
  window._hwFilter = filter;
  document.querySelectorAll(".hw-filter-btn").forEach(btn => {
    const isActive = btn.dataset.f === filter;
    btn.style.color = isActive ? "#4f46e5" : "#64748b";
    btn.style.borderBottomColor = isActive ? "#4f46e5" : "transparent";
    btn.style.fontWeight = isActive ? "700" : "600";
  });
  renderHomeworkList(window._hwData || {}, filter);
};

// ── Жою ─────────────────────────────────────────────
window.deleteHomework = function(id) {
  if (!currentRoom) return;
  if (!confirm("Тапсырманы жоясыз ба?")) return;
  set(ref(db, `rooms/${currentRoom}/homework/${id}`), null);
};

// =====================================================
// ШАМ 25: AI LESSON FLOW
// Тақырып → AI → JSON → Тақтаға автоматты блоктар
// =====================================================

window.openLessonFlow = function() {
  if (document.getElementById("lfModal")) {
    document.getElementById("lfModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "lfModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const TYPE_META = {
    intro:      { icon:"🎯", color:"#4f46e5", bg:"#eef2ff", bd:"#c7d2fe" },
    theory:     { icon:"📖", color:"#16a34a", bg:"#f0fdf4", bd:"#86efac" },
    example:    { icon:"✏️", color:"#d97706", bg:"#fef3c7", bd:"#fde68a" },
    practice:   { icon:"🧠", color:"#7c3aed", bg:"#fdf4ff", bd:"#e9d5ff" },
    assessment: { icon:"✅", color:"#0369a1", bg:"#e0f2fe", bd:"#7dd3fc" },
    homework:   { icon:"📚", color:"#c2410c", bg:"#fff7ed", bd:"#fed7aa" },
  };
  window._lfTypeMeta = TYPE_META;

  const el = document.createElement("div");
  el.style.cssText = "background:#fff;border-radius:22px;width:min(880px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#312e81,#4f46e5,#7c3aed);padding:16px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">⚡ AI Lesson Flow</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:3px;">Тақырып → AI → Толық сабақ → Тақтаға автоматты</div>
    </div>
    <button onclick="document.getElementById('lfModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;">✕ Жабу</button>
  `;

  // Inputs
  const inp = document.createElement("div");
  inp.style.cssText = "padding:16px 22px;background:#f8f9ff;border-bottom:1px solid #e2e6f0;flex-shrink:0;";
  inp.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 140px 100px;gap:10px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Тақырып</label>
        <input id="lfTopic" type="text" placeholder="Мысалы: Квадрат теңдеу -- 8-сынып"
          style="width:100%;padding:10px 12px;border:1.5px solid #e2e6f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Пән</label>
        <input id="lfSubject" type="text" placeholder="Математика"
          style="width:100%;padding:10px 12px;border:1.5px solid #e2e6f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Сынып</label>
        <input id="lfGrade" type="text" placeholder="7" maxlength="3"
          style="width:100%;padding:10px 12px;border:1.5px solid #e2e6f0;border-radius:10px;font-size:14px;font-family:inherit;text-align:center;box-sizing:border-box;"/>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <button id="lfGenBtn" onclick="generateLessonFlow()" style="padding:11px 24px;border:none;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;">
        <span id="lfBtnIcon">⚡</span><span id="lfBtnText">Сабақ жасау</span>
      </button>
      <button id="lfAddAllBtn" onclick="addAllLessonBlocks()" style="display:none;padding:11px 20px;border:none;border-radius:11px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;gap:8px;align-items:center;">
        📌 Барлығын тақтаға қосу
      </button>
      <div id="lfStatus" style="font-size:12px;color:#64748b;font-weight:600;"></div>
    </div>
  `;

  // Preview
  const preview = document.createElement("div");
  preview.id = "lfPreview";
  preview.style.cssText = "flex:1;overflow-y:auto;padding:18px 22px;";
  preview.innerHTML = `
    <div id="lfEmpty" style="text-align:center;padding:50px 20px;color:#94a3b8;">
      <div style="font-size:52px;margin-bottom:12px;">⚡</div>
      <div style="font-size:15px;font-weight:700;color:#374151;margin-bottom:6px;">AI Lesson Flow</div>
      <div style="font-size:13px;line-height:1.6;">Тақырып жазып, «Сабақ жасау» батырмасын басыңыз.<br>AI 6 блоктан тұратын толық сабақ жасайды.</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:20px;text-align:left;max-width:480px;margin-left:auto;margin-right:auto;">
        ${Object.entries(TYPE_META).map(([t,s]) => `
          <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:10px;padding:10px 12px;">
            <div style="font-size:18px;">${s.icon}</div>
            <div style="font-size:11px;font-weight:700;color:#334155;margin-top:4px;">${
              {intro:"Кіріспе",theory:"Теория",example:"Мысалдар",practice:"Тапсырмалар",assessment:"Бағалау",homework:"Үй тапс."}[t]
            }</div>
          </div>`).join("")}
      </div>
    </div>
    <div id="lfBlocks" style="display:none;"></div>
  `;

  el.appendChild(hdr);
  el.appendChild(inp);
  el.appendChild(preview);
  modal.appendChild(el);
  document.body.appendChild(modal);
  window._lfLesson = null;
};

// ── Сабақ жасау ────────────────────────────────────
window.generateLessonFlow = async function() {
  const topic   = document.getElementById("lfTopic")?.value.trim();
  const subject = document.getElementById("lfSubject")?.value.trim() || "";
  const grade   = document.getElementById("lfGrade")?.value.trim() || "";
  const btn     = document.getElementById("lfGenBtn");
  const status  = document.getElementById("lfStatus");
  const addBtn  = document.getElementById("lfAddAllBtn");

  if (!topic) {
    if (status) { status.textContent = "❗ Тақырып жазыңыз!"; status.style.color = "#dc2626"; }
    return;
  }

  // Loading state
  if (btn) { btn.disabled = true; document.getElementById("lfBtnIcon").textContent = "⏳"; document.getElementById("lfBtnText").textContent = "Жасалуда..."; }
  if (status) { status.textContent = "AI 6 блок жасап жатыр..."; status.style.color = "#f59e0b"; }
  if (addBtn) addBtn.style.display = "none";

  document.getElementById("lfEmpty").style.display = "none";
  const blocksEl = document.getElementById("lfBlocks");

  // Skeleton
  blocksEl.style.display = "block";
  blocksEl.innerHTML = Array(6).fill(0).map((_,i) => `
    <div style="background:#f8f9ff;border-radius:16px;padding:16px;border:1px solid #e2e6f0;margin-bottom:12px;animation:sk-pulse 1.${i}s ease infinite alternate;">
      <div style="background:#e2e6f0;height:16px;width:${140+i*15}px;border-radius:6px;margin-bottom:10px;"></div>
      <div style="background:#e2e6f0;height:11px;width:90%;border-radius:4px;margin-bottom:5px;"></div>
      <div style="background:#e2e6f0;height:11px;width:70%;border-radius:4px;"></div>
    </div>
  `).join("") + "<style>@keyframes sk-pulse{from{opacity:.5}to{opacity:1}}</style>";

  try {
    if (!checkAILimit()) return;
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lesson_flow", prompt: topic, subject, grade, lang: currentLang || "kk", uid: currentUID, plan: currentPlan })
    });
    const data = await res.json();

    // Лимит жеткен жауап өңдеу
    if (data.error === "limit_reached") {
      openUpgradeModal();
      return;
    }

    const lesson = data.lesson;
    if (!lesson?.blocks?.length) throw new Error("AI жауап бере алмады");

    // Лимит санауышын арттыру (сәтті болса)
    incAIUsed();

    window._lfLesson = lesson;
    renderLessonFlowBlocks(lesson);

    if (status) { status.textContent = `✅ ${lesson.blocks.length} блок дайын!`; status.style.color = "#10b981"; }
    if (addBtn) { addBtn.style.display = "flex"; }

  } catch(e) {
    blocksEl.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;"><div style="font-size:32px;">❌</div><div style="margin-top:8px;font-size:14px;font-weight:700;">${e.message}</div></div>`;
    if (status) { status.textContent = "Қате шықты, қайталап көріңіз"; status.style.color = "#dc2626"; }
  } finally {
    if (btn) { btn.disabled = false; document.getElementById("lfBtnIcon").textContent = "⚡"; document.getElementById("lfBtnText").textContent = "Қайта жасау"; }
  }
};

// ── Рендер ─────────────────────────────────────────
function renderLessonFlowBlocks(lesson) {
  const el = document.getElementById("lfBlocks");
  if (!el) return;
  const TM = window._lfTypeMeta || {};

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#312e81,#4f46e5);border-radius:16px;padding:16px 20px;margin-bottom:16px;color:white;">
      <div style="font-size:17px;font-weight:800;margin-bottom:5px;">📘 ${lesson.title || "Сабақ"}</div>
      <div style="font-size:13px;opacity:.85;line-height:1.5;margin-bottom:8px;">${lesson.goal || ""}</div>
      <div style="font-size:12px;opacity:.7;">⏱ ${lesson.duration || 45} мин &nbsp;•&nbsp; 📋 ${lesson.blocks.length} блок</div>
    </div>
    ${lesson.blocks.map((b, i) => {
      const s = TM[b.type] || TM.theory || { icon:"📝", color:"#4f46e5", bg:"#eef2ff", bd:"#c7d2fe" };
      return `
        <div style="background:${s.bg};border:1.5px solid ${s.bd};border-radius:16px;overflow:hidden;margin-bottom:12px;">
          <div style="padding:11px 16px;border-bottom:1px solid ${s.bd};display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;">${s.icon}</span>
              <div>
                <div style="font-size:13px;font-weight:800;color:#0f172a;">${b.title || ""}</div>
                <div style="font-size:11px;color:#64748b;">⏱ ${b.duration || ""} мин</div>
              </div>
            </div>
            <button id="lfBtn-${i}" onclick="addLessonBlock(${i})" style="background:white;border:1.5px solid ${s.bd};color:${s.color};border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">📌 Тақтаға</button>
          </div>
          <div style="padding:13px 16px;font-size:13px;line-height:1.7;color:#334155;">${b.content || ""}</div>
        </div>`;
    }).join("")}
    <div style="text-align:center;padding:8px 0 4px;">
      <button onclick="addAllLessonBlocks()" style="padding:11px 28px;border:none;border-radius:12px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(5,150,105,0.3);">📌 Барлығын тақтаға қосу</button>
    </div>
  `;
}

// ── Жеке блок қосу ─────────────────────────────────
window.addLessonBlock = function(i) {
  const lesson = window._lfLesson;
  if (!lesson?.blocks?.[i]) return;
  const b = lesson.blocks[i];
  addBlock("ai", `<div><div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:8px;">${b.title}</div>${b.content}</div>`);
  const btn = document.getElementById("lfBtn-" + i);
  if (btn) { btn.textContent = "✅ Қосылды"; btn.disabled = true; btn.style.opacity = ".5"; }
};

// ── Барлығын қосу ───────────────────────────────────
window.addAllLessonBlocks = function() {
  const lesson = window._lfLesson;
  if (!lesson?.blocks?.length) return;

  // Тақырып блогы
  addBlock("ai", `<div style="text-align:center;padding:8px 0;"><div style="font-size:20px;font-weight:800;color:#4f46e5;margin-bottom:6px;">📘 ${lesson.title}</div><div style="font-size:13px;color:#64748b;">${lesson.goal}</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;">⏱ ${lesson.duration} минут</div></div>`);

  // Әр блокты кезекпен
  lesson.blocks.forEach((b, i) => {
    setTimeout(() => {
      addBlock("ai", `<div><div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px;">${b.title}</div>${b.content}</div>`);
      const btn = document.getElementById("lfBtn-" + i);
      if (btn) { btn.textContent = "✅"; btn.disabled = true; btn.style.opacity = ".5"; }
    }, i * 150);
  });

  const addBtn = document.getElementById("lfAddAllBtn");
  if (addBtn) { addBtn.textContent = "✅ Тақтаға қосылды!"; addBtn.disabled = true; }

  setTimeout(() => {
    document.getElementById("lfModal").style.display = "none";
  }, lesson.blocks.length * 150 + 400);
};

// =====================================================
// ШАМ 26: AI ДИФФЕРЕНЦИАЦИЯ
// Бір тақырып → 3 деңгей (Базалық / Орта / Күрделі)
// Әр оқушыға өз деңгейіндегі тапсырма карточкасы
// =====================================================

window.openDiffPanel = function() {
  if (document.getElementById("diffModal")) {
    document.getElementById("diffModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "diffModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(920px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // ── Header ─────────────────────────────────────────
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#7c2d12,#dc2626,#f97316);padding:16px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">🎨 AI Дифференциация</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:3px;">Бір тақырып → 3 деңгей → Карточкалар + Тақта</div>
    </div>
    <button onclick="document.getElementById('diffModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;">✕ Жабу</button>
  `;

  // ── Inputs ─────────────────────────────────────────
  const inp = document.createElement("div");
  inp.style.cssText = "padding:16px 22px 14px;background:#fff9f7;border-bottom:1px solid #fed7aa;flex-shrink:0;";
  inp.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 150px 100px;gap:10px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Тақырып / Тапсырма</label>
        <input id="diffTopic" type="text" placeholder="Мысалы: Квадрат теңдеулер, Фотосинтез..."
          style="width:100%;padding:10px 12px;border:1.5px solid #e2e6f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Пән</label>
        <input id="diffSubject" type="text" placeholder="Математика"
          style="width:100%;padding:10px 12px;border:1.5px solid #e2e6f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Сынып</label>
        <input id="diffGrade" type="text" placeholder="7" maxlength="3"
          style="width:100%;padding:10px 12px;border:1.5px solid #e2e6f0;border-radius:10px;font-size:14px;font-family:inherit;box-sizing:border-box;text-align:center;"/>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <button id="diffGenBtn" onclick="generateDiff()" style="padding:11px 24px;border:none;border-radius:11px;background:linear-gradient(135deg,#dc2626,#f97316);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;">
        <span id="diffBtnIcon">🎨</span><span id="diffBtnText">Дифференциация жасау</span>
      </button>
      <button id="diffAddAllBtn" onclick="addAllDiffToBoard()" style="display:none;padding:11px 20px;border:none;border-radius:11px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
        📌 Барлығын тақтаға
      </button>
      <button id="diffPrintBtn" onclick="printDiffCards()" style="display:none;padding:11px 20px;border:none;border-radius:11px;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:white;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
        🖨 Карточка басып шығару
      </button>
      <div id="diffStatus" style="font-size:12px;color:#64748b;font-weight:600;"></div>
    </div>
  `;

  // ── Preview ─────────────────────────────────────────
  const preview = document.createElement("div");
  preview.id = "diffPreview";
  preview.style.cssText = "flex:1;overflow-y:auto;padding:18px 22px;";

  // Empty state
  preview.innerHTML = `
    <div id="diffEmpty" style="text-align:center;padding:50px 20px;color:#94a3b8;">
      <div style="font-size:52px;margin-bottom:12px;">🎨</div>
      <div style="font-size:15px;font-weight:700;color:#374151;margin-bottom:8px;">AI Дифференциация</div>
      <div style="font-size:13px;line-height:1.7;margin-bottom:24px;">
        Тақырып жазып, батырманы басыңыз.<br>
        AI әр оқушыға деңгейіне сай тапсырма жасайды.
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:480px;margin:0 auto;">
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:16px;padding:16px;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">🟢</div>
          <div style="font-size:13px;font-weight:800;color:#16a34a;">Базалық</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Кеңестермен, қолдаулы тапсырмалар</div>
        </div>
        <div style="background:#fef3c7;border:2px solid #fde68a;border-radius:16px;padding:16px;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">🟡</div>
          <div style="font-size:13px;font-weight:800;color:#d97706;">Орта</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Стандарт деңгейдегі тапсырмалар</div>
        </div>
        <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:16px;padding:16px;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">🔴</div>
          <div style="font-size:13px;font-weight:800;color:#dc2626;">Күрделі</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Шығармашылық, тереңдетілген</div>
        </div>
      </div>
    </div>
    <div id="diffCards" style="display:none;"></div>
  `;

  wrap.appendChild(hdr);
  wrap.appendChild(inp);
  wrap.appendChild(preview);
  modal.appendChild(wrap);
  document.body.appendChild(modal);
  window._diffData = null;
};

// ── Дифференциация жасау ────────────────────────────
window.generateDiff = async function() {
  const topic   = document.getElementById("diffTopic")?.value.trim();
  const subject = document.getElementById("diffSubject")?.value.trim() || "";
  const grade   = document.getElementById("diffGrade")?.value.trim() || "";
  const btn     = document.getElementById("diffGenBtn");
  const status  = document.getElementById("diffStatus");

  if (!topic) {
    if (status) { status.textContent = "❗ Тақырып жазыңыз!"; status.style.color = "#dc2626"; }
    return;
  }

  if (btn) { btn.disabled = true; document.getElementById("diffBtnIcon").textContent = "⏳"; document.getElementById("diffBtnText").textContent = "Жасалуда..."; }
  if (status) { status.textContent = "AI 3 деңгей жасап жатыр..."; status.style.color = "#f59e0b"; }
  document.getElementById("diffAddAllBtn").style.display = "none";
  document.getElementById("diffPrintBtn").style.display  = "none";
  document.getElementById("diffEmpty").style.display     = "none";

  const cards = document.getElementById("diffCards");
  cards.style.display = "block";

  // Skeleton -- 3 column
  cards.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
      ${["🟢 Базалық","🟡 Орта","🔴 Күрделі"].map((t,i) => `
        <div style="background:#f8f9fc;border-radius:16px;padding:16px;border:2px solid #e2e6f0;animation:sk-pulse 1.${i*2}s ease infinite alternate;">
          <div style="background:#e2e6f0;height:20px;width:120px;border-radius:6px;margin-bottom:12px;"></div>
          ${Array(3).fill(0).map(() => `
            <div style="background:#f0f2f8;border-radius:8px;padding:10px;margin-bottom:8px;">
              <div style="background:#e2e6f0;height:11px;width:90%;border-radius:4px;margin-bottom:5px;"></div>
              <div style="background:#e2e6f0;height:11px;width:65%;border-radius:4px;"></div>
            </div>`).join("")}
        </div>`).join("")}
    </div>
    <style>@keyframes sk-pulse{from{opacity:.5}to{opacity:1}}</style>`;

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "differentiation", prompt: topic, subject, grade, lang: currentLang || "kk" })
    });
    const data = await res.json();
    const diff = data.diff;

    if (!diff?.levels?.length) throw new Error("AI жауап бере алмады");

    window._diffData = diff;
    renderDiffCards(diff);

    if (status) { status.textContent = "✅ 3 деңгей дайын!"; status.style.color = "#10b981"; }
    document.getElementById("diffAddAllBtn").style.display = "flex";
    document.getElementById("diffPrintBtn").style.display  = "flex";

  } catch(e) {
    cards.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;"><div style="font-size:32px;">❌</div><div style="margin-top:8px;font-size:14px;font-weight:700;">${e.message}</div></div>`;
    if (status) { status.textContent = "Қате -- қайталап көріңіз"; status.style.color = "#dc2626"; }
  } finally {
    if (btn) { btn.disabled = false; document.getElementById("diffBtnIcon").textContent = "🎨"; document.getElementById("diffBtnText").textContent = "Қайта жасау"; }
  }
};

// ── Карточкаларды рендер ────────────────────────────
function renderDiffCards(diff) {
  const cards = document.getElementById("diffCards");
  if (!cards) return;

  const LEVEL_STYLES = [
    { bg:"#f0fdf4", bd:"#86efac", hd:"#16a34a", hdbg:"#dcfce7", tag:"🟢" },
    { bg:"#fefce8", bd:"#fde68a", hd:"#d97706", hdbg:"#fef3c7", tag:"🟡" },
    { bg:"#fff1f2", bd:"#fca5a5", hd:"#dc2626", hdbg:"#fee2e2", tag:"🔴" },
  ];

  cards.innerHTML = `
    <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:12px;padding:12px 16px;margin-bottom:16px;text-align:center;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">📋 ${diff.topic || ""}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px;">
      ${(diff.levels || []).map((lv, li) => {
        const s = LEVEL_STYLES[li] || LEVEL_STYLES[0];
        return `
          <div style="background:${s.bg};border:2px solid ${s.bd};border-radius:18px;overflow:hidden;">

            <!-- Level header -->
            <div style="background:${s.hdbg};padding:12px 14px;border-bottom:1.5px solid ${s.bd};">
              <div style="font-size:15px;font-weight:800;color:${s.hd};">${lv.name || ""}</div>
              <div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.4;">${lv.description || ""}</div>
            </div>

            <!-- Tasks -->
            <div style="padding:12px 14px;display:flex;flex-direction:column;gap:8px;">
              ${(lv.tasks || []).map(t => `
                <div style="background:white;border:1px solid ${s.bd};border-radius:10px;padding:10px 12px;">
                  <div style="font-size:12px;font-weight:800;color:${s.hd};margin-bottom:4px;">№${t.num || ""}</div>
                  <div style="font-size:13px;color:#334155;line-height:1.5;">${t.task || ""}</div>
                  ${t.hint ? `<div style="font-size:11px;color:#64748b;background:#f8f9fc;border-radius:6px;padding:5px 8px;margin-top:6px;">💡 ${t.hint}</div>` : ""}
                </div>
              `).join("")}
            </div>

            <!-- Add to board button -->
            <div style="padding:0 14px 14px;">
              <button id="diffLvlBtn-${li}" onclick="addDiffLevelToBoard(${li})" style="
                width:100%;padding:8px;border:1.5px solid ${s.bd};
                background:white;color:${s.hd};
                border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
              ">📌 Тақтаға қосу</button>
            </div>
          </div>`;
      }).join("")}
    </div>
  `;
}

// ── Жеке деңгей тақтаға ────────────────────────────
window.addDiffLevelToBoard = function(li) {
  const diff = window._diffData;
  if (!diff?.levels?.[li]) return;
  const lv = diff.levels[li];
  const COLORS = ["#16a34a","#d97706","#dc2626"];
  const BG     = ["#f0fdf4","#fef3c7","#fef2f2"];

  const html = `
    <div style="background:${BG[li]};border-radius:14px;padding:14px;">
      <div style="font-size:15px;font-weight:800;color:${COLORS[li]};margin-bottom:10px;">${lv.name || ""}</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:12px;">${lv.description || ""}</div>
      ${(lv.tasks || []).map(t => `
        <div style="background:white;border:1px solid #e2e6f0;border-radius:9px;padding:10px 12px;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:800;color:${COLORS[li]};">№${t.num}</div>
          <div style="font-size:13px;color:#334155;margin-top:3px;">${t.task}</div>
          ${t.hint ? `<div style="font-size:11px;color:#64748b;margin-top:5px;">💡 ${t.hint}</div>` : ""}
        </div>`).join("")}
    </div>`;

  addBlock("ai", html);
  const btn = document.getElementById(`diffLvlBtn-${li}`);
  if (btn) { btn.textContent = "✅ Қосылды"; btn.disabled = true; btn.style.opacity = ".6"; }
};

// ── Барлығын тақтаға ───────────────────────────────
window.addAllDiffToBoard = function() {
  const diff = window._diffData;
  if (!diff?.levels?.length) return;

  // Тақырып блогы
  addBlock("ai", `<div style="text-align:center;padding:8px;"><div style="font-size:18px;font-weight:800;color:#0f172a;">🎨 Дифференцияланған тапсырмалар</div><div style="font-size:14px;color:#64748b;margin-top:4px;">${diff.topic || ""}</div></div>`);

  diff.levels.forEach((lv, li) => {
    setTimeout(() => {
      addDiffLevelToBoard(li);
    }, li * 200);
  });

  const btn = document.getElementById("diffAddAllBtn");
  if (btn) { btn.textContent = "✅ Тақтаға қосылды!"; btn.disabled = true; }
};

// ── Басып шығару (карточкалар) ─────────────────────
window.printDiffCards = function() {
  const diff = window._diffData;
  if (!diff) return;

  const COLORS = ["#16a34a","#d97706","#dc2626"];
  const BG     = ["#f0fdf4","#fef3c7","#fef2f2"];
  const BORDER = ["#86efac","#fde68a","#fca5a5"];

  const printHtml = `<!DOCTYPE html>
<html lang="kk">
<head>
  <meta charset="UTF-8">
  <title>${diff.topic || "Дифференциация"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Inter',sans-serif; background:#fff; color:#0f172a; }
    .page { padding:20px; }
    h1 { font-size:18px; font-weight:800; text-align:center; margin-bottom:16px; color:#0f172a; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
    .card { border-radius:16px; overflow:hidden; border:2px solid; break-inside:avoid; }
    .card-hdr { padding:12px 14px; border-bottom:1.5px solid; }
    .card-hdr-title { font-size:14px; font-weight:800; }
    .card-hdr-desc { font-size:11px; color:#64748b; margin-top:3px; }
    .card-body { padding:12px 14px; }
    .task { background:white; border:1px solid; border-radius:9px; padding:10px 12px; margin-bottom:8px; }
    .task-num { font-size:11px; font-weight:800; margin-bottom:3px; }
    .task-text { font-size:12px; color:#334155; line-height:1.5; }
    .task-hint { font-size:11px; color:#64748b; margin-top:5px; }
    @media print { body{-webkit-print-color-adjust:exact;print-color-adjust:exact;} }
  </style>
</head>
<body>
  <div class="page">
    <h1>🎨 ${diff.topic || "Дифференцияланған тапсырмалар"}</h1>
    <div class="grid">
      ${(diff.levels || []).map((lv, li) => `
        <div class="card" style="border-color:${BORDER[li]};background:${BG[li]};">
          <div class="card-hdr" style="background:${BG[li]};border-color:${BORDER[li]};">
            <div class="card-hdr-title" style="color:${COLORS[li]};">${lv.name}</div>
            <div class="card-hdr-desc">${lv.description || ""}</div>
          </div>
          <div class="card-body">
            ${(lv.tasks || []).map(t => `
              <div class="task" style="border-color:${BORDER[li]};">
                <div class="task-num" style="color:${COLORS[li]};">№${t.num}</div>
                <div class="task-text">${t.task}</div>
                ${t.hint ? `<div class="task-hint">💡 ${t.hint}</div>` : ""}
              </div>`).join("")}
          </div>
        </div>`).join("")}
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(printHtml);
  win.document.close();
  win.onload = () => win.print();
};

// =====================================================
// ШАМ 27: AI СЕРТИФИКАТ -- PDF жасаушы
// Мұғалім → оқушы аты + жетістік → Сертификат PDF
// =====================================================

window.openCertificatePanel = function() {
  if (document.getElementById("certModal")) {
    document.getElementById("certModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "certModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(960px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#78350f,#b45309,#f59e0b);padding:16px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">🏆 AI Сертификат жасаушы</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:3px;">Оқушыға арналған кәсіби сертификат → PDF басып шығару</div>
    </div>
    <button onclick="document.getElementById('certModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;">✕ Жабу</button>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- форма
  const form = document.createElement("div");
  form.style.cssText = "width:300px;flex-shrink:0;padding:18px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#fffbeb;";
  form.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;">Сертификат деректері</div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Оқушы аты-жөні</label>
      <input id="certStudent" type="text" placeholder="Айгерім Бекова"
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updateCertPreview()"/>
    </div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Жетістік / Сабақ</label>
      <input id="certAchievement" type="text" placeholder="Математика пәні бойынша үлгерімі үшін"
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updateCertPreview()"/>
    </div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Мұғалім аты</label>
      <input id="certTeacher" type="text" placeholder="Назгүл Мырзаева"
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updateCertPreview()"/>
    </div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Мекеме</label>
      <input id="certSchool" type="text" placeholder="№5 мектебі"
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updateCertPreview()"/>
    </div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Күні</label>
      <input id="certDate" type="date"
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updateCertPreview()"/>
    </div>

    <div style="margin-bottom:14px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">Сертификат стилі</label>
      <div style="display:flex;flex-direction:column;gap:6px;" id="certStyleBtns">
        ${[
          ["gold","🏆 Алтын","linear-gradient(135deg,#78350f,#b45309)"],
          ["blue","💎 Көк","linear-gradient(135deg,#1e3a8a,#3b82f6)"],
          ["green","🌿 Жасыл","linear-gradient(135deg,#14532d,#16a34a)"],
          ["purple","✨ Күлгін","linear-gradient(135deg,#4c1d95,#7c3aed)"],
        ].map(([v,l,bg],i) => `
          <button class="cert-style-btn" data-s="${v}" onclick="setCertStyle('${v}')" style="
            padding:8px 12px;border-radius:9px;text-align:left;cursor:pointer;font-size:12px;font-weight:700;
            border:2px solid ${i===0?'#f59e0b':'#e2e6f0'};
            background:${i===0?'#fffbeb':'#f9fafb'};color:#334155;
            display:flex;align-items:center;gap:8px;font-family:inherit;
          ">
            <span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:${bg};flex-shrink:0;"></span>
            ${l}
          </button>`).join("")}
      </div>
    </div>

    <div style="margin-bottom:14px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">AI мәтін (қосымша)</label>
      <button onclick="generateCertText()" style="
        width:100%;padding:9px;border:none;border-radius:9px;
        background:linear-gradient(135deg,#4f46e5,#7c3aed);
        color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
        margin-bottom:6px;
      ">⚡ AI мәтін жасау</button>
      <textarea id="certText" rows="3" placeholder="Сертификат мәтіні (AI жасайды немесе өзіңіз жазыңыз)"
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:12px;font-family:inherit;resize:none;box-sizing:border-box;" oninput="updateCertPreview()"></textarea>
    </div>

    <button onclick="downloadCertPDF()" style="
      width:100%;padding:12px;border:none;border-radius:12px;
      background:linear-gradient(135deg,#78350f,#b45309,#f59e0b);
      color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;
      box-shadow:0 4px 14px rgba(180,83,9,0.35);
    ">🖨 PDF басып шығару</button>
  `;

  // RIGHT -- preview
  const right = document.createElement("div");
  right.style.cssText = "flex:1;overflow-y:auto;padding:20px;background:#f0f2f8;display:flex;flex-direction:column;align-items:center;justify-content:center;";
  right.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;">Алдын ала қарау</div>
    <div id="certPreviewWrap" style="width:100%;max-width:600px;">
      <div id="certPreview"></div>
    </div>
  `;

  body.appendChild(form);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  // Бүгінгі күнді орнату
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("certDate").value = today;
  window._certStyle = "gold";
  updateCertPreview();
};

// ── Стиль таңдау ───────────────────────────────────
window.setCertStyle = function(s) {
  window._certStyle = s;
  document.querySelectorAll(".cert-style-btn").forEach(btn => {
    const isActive = btn.dataset.s === s;
    btn.style.borderColor = isActive ? "#f59e0b" : "#e2e6f0";
    btn.style.background  = isActive ? "#fffbeb" : "#f9fafb";
  });
  updateCertPreview();
};

// ── Сертификат стильдері ────────────────────────────
function getCertStyles(style) {
  const styles = {
    gold: {
      bg1:"#78350f", bg2:"#b45309", bg3:"#f59e0b",
      accent:"#f59e0b", light:"#fffbeb", border:"#fde68a",
      emoji:"🏆", pattern:"gold",
    },
    blue: {
      bg1:"#1e3a8a", bg2:"#1d4ed8", bg3:"#60a5fa",
      accent:"#3b82f6", light:"#eff6ff", border:"#bfdbfe",
      emoji:"💎", pattern:"blue",
    },
    green: {
      bg1:"#14532d", bg2:"#15803d", bg3:"#4ade80",
      accent:"#16a34a", light:"#f0fdf4", border:"#bbf7d0",
      emoji:"🌿", pattern:"green",
    },
    purple: {
      bg1:"#4c1d95", bg2:"#6d28d9", bg3:"#a78bfa",
      accent:"#7c3aed", light:"#faf5ff", border:"#e9d5ff",
      emoji:"✨", pattern:"purple",
    },
  };
  return styles[style] || styles.gold;
}

// ── Preview жаңарту ─────────────────────────────────
window.updateCertPreview = function() {
  const student     = document.getElementById("certStudent")?.value.trim() || "Оқушы аты-жөні";
  const achievement = document.getElementById("certAchievement")?.value.trim() || "Жетістігі үшін";
  const teacher     = document.getElementById("certTeacher")?.value.trim() || "Мұғалім";
  const school      = document.getElementById("certSchool")?.value.trim() || "Мектеп";
  const dateVal     = document.getElementById("certDate")?.value || "";
  const certText    = document.getElementById("certText")?.value.trim() || "";
  const s           = getCertStyles(window._certStyle || "gold");

  const dateStr = dateVal
    ? new Date(dateVal).toLocaleDateString("kk-KZ", { year:"numeric", month:"long", day:"numeric" })
    : "";

  const preview = document.getElementById("certPreview");
  if (!preview) return;

  preview.innerHTML = buildCertHTML({ student, achievement, teacher, school, dateStr, certText, s, forPrint: false });
};

// ── Сертификат HTML ─────────────────────────────────
function buildCertHTML({ student, achievement, teacher, school, dateStr, certText, s, forPrint }) {
  const scale = forPrint ? "1" : "0.55";
  const W = 794, H = 561;

  return `
    <div style="transform:scale(${scale});transform-origin:top left;width:${W}px;height:${H}px;position:relative;font-family:'Georgia',serif;">

      <!-- Сыртқы рамка -->
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,${s.bg1},${s.bg2},${s.bg3});border-radius:${forPrint?0:12}px;"></div>

      <!-- Ішкі рамка -->
      <div style="position:absolute;inset:12px;background:white;border-radius:${forPrint?0:8}px;border:3px solid ${s.border};"></div>

      <!-- Бұрыш декорлары -->
      <div style="position:absolute;top:22px;left:22px;width:50px;height:50px;border-top:4px solid ${s.accent};border-left:4px solid ${s.accent};border-radius:2px;"></div>
      <div style="position:absolute;top:22px;right:22px;width:50px;height:50px;border-top:4px solid ${s.accent};border-right:4px solid ${s.accent};border-radius:2px;"></div>
      <div style="position:absolute;bottom:22px;left:22px;width:50px;height:50px;border-bottom:4px solid ${s.accent};border-left:4px solid ${s.accent};border-radius:2px;"></div>
      <div style="position:absolute;bottom:22px;right:22px;width:50px;height:50px;border-bottom:4px solid ${s.accent};border-right:4px solid ${s.accent};border-radius:2px;"></div>

      <!-- Мазмұн -->
      <div style="position:absolute;inset:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 50px;text-align:center;">

        <!-- Emoji -->
        <div style="font-size:48px;margin-bottom:8px;">${s.emoji}</div>

        <!-- СЕРТИФИКАТ тақырыбы -->
        <div style="font-size:13px;font-weight:400;letter-spacing:.35em;text-transform:uppercase;color:${s.accent};margin-bottom:4px;">СЕРТИФИКАТ</div>
        <div style="width:120px;height:2px;background:${s.accent};margin-bottom:12px;border-radius:2px;"></div>

        <!-- Берілді -->
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Осы сертификат берілді</div>

        <!-- Оқушы аты -->
        <div style="font-size:32px;font-weight:700;color:#0f172a;margin-bottom:4px;font-style:italic;">${student}</div>
        <div style="width:200px;height:1px;background:#e2e6f0;margin-bottom:12px;"></div>

        <!-- Жетістік -->
        <div style="font-size:13px;color:#334155;margin-bottom:8px;line-height:1.5;">${achievement}</div>

        <!-- AI мәтін -->
        ${certText ? `<div style="font-size:11px;color:#64748b;font-style:italic;margin-bottom:8px;max-width:400px;line-height:1.5;">${certText}</div>` : ""}

        <!-- Мектеп -->
        <div style="font-size:12px;color:#64748b;margin-bottom:16px;">${school}</div>

        <!-- Footer -- мұғалім + күн -->
        <div style="display:flex;align-items:flex-end;justify-content:space-between;width:100%;margin-top:auto;padding-top:12px;border-top:1px solid ${s.border};">
          <div style="text-align:left;">
            <div style="width:120px;height:1px;background:#334155;margin-bottom:4px;"></div>
            <div style="font-size:11px;color:#64748b;">${teacher}</div>
            <div style="font-size:10px;color:#94a3b8;">Мұғалім қолы</div>
          </div>
          <div style="text-align:center;">
            <div style="width:60px;height:60px;border-radius:50%;background:${s.light};border:2px solid ${s.border};display:flex;align-items:center;justify-content:center;font-size:20px;margin:0 auto 4px;">${s.emoji}</div>
            <div style="font-size:9px;color:#94a3b8;">Мөр орны</div>
          </div>
          <div style="text-align:right;">
            <div style="width:120px;height:1px;background:#334155;margin-bottom:4px;margin-left:auto;"></div>
            <div style="font-size:11px;color:#64748b;">${dateStr}</div>
            <div style="font-size:10px;color:#94a3b8;">Берілген күні</div>
          </div>
        </div>
      </div>
    </div>
    ${forPrint ? "" : `<div style="width:${W * 0.55}px;height:${H * 0.55}px;pointer-events:none;"></div>`}
  `;
}

// ── AI мәтін жасау ──────────────────────────────────
window.generateCertText = async function() {
  const student     = document.getElementById("certStudent")?.value.trim() || "оқушы";
  const achievement = document.getElementById("certAchievement")?.value.trim() || "";
  const textEl      = document.getElementById("certText");
  if (!textEl) return;

  textEl.placeholder = "⏳ AI жасап жатыр...";
  textEl.disabled    = true;

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        prompt: `"${student}" атты оқушыға "${achievement}" үшін берілетін сертификатқа 2-3 сөйлемнен тұратын мадақтау мәтін жаз. Ресми, шабыттандырушы тілмен. Тек мәтін бер, артық ештеңе жазба.`,
        lang: currentLang || "kk"
      })
    });
    const data = await res.json();
    textEl.value = data.answer || "";
    updateCertPreview();
  } catch(e) {
    textEl.placeholder = "Қате шықты";
  } finally {
    textEl.disabled = false;
  }
};

// ── PDF басып шығару ────────────────────────────────
window.downloadCertPDF = function() {
  const student     = document.getElementById("certStudent")?.value.trim() || "Оқушы";
  const achievement = document.getElementById("certAchievement")?.value.trim() || "Жетістігі үшін";
  const teacher     = document.getElementById("certTeacher")?.value.trim() || "Мұғалім";
  const school      = document.getElementById("certSchool")?.value.trim() || "Мектеп";
  const dateVal     = document.getElementById("certDate")?.value || "";
  const certText    = document.getElementById("certText")?.value.trim() || "";
  const s           = getCertStyles(window._certStyle || "gold");

  const dateStr = dateVal
    ? new Date(dateVal).toLocaleDateString("kk-KZ", { year:"numeric", month:"long", day:"numeric" })
    : "";

  const certHTML = buildCertHTML({ student, achievement, teacher, school, dateStr, certText, s, forPrint: true });

  const printDoc = `<!DOCTYPE html>
<html lang="kk">
<head>
  <meta charset="UTF-8">
  <title>Сертификат -- ${student}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@400;600&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    html, body { width:794px; height:561px; overflow:hidden; }
    body { display:flex; align-items:center; justify-content:center; background:white; }
    @media print {
      html, body { width:297mm; height:210mm; }
      @page { size:A4 landscape; margin:0; }
    }
  </style>
</head>
<body>${certHTML}</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=650");
  win.document.write(printDoc);
  win.document.close();
  win.onload = () => { setTimeout(() => win.print(), 500); };
};

// =====================================================
// ШАМ 28: AI VOICE CONTROL -- Дауыспен басқару
// Қазақша / Орысша / Ағылшынша командалар
// Web Speech API + AI түсіндіру
// =====================================================

let voiceOn       = false;
let recognition   = null;
let voiceHistory  = [];
let voiceWidget   = null;

// ── Негізгі командалар кестесі ──────────────────────
const VOICE_COMMANDS = {
  // Қазақша
  "мәтін қос":          () => window.addRichText?.(),
  "мәтін":              () => window.addRichText?.(),
  "формула қос":        () => window.addFormula?.(),
  "формула":            () => window.addFormula?.(),
  "фото қос":           () => window.addImage?.(),
  "сурет қос":          () => window.addImage?.(),
  "видео қос":          () => window.addVideo?.(),
  "бөлме жаса":         () => window.createRoom?.(),
  "бөлме аш":           () => window.createRoom?.(),
  "жаңа бет":           () => window.addPage?.(),
  "бет қос":            () => window.addPage?.(),
  "сурет сал":          () => window.toggleDrawMode?.(),
  "сызу режимі":        () => window.toggleDrawMode?.(),
  "прожектор":          () => window.toggleSpotlight?.(),
  "жасыру":             () => window.toggleCover?.(),
  "жабысқақ":           () => window.addStickyNote?.(),
  "жазба":              () => window.addStickyNote?.(),
  "таймер":             () => window.openTimerWidget?.(),
  "спин":               () => window.openSpinWheel?.(),
  "айналдыр":           () => window.openSpinWheel?.(),
  "сертификат":         () => window.openCertificatePanel?.(),
  "дифференциация":     () => window.openDiffPanel?.(),
  "сабақ жаса":         () => window.openLessonFlow?.(),
  "homework":           () => window.openHomeworkPanel?.(),
  "үй тапсырма":        () => window.openHomeworkPanel?.(),
  "collaborative":      () => window.openCollabBoard?.(),
  "ынтымақтастық":      () => window.openCollabBoard?.(),
  "ai жаса":            () => document.getElementById("aiPrompt")?.focus(),

  // Орысша
  "добавить текст":     () => window.addRichText?.(),
  "текст":              () => window.addRichText?.(),
  "добавить формулу":   () => window.addFormula?.(),
  "формулу":            () => window.addFormula?.(),
  "добавить фото":      () => window.addImage?.(),
  "добавить видео":     () => window.addVideo?.(),
  "создать комнату":    () => window.createRoom?.(),
  "новая страница":     () => window.addPage?.(),
  "рисование":          () => window.toggleDrawMode?.(),
  "прожектор":          () => window.toggleSpotlight?.(),
  "скрыть":             () => window.toggleCover?.(),
  "заметка":            () => window.addStickyNote?.(),
  "таймер":             () => window.openTimerWidget?.(),
  "сертификат":         () => window.openCertificatePanel?.(),
  "дифференциация":     () => window.openDiffPanel?.(),
  "урок":               () => window.openLessonFlow?.(),

  // English
  "add text":           () => window.addRichText?.(),
  "add formula":        () => window.addFormula?.(),
  "add image":          () => window.addImage?.(),
  "add video":          () => window.addVideo?.(),
  "create room":        () => window.createRoom?.(),
  "new page":           () => window.addPage?.(),
  "draw mode":          () => window.toggleDrawMode?.(),
  "spotlight":          () => window.toggleSpotlight?.(),
  "hide":               () => window.toggleCover?.(),
  "sticky note":        () => window.addStickyNote?.(),
  "timer":              () => window.openTimerWidget?.(),
  "spin wheel":         () => window.openSpinWheel?.(),
  "certificate":        () => window.openCertificatePanel?.(),
  "differentiation":    () => window.openDiffPanel?.(),
  "lesson flow":        () => window.openLessonFlow?.(),
  "homework":           () => window.openHomeworkPanel?.(),
  "collaborate":        () => window.openCollabBoard?.(),
};

// ── Виджет ─────────────────────────────────────────
window.openVoiceControl = function() {
  if (voiceWidget) {
    voiceWidget.style.display = "flex";
    return;
  }

  voiceWidget = document.createElement("div");
  voiceWidget.id = "voiceWidget";
  voiceWidget.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:500;
    background:white;border-radius:20px;
    box-shadow:0 10px 40px rgba(15,23,42,0.18);
    border:1px solid #e2e6f0;
    width:320px;overflow:hidden;
    display:flex;flex-direction:column;
    animation:card-in .25s ease;
    font-family:'Inter',system-ui,sans-serif;
  `;

  voiceWidget.innerHTML = `
    <!-- Header -->
    <div style="
      background:linear-gradient(135deg,#0f172a,#1e3a8a);
      padding:12px 14px;display:flex;align-items:center;gap:10px;
    ">
      <div id="voiceMicIcon" style="
        width:36px;height:36px;border-radius:50%;
        background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;flex-shrink:0;transition:.3s;
      ">🎤</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:white;">Дауыспен басқару</div>
        <div id="voiceStatusText" style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:1px;">Өшірулі</div>
      </div>
      <button onclick="toggleVoice()" id="voiceToggleBtn" style="
        background:rgba(255,255,255,0.12);color:white;
        border:1.5px solid rgba(255,255,255,0.2);
        border-radius:8px;padding:5px 11px;font-size:12px;font-weight:700;cursor:pointer;
      ">Қосу</button>
      <button onclick="voiceWidget.style.display='none'" style="
        background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
        border:none;border-radius:6px;width:22px;height:22px;
        font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;
      ">✕</button>
    </div>

    <!-- Last command -->
    <div style="padding:10px 14px;background:#f8f9ff;border-bottom:1px solid #e2e6f0;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Соңғы команда</div>
      <div id="voiceLastCmd" style="
        font-size:14px;font-weight:600;color:#0f172a;
        min-height:20px;
      ">--</div>
      <div id="voiceCmdResult" style="font-size:11px;color:#64748b;margin-top:2px;min-height:16px;"></div>
    </div>

    <!-- History -->
    <div style="flex:1;overflow-y:auto;max-height:180px;">
      <div id="voiceHistory" style="padding:8px 14px;display:flex;flex-direction:column;gap:4px;"></div>
    </div>

    <!-- Commands help -->
    <details style="border-top:1px solid #e2e6f0;">
      <summary style="
        padding:9px 14px;font-size:11px;font-weight:700;color:#64748b;
        cursor:pointer;list-style:none;display:flex;align-items:center;gap:5px;
      ">📋 Командалар тізімі</summary>
      <div style="padding:8px 14px 12px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${[
          ["мәтін қос","Мәтін блогы"],
          ["формула","Формула"],
          ["фото қос","Фото"],
          ["бөлме жаса","Бөлме"],
          ["жаңа бет","Бет қосу"],
          ["сурет сал","Сурет режимі"],
          ["прожектор","Spotlight"],
          ["жасыру","Cover"],
          ["жазба","Sticky note"],
          ["таймер","Таймер"],
          ["спин","Spin Wheel"],
          ["сабақ жаса","Lesson Flow"],
          ["дифференциация","Дифф."],
          ["сертификат","Сертификат"],
        ].map(([cmd, desc]) => `
          <div style="
            background:#f8f9ff;border-radius:6px;padding:5px 8px;
            font-size:10px;color:#334155;
          ">
            <span style="font-weight:700;color:#4f46e5;">"${cmd}"</span>
            <span style="color:#64748b;display:block;font-size:9px;">${desc}</span>
          </div>`).join("")}
      </div>
    </details>
  `;

  document.body.appendChild(voiceWidget);

  // Drag
  const hdr = voiceWidget.querySelector("div");
  let isDragging = false;
  hdr.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    const ox = e.clientX - voiceWidget.offsetLeft;
    const oy = e.clientY - voiceWidget.offsetTop;
    const mm = (e2) => {
      if (!isDragging) return;
      voiceWidget.style.right = "auto";
      voiceWidget.style.bottom = "auto";
      voiceWidget.style.left = (e2.clientX - ox) + "px";
      voiceWidget.style.top  = (e2.clientY - oy) + "px";
    };
    const mu = () => { isDragging = false; document.removeEventListener("mousemove", mm); };
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu, { once: true });
  });
};

// ── Қосу / Өшіру ────────────────────────────────────
window.toggleVoice = function() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("⚠️ Браузеріңіз дауыс тануды қолдамайды. Chrome браузерін пайдаланыңыз.", "warn");
    return;
  }

  voiceOn = !voiceOn;

  const btn        = document.getElementById("voiceToggleBtn");
  const micIcon    = document.getElementById("voiceMicIcon");
  const statusText = document.getElementById("voiceStatusText");

  if (voiceOn) {
    startRecognition();
    if (btn)        { btn.textContent = "Өшіру"; btn.style.background = "rgba(239,68,68,0.3)"; btn.style.borderColor = "rgba(239,68,68,0.4)"; }
    if (micIcon)    { micIcon.style.background = "rgba(239,68,68,0.3)"; micIcon.style.borderColor = "#ef4444"; micIcon.textContent = "🎤"; micIcon.style.animation = "mic-pulse 1.5s ease infinite"; }
    if (statusText) statusText.textContent = "Тыңдауда...";

    // Mic pulse animation
    if (!document.getElementById("voicePulseStyle")) {
      const style = document.createElement("style");
      style.id    = "voicePulseStyle";
      style.textContent = "@keyframes mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}";
      document.head.appendChild(style);
    }
  } else {
    stopRecognition();
    if (btn)        { btn.textContent = "Қосу"; btn.style.background = "rgba(255,255,255,0.12)"; btn.style.borderColor = "rgba(255,255,255,0.2)"; }
    if (micIcon)    { micIcon.style.background = "rgba(255,255,255,0.1)"; micIcon.style.borderColor = "rgba(255,255,255,0.2)"; micIcon.textContent = "🎤"; micIcon.style.animation = "none"; micIcon.style.boxShadow = "none"; }
    if (statusText) statusText.textContent = "Өшірулі";
  }
};

// ── Speech Recognition ──────────────────────────────
function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();

  recognition.continuous    = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  // Тіл -- currentLang бойынша
  const langMap = { kk: "kk-KZ", ru: "ru-RU", en: "en-US" };
  recognition.lang = langMap[currentLang] || "kk-KZ";

  recognition.onresult = (event) => {
    let interim = "";
    let final   = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const txt = event.results[i][0].transcript.toLowerCase().trim();
      if (event.results[i].isFinal) final = txt;
      else interim = txt;
    }

    const text = final || interim;
    const lastEl = document.getElementById("voiceLastCmd");
    if (lastEl) lastEl.textContent = `"${text}"`;

    if (final) processVoiceCommand(final);
  };

  recognition.onerror = (e) => {
    const statusText = document.getElementById("voiceStatusText");
    if (statusText) {
      statusText.textContent = e.error === "no-speech" ? "Дауыс анықталмады..." : `Қате: ${e.error}`;
    }
  };

  recognition.onend = () => {
    if (voiceOn) {
      // Автоматты қайта бастау
      setTimeout(() => { try { recognition.start(); } catch(e) {} }, 300);
    }
  };

  try { recognition.start(); } catch(e) {}
}

function stopRecognition() {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
}

// ── Команда өңдеу ───────────────────────────────────
function processVoiceCommand(text) {
  const resultEl = document.getElementById("voiceCmdResult");
  const histEl   = document.getElementById("voiceHistory");

  // Нақты командалармен салыстыру
  let matched = false;
  let matchedCmd = "";

  // 1. Тікелей сәйкестік
  for (const [cmd, fn] of Object.entries(VOICE_COMMANDS)) {
    if (text.includes(cmd)) {
      fn();
      matched    = true;
      matchedCmd = cmd;
      break;
    }
  }

  // 2. Нәтиже UI
  if (matched) {
    if (resultEl) {
      resultEl.textContent = `✅ "${matchedCmd}" -- орындалды`;
      resultEl.style.color = "#10b981";
    }
    // Success pulse
    const mic = document.getElementById("voiceMicIcon");
    if (mic) {
      mic.textContent = "✅";
      setTimeout(() => { if (voiceOn) mic.textContent = "🎤"; }, 1000);
    }
  } else {
    if (resultEl) {
      resultEl.textContent = "❓ Команда табылмады";
      resultEl.style.color = "#f59e0b";
    }
  }

  // 3. Тарих
  voiceHistory.unshift({ text, matched, matchedCmd, time: new Date().toLocaleTimeString("kk-KZ", { hour:"2-digit", minute:"2-digit", second:"2-digit" }) });
  if (voiceHistory.length > 20) voiceHistory.pop();

  if (histEl) {
    histEl.innerHTML = voiceHistory.map(h => `
      <div style="
        display:flex;align-items:center;gap:6px;
        padding:5px 8px;border-radius:7px;
        background:${h.matched ? "#f0fdf4" : "#f9fafb"};
        border:1px solid ${h.matched ? "#86efac" : "#e2e6f0"};
      ">
        <span style="font-size:12px;">${h.matched ? "✅" : "❓"}</span>
        <span style="flex:1;font-size:11px;color:#334155;font-weight:600;">${h.text}</span>
        <span style="font-size:10px;color:#94a3b8;">${h.time}</span>
      </div>
    `).join("");
  }
}

// =====================================================
// ШАМ 29: ANALYTICS DASHBOARD -- Chart.js графиктер
// Нақты уақыт Firebase деректері + визуализация
// =====================================================

window.openAnalyticsDashboard = function() {
  if (document.getElementById("anDashModal")) {
    document.getElementById("anDashModal").style.display = "flex";
    refreshDashboard();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "anDashModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#f0f2f8;border-radius:22px;width:min(1000px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#0f172a,#1e3a8a,#4f46e5);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">📊 Analytics Dashboard</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px;">Нақты уақыт сабақ аналитикасы</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <div id="anRoomBadge" style="background:rgba(255,255,255,0.15);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);">Бөлме жоқ</div>
      <button onclick="exportDashboardCSV()" style="background:rgba(255,255,255,0.12);color:white;border:1.5px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">📥 CSV</button>
      <button onclick="document.getElementById('anDashModal').style.display='none'" style="background:rgba(255,255,255,0.12);color:white;border:1.5px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  // Body
  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:16px 20px;";
  body.innerHTML = `
    <!-- KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
      ${[
        ["anDashStudents","0","👥 Оқушылар","#4f46e5","#eef2ff","#c7d2fe"],
        ["anDashAnswers","0","✏️ Жауаптар","#16a34a","#f0fdf4","#86efac"],
        ["anDashPhotos","0","📷 Фотолар","#d97706","#fef3c7","#fde68a"],
        ["anDashEmotions","0","😊 Эмоциялар","#7c3aed","#fdf4ff","#e9d5ff"],
      ].map(([id,val,label,c,bg,bd]) => `
        <div style="background:${bg};border:1.5px solid ${bd};border-radius:16px;padding:14px 16px;">
          <div style="font-size:28px;font-weight:800;color:${c};" id="${id}">${val}</div>
          <div style="font-size:12px;font-weight:600;color:#64748b;margin-top:2px;">${label}</div>
        </div>`).join("")}
    </div>

    <!-- Charts row 1 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">

      <!-- Белсенділік шеңбері -->
      <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📈 Оқушы белсенділігі</div>
        <div style="position:relative;height:180px;display:flex;align-items:center;justify-content:center;">
          <canvas id="anChartActivity" height="180"></canvas>
          <div style="position:absolute;text-align:center;pointer-events:none;">
            <div id="anActivityPctBig" style="font-size:32px;font-weight:800;color:#4f46e5;">0%</div>
            <div style="font-size:11px;color:#64748b;">жауап берді</div>
          </div>
        </div>
      </div>

      <!-- Эмоция диаграммасы -->
      <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">😊 Эмоциялар бөлінісі</div>
        <div style="height:180px;position:relative;">
          <canvas id="anChartEmotions" height="180"></canvas>
        </div>
        <div id="anEmoLegend" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;"></div>
      </div>
    </div>

    <!-- Charts row 2 -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">

      <!-- Уақыт бойынша белсенділік -->
      <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">⏱ Уақыт бойынша жауаптар</div>
        <div style="height:160px;position:relative;">
          <canvas id="anChartTimeline" height="160"></canvas>
        </div>
      </div>

      <!-- Жылдам статистика -->
      <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">⚡ Жылдам нәтиже</div>
        <div id="anQuickStats" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>

    <!-- Оқушылар кестесі -->
    <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;">👥 Оқушылар кестесі</div>
        <div style="display:flex;gap:6px;">
          ${["Барлығы","Жауап берді","Бермеді"].map((l,i) => `
            <button onclick="filterStudentTable(${i})" class="an-filter-btn" data-fi="${i}" style="
              padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;cursor:pointer;
              border:1.5px solid ${i===0?'#c7d2fe':'#e2e6f0'};
              background:${i===0?'#eef2ff':'#f9fafb'};
              color:${i===0?'#4f46e5':'#64748b'};font-family:inherit;
            ">${l}</button>`).join("")}
        </div>
      </div>
      <div id="anStudentTable" style="overflow-x:auto;">
        <div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;">Бөлме ашылғанда деректер шығады</div>
      </div>
    </div>
  `;

  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  // Chart.js жүктеу
  loadChartJS(() => {
    window._anCharts = {};
    refreshDashboard();
  });

  // Нақты уақыт жаңарту
  if (window._anDashInterval) clearInterval(window._anDashInterval);
  window._anDashInterval = setInterval(refreshDashboard, 5000);

  // Modal жабылғанда тазалау
  // Analytics modal жабылғанда interval тазалау
  const anCloseButtons = modal.querySelectorAll("button");
  anCloseButtons.forEach(btn => {
    if (btn.textContent === "✕") {
      const origOnClick = btn.onclick;
      btn.onclick = function() {
        clearInterval(window._anDashInterval);
        window._anDashInterval = null;
        document.getElementById("anDashModal").style.display = "none";
      };
    }
  });
};

// ── Chart.js жүктеу ─────────────────────────────────
function loadChartJS(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
  s.onload = cb;
  document.head.appendChild(s);
}

// ── Dashboard жаңарту ───────────────────────────────
function refreshDashboard() {
  if (!document.getElementById("anDashModal")) return;

  const data     = analyticsData;
  const students = Object.values(data.students || {});
  const answers  = Object.values(data.answers  || {});
  const photos   = Object.values(data.photos   || {});
  const emotions = data.emotions || {};

  // KPI
  const setKPI = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setKPI("anDashStudents", students.length);
  setKPI("anDashAnswers",  answers.length);
  setKPI("anDashPhotos",   photos.length);
  setKPI("anDashEmotions", Object.values(emotions).reduce((a,b)=>a+b, 0));

  // Room badge
  const badge = document.getElementById("anRoomBadge");
  if (badge) badge.textContent = currentRoom ? `🟢 Бөлме: ${currentRoom}` : "Бөлме жоқ";

  const answeredNames = new Set(answers.map(a => a.name));
  const pct = students.length > 0 ? Math.round((answeredNames.size / students.length) * 100) : 0;
  const pctEl = document.getElementById("anActivityPctBig");
  if (pctEl) pctEl.textContent = pct + "%";

  if (window.Chart) {
    drawActivityChart(pct, students.length - answeredNames.size);
    drawEmotionsChart(emotions);
    drawTimelineChart(answers);
  }

  drawQuickStats(students, answers, photos, emotions, pct);
  drawStudentTable(students, answers, photos, window._anTableFilter || 0);
}

// ── Белсенділік donut chart ─────────────────────────
function drawActivityChart(pct, unanswered) {
  const ctx = document.getElementById("anChartActivity");
  if (!ctx) return;

  if (window._anCharts?.activity) {
    window._anCharts.activity.data.datasets[0].data = [pct, 100 - pct];
    window._anCharts.activity.update("none");
    return;
  }

  window._anCharts = window._anCharts || {};
  window._anCharts.activity = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: ["#4f46e5","#e2e6f0"],
        borderWidth: 0,
        cutout: "75%",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 600, easing: "easeInOutQuart" },
    }
  });
}

// ── Эмоция bar chart ────────────────────────────────
function drawEmotionsChart(emotions) {
  const ctx = document.getElementById("anChartEmotions");
  if (!ctx) return;
  const legend = document.getElementById("anEmoLegend");

  const entries = Object.entries(emotions).sort((a,b) => b[1] - a[1]).slice(0, 8);
  if (!entries.length) return;

  const COLORS = ["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];
  const labels = entries.map(([e]) => e);
  const vals   = entries.map(([,c]) => c);

  if (window._anCharts?.emotions) {
    window._anCharts.emotions.data.labels = labels;
    window._anCharts.emotions.data.datasets[0].data = vals;
    window._anCharts.emotions.update("none");
  } else {
    window._anCharts = window._anCharts || {};
    window._anCharts.emotions = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: vals,
          backgroundColor: COLORS.slice(0, labels.length),
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 16 } } },
          y: { grid: { color: "#f0f2f8" }, ticks: { stepSize: 1, font: { size: 10 } } }
        },
        animation: { duration: 500 },
      }
    });
  }

  if (legend) {
    legend.innerHTML = entries.map(([e, c], i) =>
      `<span style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:999px;padding:2px 8px;font-size:11px;display:flex;align-items:center;gap:3px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${COLORS[i]};display:inline-block;"></span>
        ${e} <b>${c}</b>
      </span>`
    ).join("");
  }
}

// ── Уақыт бойынша timeline ──────────────────────────
function drawTimelineChart(answers) {
  const ctx = document.getElementById("anChartTimeline");
  if (!ctx || !answers.length) return;

  // Минут бойынша топтау
  const byMinute = {};
  answers.forEach(a => {
    if (!a.time) return;
    const d    = new Date(a.time);
    const key  = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    byMinute[key] = (byMinute[key] || 0) + 1;
  });

  const sorted  = Object.entries(byMinute).sort(([a],[b]) => a.localeCompare(b));
  const labels  = sorted.map(([k]) => k);
  const vals    = sorted.map(([,v]) => v);

  if (window._anCharts?.timeline) {
    window._anCharts.timeline.data.labels = labels;
    window._anCharts.timeline.data.datasets[0].data = vals;
    window._anCharts.timeline.update("none");
    return;
  }

  window._anCharts = window._anCharts || {};
  window._anCharts.timeline = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: vals,
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,0.08)",
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: "#4f46e5",
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { color: "#f0f2f8" }, ticks: { stepSize: 1, font: { size: 10 } } }
      },
      animation: { duration: 500 },
    }
  });
}

// ── Жылдам статистика ───────────────────────────────
function drawQuickStats(students, answers, photos, emotions, pct) {
  const el = document.getElementById("anQuickStats");
  if (!el) return;

  const totalEmo   = Object.values(emotions).reduce((a,b) => a+b, 0);
  const topEmo     = Object.entries(emotions).sort((a,b)=>b[1]-a[1])[0];
  const avgPerStu  = students.length ? (answers.length / students.length).toFixed(1) : 0;

  const stats = [
    { icon:"📊", label:"Белсенділік деңгейі", val: pct + "%",
      color: pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626" },
    { icon:"✏️", label:"Жауап/Оқушы", val: avgPerStu, color:"#4f46e5" },
    { icon:"📷", label:"Фото жіберді", val: photos.length, color:"#0369a1" },
    { icon:"😊", label:"Үстем эмоция", val: topEmo ? `${topEmo[0]} x${topEmo[1]}` : "--", color:"#7c3aed" },
    { icon:"🕐", label:"Соңғы жауап", val: answers.length ? (() => {
        const last = answers.sort((a,b)=>(b.time||0)-(a.time||0))[0];
        return last?.time ? new Date(last.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"}) : "--";
      })() : "--", color:"#64748b" },
  ];

  el.innerHTML = stats.map(s => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8f9ff;border-radius:10px;border:1px solid #e2e6f0;">
      <span style="font-size:16px;">${s.icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:10px;color:#64748b;">${s.label}</div>
        <div style="font-size:14px;font-weight:800;color:${s.color};">${s.val}</div>
      </div>
    </div>`).join("");
}

// ── Оқушылар кестесі ────────────────────────────────
window.filterStudentTable = function(fi) {
  window._anTableFilter = fi;
  document.querySelectorAll(".an-filter-btn").forEach(btn => {
    const isA = parseInt(btn.dataset.fi) === fi;
    btn.style.borderColor = isA ? "#c7d2fe" : "#e2e6f0";
    btn.style.background  = isA ? "#eef2ff" : "#f9fafb";
    btn.style.color       = isA ? "#4f46e5" : "#64748b";
  });
  const data     = analyticsData;
  const students = Object.values(data.students || {});
  const answers  = Object.values(data.answers  || {});
  const photos   = Object.values(data.photos   || {});
  drawStudentTable(students, answers, photos, fi);
};

function drawStudentTable(students, answers, photos, filter) {
  const el = document.getElementById("anStudentTable");
  if (!el) return;

  const answeredNames = new Set(answers.map(a => a.name));
  let list = students;
  if (filter === 1) list = students.filter(s => answeredNames.has(s.name));
  if (filter === 2) list = students.filter(s => !answeredNames.has(s.name));

  if (!list.length) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">Деректер жоқ</div>`;
    return;
  }

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f8f9ff;">
          ${["#","Аватар","Оқушы","Қосылды","Жауап","Фото","Статус"].map(h =>
            `<th style="padding:8px 12px;text-align:left;font-weight:700;color:#64748b;border-bottom:1px solid #e2e6f0;">${h}</th>`
          ).join("")}
        </tr>
      </thead>
      <tbody>
        ${list.map((s, i) => {
          const ans   = answers.find(a => a.name === s.name);
          const photo = photos.find(p => p.name === s.name);
          const hasAns = !!ans;
          return `
            <tr style="border-bottom:1px solid #f0f2f8;${i%2===0?'background:#fff':'background:#fafbff'}">
              <td style="padding:8px 12px;color:#94a3b8;">${i+1}</td>
              <td style="padding:8px 12px;font-size:20px;">${s.avatar||"🙂"}</td>
              <td style="padding:8px 12px;font-weight:700;color:#0f172a;">${s.name||"--"}</td>
              <td style="padding:8px 12px;color:#64748b;">${s.time ? new Date(s.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"}) : "--"}</td>
              <td style="padding:8px 12px;color:#334155;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ans?.text||"--"}</td>
              <td style="padding:8px 12px;">${photo ? "📷" : "--"}</td>
              <td style="padding:8px 12px;">
                <span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;
                  background:${hasAns?'#f0fdf4':'#fef2f2'};color:${hasAns?'#16a34a':'#dc2626'};
                  border:1px solid ${hasAns?'#86efac':'#fca5a5'};">
                  ${hasAns?"✅ Жауап берді":"⬜ Бермеді"}
                </span>
              </td>
            </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

// ── CSV экспорт ─────────────────────────────────────
window.exportDashboardCSV = function() {
  const data     = analyticsData;
  const students = Object.values(data.students || {});
  const answers  = Object.values(data.answers  || {});
  const photos   = Object.values(data.photos   || {});

  if (!students.length) { showToast("⚠️ Деректер жоқ!", "warn"); return; }

  const rows = [["Оқушы аты","Аватар","Қосылды","Жауап берді","Жауап мәтіні","Фото","Уақыт"]];
  students.forEach(s => {
    const ans   = answers.find(a => a.name === s.name);
    const photo = photos.find(p => p.name === s.name);
    rows.push([
      s.name||"--", s.avatar||"", 
      s.time ? new Date(s.time).toLocaleTimeString("kk-KZ") : "",
      ans ? "Иә" : "Жоқ",
      ans ? (ans.text||"").replace(/,/g,";") : "",
      photo ? "Иә" : "Жоқ",
      new Date().toLocaleDateString("kk-KZ"),
    ]);
  });

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `sабақ_аналитикасы_${new Date().toLocaleDateString("kk-KZ").replace(/\./g,"-")}.csv`;
  a.click();
};

// =====================================================
// ШАМ 30: ОҚУШЫ ПРОГРЕСІ -- Жеке карточка + динамика
// Firebase-та сабақтан сабаққа сақталады
// =====================================================

window.openStudentProgress = function() {
  if (document.getElementById("progModal")) {
    document.getElementById("progModal").style.display = "flex";
    loadProgressData();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "progModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#f0f2f8;border-radius:22px;width:min(1000px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  wrap.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a,#7c3aed);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div>
        <div style="font-size:17px;font-weight:800;color:white;">📈 Оқушы прогресі</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px;">Сабақтан сабаққа динамика -- Firebase-та сақталады</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button onclick="saveCurrentLesson()" style="background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;">💾 Сабақты сақтау</button>
        <button onclick="document.getElementById('progModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.2);border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid #e2e6f0;background:white;flex-shrink:0;">
      ${[["overview","📊 Шолу"],["students","👥 Оқушылар"],["history","📅 Тарих"],["add","➕ Бағалау"]].map(([t,l],i) => `
        <button class="prog-tab" data-t="${t}" onclick="switchProgTab('${t}')" style="
          padding:11px 18px;border:none;background:transparent;cursor:pointer;
          font-size:13px;font-weight:${i===0?'700':'600'};font-family:inherit;
          color:${i===0?'#4f46e5':'#64748b'};
          border-bottom:2px solid ${i===0?'#4f46e5':'transparent'};
          white-space:nowrap;
        ">${l}</button>`).join("")}
    </div>

    <!-- Content -->
    <div id="progContent" style="flex:1;overflow-y:auto;padding:18px 22px;">
      <div style="text-align:center;padding:40px;color:#94a3b8;">
        <div style="font-size:40px;margin-bottom:10px;">📈</div>
        <div style="font-size:14px;font-weight:600;">Жүктелуде...</div>
      </div>
    </div>
  `;

  modal.appendChild(wrap);
  document.body.appendChild(modal);

  loadChartJS(() => loadProgressData());
};

// ── Tab ауыстыру ─────────────────────────────────────
window.switchProgTab = function(tab) {
  window._progTab = tab;
  document.querySelectorAll(".prog-tab").forEach(btn => {
    const isA = btn.dataset.t === tab;
    btn.style.color = isA ? "#4f46e5" : "#64748b";
    btn.style.borderBottomColor = isA ? "#4f46e5" : "transparent";
    btn.style.fontWeight = isA ? "700" : "600";
  });
  renderProgContent(tab);
};

// ── Firebase-тан прогресс жүктеу ───────────────────
function loadProgressData() {
  if (!currentRoom) {
    renderProgContent("overview");
    return;
  }
  // Текущий сабақ деректері analyticsData-дан алынады
  // Тарихи деректер Firebase-тан
  onValue(ref(db, "progress"), (snap) => {
    window._progHistory = snap.val() || {};
    renderProgContent(window._progTab || "overview");
  }, { onlyOnce: true });
}

// ── Ағымды сабақты сақтау ───────────────────────────
window.saveCurrentLesson = async function() {
  if (!currentRoom) { showToast("⚠️ Алдымен бөлме ашыңыз!", "warn"); return; }

  const students  = Object.values(analyticsData.students || {});
  const answers   = Object.values(analyticsData.answers  || {});
  const emotions  = analyticsData.emotions || {};
  const topic     = document.getElementById("lessonTopic")?.value?.trim() ||
                    document.getElementById("lfTopic")?.value?.trim() || "Сабақ";

  if (!students.length) { showToast("⚠️ Оқушылар жоқ!", "warn"); return; }

  const lessonId = `lesson_${Date.now()}`;
  const lessonData = {
    id: lessonId,
    topic,
    date: new Date().toLocaleDateString("kk-KZ"),
    time: Date.now(),
    roomId: currentRoom,
    studentCount: students.length,
    answerCount:  answers.length,
    activityPct:  students.length ? Math.round((new Set(answers.map(a=>a.name)).size / students.length) * 100) : 0,
    topEmotion:   Object.entries(emotions).sort((a,b)=>b[1]-a[1])[0]?.[0] || "--",
    students: students.reduce((acc, s) => {
      const ans = answers.find(a => a.name === s.name);
      acc[s.name] = {
        name:     s.name,
        avatar:   s.avatar || "🙂",
        answered: !!ans,
        answer:   ans?.text || "",
        time:     s.time || Date.now(),
      };
      return acc;
    }, {}),
  };

  try {
    await set(ref(db, `progress/${lessonId}`), lessonData);
    showToast(`✅ Сабақ сақталды!\n"${topic}" -- ${students.length} оқушы`, "ok");
    loadProgressData();
  } catch(e) {
    showToast("❌ Қате: " + e.message, "error");
  }
};

// ── Content рендер ───────────────────────────────────
function renderProgContent(tab) {
  const el = document.getElementById("progContent");
  if (!el) return;

  const history  = Object.values(window._progHistory || {}).sort((a,b) => (b.time||0) - (a.time||0));
  const students = Object.values(analyticsData.students || {});
  const answers  = Object.values(analyticsData.answers  || {});

  if (tab === "overview") renderProgOverview(el, history, students, answers);
  else if (tab === "students") renderProgStudents(el, history);
  else if (tab === "history")  renderProgHistory(el, history);
  else if (tab === "add")      renderProgAdd(el);
}

// ── ШОЛУ ────────────────────────────────────────────
function renderProgOverview(el, history, students, answers) {
  const totalLessons = history.length;
  const allStudentNames = [...new Set(history.flatMap(l => Object.keys(l.students || {})))];
  const avgActivity = totalLessons ? Math.round(history.reduce((s,l) => s + (l.activityPct||0), 0) / totalLessons) : 0;

  el.innerHTML = `
    <!-- Жалпы KPI -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
      ${[
        ["📅","Жалпы сабақ", totalLessons, "#4f46e5","#eef2ff","#c7d2fe"],
        ["👥","Бірегей оқушылар", allStudentNames.length, "#16a34a","#f0fdf4","#86efac"],
        ["📊","Орта белсенділік", avgActivity+"%", "#d97706","#fef3c7","#fde68a"],
        ["🏆","Соңғы сабақ", history[0] ? history[0].date : "--", "#7c3aed","#fdf4ff","#e9d5ff"],
      ].map(([ic,lb,vl,c,bg,bd]) => `
        <div style="background:${bg};border:1.5px solid ${bd};border-radius:16px;padding:14px 16px;">
          <div style="font-size:24px;margin-bottom:4px;">${ic}</div>
          <div style="font-size:22px;font-weight:800;color:${c};">${vl}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${lb}</div>
        </div>`).join("")}
    </div>

    <!-- Динамика графигі -->
    ${totalLessons >= 2 ? `
      <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📈 Белсенділік динамикасы (соңғы 10 сабақ)</div>
        <div style="height:180px;"><canvas id="progDynChart"></canvas></div>
      </div>` : `
      <div style="background:#f8f9ff;border:1.5px dashed #c7d2fe;border-radius:16px;padding:24px;text-align:center;margin-bottom:16px;color:#64748b;">
        <div style="font-size:32px;margin-bottom:8px;">📊</div>
        <div style="font-size:13px;font-weight:600;">Динамика графигі үшін кемінде 2 сабақ сақталуы керек</div>
        <div style="font-size:11px;margin-top:4px;">«💾 Сабақты сақтау» батырмасын басыңыз</div>
      </div>`}

    <!-- Соңғы сабақтар -->
    ${totalLessons ? `
      <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📅 Соңғы сабақтар</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${history.slice(0,5).map(l => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#f8f9ff;border-radius:10px;border:1px solid #e2e6f0;">
              <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#818cf8);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;flex-shrink:0;">📚</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.topic||"Сабақ"}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">${l.date} • ${l.studentCount||0} оқушы • ${l.activityPct||0}% белсенділік</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:20px;font-weight:800;color:${(l.activityPct||0)>=80?'#16a34a':(l.activityPct||0)>=50?'#d97706':'#dc2626'};">${l.activityPct||0}%</div>
                <div style="font-size:10px;color:#94a3b8;">белсенді</div>
              </div>
            </div>`).join("")}
        </div>
      </div>` : ""}
  `;

  // Динамика chart
  if (totalLessons >= 2 && window.Chart) {
    const last10 = [...history].reverse().slice(-10);
    setTimeout(() => {
      const ctx = document.getElementById("progDynChart");
      if (!ctx) return;
      new Chart(ctx, {
        type: "line",
        data: {
          labels: last10.map(l => l.date),
          datasets: [
            { label:"Белсенділік %", data: last10.map(l => l.activityPct||0), borderColor:"#4f46e5", backgroundColor:"rgba(79,70,229,0.08)", borderWidth:2.5, pointRadius:5, pointBackgroundColor:"#4f46e5", fill:true, tension:0.4, yAxisID:"y" },
            { label:"Оқушылар", data: last10.map(l => l.studentCount||0), borderColor:"#10b981", backgroundColor:"rgba(16,185,129,0.06)", borderWidth:2, pointRadius:4, pointBackgroundColor:"#10b981", fill:true, tension:0.4, yAxisID:"y1" },
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:"top", labels:{ font:{ size:11 }, usePointStyle:true } } },
          scales:{
            x:{ grid:{ display:false }, ticks:{ font:{ size:10 } } },
            y:{ grid:{ color:"#f0f2f8" }, ticks:{ font:{ size:10 } }, max:100, title:{ display:true, text:"%", font:{ size:10 } } },
            y1:{ position:"right", grid:{ display:false }, ticks:{ font:{ size:10 } }, title:{ display:true, text:"оқушы", font:{ size:10 } } },
          }
        }
      });
    }, 100);
  }
}

// ── ОҚУШЫЛАР карточкалары ───────────────────────────
function renderProgStudents(el, history) {
  // Барлық оқушылар агрегациясы
  const studentMap = {};
  history.forEach(lesson => {
    Object.entries(lesson.students || {}).forEach(([name, data]) => {
      if (!studentMap[name]) {
        studentMap[name] = { name, avatar: data.avatar||"🙂", lessons:[], totalAnswered:0, totalLessons:0 };
      }
      studentMap[name].totalLessons++;
      if (data.answered) studentMap[name].totalAnswered++;
      studentMap[name].lessons.push({ date: lesson.date, topic: lesson.topic, answered: data.answered, answer: data.answer });
    });
  });

  const stuList = Object.values(studentMap).sort((a,b) => b.totalLessons - a.totalLessons);

  if (!stuList.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:40px;margin-bottom:10px;">👥</div><div style="font-size:14px;">Әлі сабақ сақталмаған</div></div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${stuList.map(s => {
        const pct = s.totalLessons ? Math.round((s.totalAnswered/s.totalLessons)*100) : 0;
        const color = pct>=80?"#16a34a":pct>=50?"#d97706":"#dc2626";
        const bg    = pct>=80?"#f0fdf4":pct>=50?"#fef3c7":"#fef2f2";
        const bd    = pct>=80?"#86efac":pct>=50?"#fde68a":"#fca5a5";

        return `
          <div style="background:white;border:1.5px solid ${bd};border-radius:18px;padding:16px;cursor:pointer;transition:.18s;"
            onmouseover="this.style.boxShadow='0 6px 20px rgba(15,23,42,0.1)'"
            onmouseout="this.style.boxShadow='none'"
            onclick="showStudentDetail('${s.name}')">
            <!-- Avatar + name -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:44px;height:44px;border-radius:12px;background:${bg};border:2px solid ${bd};display:flex;align-items:center;justify-content:center;font-size:22px;">${s.avatar}</div>
              <div>
                <div style="font-size:14px;font-weight:800;color:#0f172a;">${s.name}</div>
                <div style="font-size:11px;color:#64748b;">${s.totalLessons} сабақ қатысты</div>
              </div>
              <div style="margin-left:auto;font-size:24px;font-weight:800;color:${color};">${pct}%</div>
            </div>
            <!-- Progress bar -->
            <div style="background:#e2e6f0;border-radius:999px;height:8px;overflow:hidden;margin-bottom:8px;">
              <div style="width:${pct}%;height:100%;border-radius:999px;background:${color};transition:width .5s;"></div>
            </div>
            <!-- Stats -->
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;">
              <span>✅ Жауап: ${s.totalAnswered}/${s.totalLessons}</span>
              <span>Соңғы: ${s.lessons[s.lessons.length-1]?.date||"--"}</span>
            </div>
          </div>`;
      }).join("")}
    </div>
  `;
}

// ── Оқушы детальдары ─────────────────────────────────
window.showStudentDetail = function(name) {
  const history = Object.values(window._progHistory || {}).sort((a,b)=>(a.time||0)-(b.time||0));
  const lessons = history.map(l => ({ ...l.students?.[name], date:l.date, topic:l.topic })).filter(l => l.name);

  if (!lessons.length) return;

  const el = document.getElementById("progContent");
  const pct = Math.round((lessons.filter(l=>l.answered).length / lessons.length) * 100);

  el.innerHTML = `
    <button onclick="switchProgTab('students')" style="margin-bottom:14px;background:#f8f9ff;border:1px solid #e2e6f0;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;color:#4f46e5;cursor:pointer;">← Артқа</button>
    <div style="background:white;border-radius:18px;padding:18px;border:1px solid #e2e6f0;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div style="font-size:36px;">${lessons[0]?.avatar||"🙂"}</div>
        <div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${name}</div>
          <div style="font-size:12px;color:#64748b;">${lessons.length} сабаққа қатысты • Орта белсенділік: <b style="color:${pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626'};">${pct}%</b></div>
        </div>
      </div>
      <div style="height:140px;"><canvas id="stuDetailChart"></canvas></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${lessons.map(l => `
        <div style="background:${l.answered?'#f0fdf4':'#fef2f2'};border:1px solid ${l.answered?'#86efac':'#fca5a5'};border-radius:12px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:18px;">${l.answered?"✅":"❌"}</span>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;color:#0f172a;">${l.topic||"Сабақ"}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${l.date}</div>
            ${l.answer ? `<div style="font-size:12px;color:#334155;margin-top:5px;background:white;border-radius:7px;padding:6px 9px;">${l.answer}</div>` : ""}
          </div>
        </div>`).join("")}
    </div>
  `;

  if (window.Chart) {
    setTimeout(() => {
      const ctx = document.getElementById("stuDetailChart");
      if (!ctx) return;
      new Chart(ctx, {
        type:"bar",
        data:{
          labels: lessons.map(l=>l.date),
          datasets:[{ data: lessons.map(l=>l.answered?1:0), backgroundColor: lessons.map(l=>l.answered?"#10b981":"#ef4444"), borderRadius:6 }]
        },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ y:{ display:false, max:1.2 }, x:{ grid:{display:false}, ticks:{font:{size:10}} } } }
      });
    }, 100);
  }
};

// ── ТАРИХ ────────────────────────────────────────────
function renderProgHistory(el, history) {
  if (!history.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:40px;">📅</div><div style="margin-top:10px;font-size:14px;">Сақталған сабақ жоқ</div></div>`;
    return;
  }
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${history.map((l,i) => `
        <div style="background:white;border-radius:16px;padding:14px 16px;border:1px solid #e2e6f0;display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#818cf8);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:800;flex-shrink:0;">${history.length-i}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${l.topic||"Сабақ"}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${l.date} • 👥 ${l.studentCount} оқушы • ✏️ ${l.answerCount} жауап • ${l.topEmotion} эмоция</div>
          </div>
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:22px;font-weight:800;color:${(l.activityPct||0)>=80?'#16a34a':(l.activityPct||0)>=50?'#d97706':'#dc2626'};">${l.activityPct||0}%</div>
            <div style="font-size:10px;color:#94a3b8;">белсенді</div>
          </div>
          <button onclick="deleteLesson('${l.id}')" style="background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;">✕</button>
        </div>`).join("")}
    </div>`;
}

// ── БАҒАЛАУ қосу ─────────────────────────────────────
function renderProgAdd(el) {
  el.innerHTML = `
    <div style="background:white;border-radius:18px;padding:20px;border:1px solid #e2e6f0;max-width:500px;">
      <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:14px;">➕ Қолмен бағалау қосу</div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Оқушы аты</label>
        <input id="manualStudent" type="text" placeholder="Айгерім Бекова" list="studentSuggest"
          style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
        <datalist id="studentSuggest">
          ${Object.values(analyticsData.students||{}).map(s=>`<option value="${s.name}">`).join("")}
        </datalist>
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Сабақ тақырыбы</label>
        <input id="manualTopic" type="text" placeholder="Квадрат теңдеу"
          style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
      </div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Баға (1-5 немесе A-F)</label>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">
          ${["5","4","3","2","1"].map((g,i) => `
            <button class="grade-btn" data-g="${g}" onclick="selectGrade('${g}')" style="
              padding:10px;border-radius:9px;font-size:16px;font-weight:800;cursor:pointer;
              border:2px solid ${i===0?'#86efac':'#e2e6f0'};
              background:${i===0?'#f0fdf4':'#f9fafb'};
              color:${i===0?'#16a34a':'#374151'};
              font-family:inherit;
            ">${g}</button>`).join("")}
        </div>
      </div>
      <div style="margin-bottom:14px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Пікір (міндетті емес)</label>
        <textarea id="manualComment" rows="2" placeholder="Жақсы жұмыс!"
          style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;"></textarea>
      </div>
      <button onclick="saveManualGrade()" style="width:100%;padding:11px;border:none;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">💾 Сақтау</button>
      <div id="manualStatus" style="margin-top:8px;font-size:12px;text-align:center;min-height:16px;"></div>
    </div>
  `;
  window._selectedGrade = "5";
}

window.selectGrade = function(g) {
  window._selectedGrade = g;
  const colors = { "5":"#16a34a","4":"#65a30d","3":"#d97706","2":"#ea580c","1":"#dc2626" };
  const bgs    = { "5":"#f0fdf4","4":"#f7fee7","3":"#fef3c7","2":"#fff7ed","1":"#fef2f2" };
  const bds    = { "5":"#86efac","4":"#bef264","3":"#fde68a","2":"#fed7aa","1":"#fca5a5" };
  document.querySelectorAll(".grade-btn").forEach(btn => {
    const isA = btn.dataset.g === g;
    btn.style.borderColor = isA ? (bds[g]||"#c7d2fe") : "#e2e6f0";
    btn.style.background  = isA ? (bgs[g]||"#eef2ff") : "#f9fafb";
    btn.style.color       = isA ? (colors[g]||"#4f46e5") : "#374151";
  });
};

window.saveManualGrade = async function() {
  const student = document.getElementById("manualStudent")?.value.trim();
  const topic   = document.getElementById("manualTopic")?.value.trim();
  const comment = document.getElementById("manualComment")?.value.trim();
  const grade   = window._selectedGrade || "5";
  const status  = document.getElementById("manualStatus");

  if (!student) { if(status){status.textContent="❗ Оқушы атын жазыңыз";status.style.color="#dc2626";} return; }
  if (!topic)   { if(status){status.textContent="❗ Тақырып жазыңыз";status.style.color="#dc2626";} return; }

  const gradeId = `grade_${Date.now()}`;
  try {
    await set(ref(db, `progress/grades/${gradeId}`), {
      student, topic, grade, comment,
      date: new Date().toLocaleDateString("kk-KZ"),
      time: Date.now(),
    });
    if(status){status.textContent=`✅ ${student} -- баға ${grade} сақталды!`;status.style.color="#10b981";}
    document.getElementById("manualStudent").value = "";
    document.getElementById("manualTopic").value   = "";
    document.getElementById("manualComment").value = "";
  } catch(e) {
    if(status){status.textContent="❌ "+e.message;status.style.color="#dc2626";}
  }
};

window.deleteLesson = async function(id) {
  if (!id || !confirm("Сабақты жоясыз ба?")) return;
  await set(ref(db, `progress/${id}`), null);
  loadProgressData();
};

// =====================================================
// ШАМ 30: ОҚУШЫ ПРОГРЕСІ
// Жеке карточка + динамика + барлық сабақтар статистикасы
// Firebase-тен деректер жинақтау
// =====================================================

window.openStudentProgress = function() {
  if (document.getElementById("spModal")) {
    document.getElementById("spModal").style.display = "flex";
    loadStudentProgress();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "spModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#f0f2f8;border-radius:22px;width:min(980px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#14532d,#16a34a,#4ade80);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">📈 Оқушы прогресі</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Жеке карточка -- барлық сабақтар бойынша динамика</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button onclick="exportProgressCSV()" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">📥 CSV</button>
      <button onclick="document.getElementById('spModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  // Body
  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- оқушылар тізімі
  const left = document.createElement("div");
  left.style.cssText = "width:240px;flex-shrink:0;background:white;border-right:1px solid #e2e6f0;display:flex;flex-direction:column;overflow:hidden;";
  left.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid #e2e6f0;">
      <input id="spSearch" type="text" placeholder="🔍 Іздеу..."
        oninput="filterSpStudents(this.value)"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
    </div>
    <div id="spStudentList" style="flex:1;overflow-y:auto;padding:8px;">
      <div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px;">Бөлме ашылғанда оқушылар шығады</div>
    </div>
  `;

  // RIGHT -- жеке карточка
  const right = document.createElement("div");
  right.style.cssText = "flex:1;overflow-y:auto;padding:16px;";
  right.innerHTML = `
    <div id="spDetailWrap">
      <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
        <div style="font-size:52px;margin-bottom:12px;">👤</div>
        <div style="font-size:15px;font-weight:700;color:#374151;">Оқушыны таңдаңыз</div>
        <div style="font-size:13px;margin-top:6px;">Сол жақ тізімнен оқушыны таңдаңыз</div>
      </div>
    </div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._spAllStudents = {};
  window._spSelected    = null;
  loadStudentProgress();
};

// ── Деректерді жүктеу ───────────────────────────────
function loadStudentProgress() {
  if (!currentRoom) return;

  // Firebase-тен барлық деректер
  onValue(ref(db, `rooms/${currentRoom}/students`), (snap) => {
    window._spAllStudents = snap.val() || {};
    renderSpStudentList(window._spAllStudents);
  });
}

function renderSpStudentList(students, filter) {
  const el = document.getElementById("spStudentList");
  if (!el) return;

  let entries = Object.entries(students);
  if (filter) {
    entries = entries.filter(([,s]) =>
      (s.name||"").toLowerCase().includes(filter.toLowerCase())
    );
  }

  if (!entries.length) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">Оқушылар жоқ</div>`;
    return;
  }

  // Статистика жинау
  const answers  = Object.values(analyticsData.answers  || {});
  const photos   = Object.values(analyticsData.photos   || {});
  const emotions = Object.values(analyticsData.emotions || {});

  el.innerHTML = entries.map(([id, s]) => {
    const hasAns   = answers.some(a => a.name === s.name);
    const hasPhoto = photos.some(p => p.name === s.name);
    const isSelected = window._spSelected === id;

    return `
      <div onclick="selectSpStudent('${id}')" style="
        padding:10px 12px;border-radius:12px;cursor:pointer;
        background:${isSelected ? '#eef2ff' : '#fff'};
        border:1.5px solid ${isSelected ? '#c7d2fe' : '#e2e6f0'};
        margin-bottom:6px;display:flex;align-items:center;gap:8px;
        transition:.15s;
      "
      onmouseover="this.style.background='${isSelected?'#eef2ff':'#f8f9ff'}'"
      onmouseout="this.style.background='${isSelected?'#eef2ff':'#fff'}'">
        <span style="font-size:22px;">${s.avatar||"🙂"}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name||"--"}</div>
          <div style="font-size:10px;color:#64748b;margin-top:1px;display:flex;gap:4px;">
            ${hasAns   ? '<span style="background:#f0fdf4;color:#16a34a;padding:1px 5px;border-radius:999px;font-weight:700;">✓ Жауап</span>' : ''}
            ${hasPhoto ? '<span style="background:#f0f9ff;color:#0369a1;padding:1px 5px;border-radius:999px;font-weight:700;">📷</span>' : ''}
          </div>
        </div>
        <span style="width:8px;height:8px;border-radius:50%;background:${hasAns?'#16a34a':'#e2e6f0'};flex-shrink:0;"></span>
      </div>`;
  }).join("");
}

window.filterSpStudents = function(val) {
  renderSpStudentList(window._spAllStudents || {}, val);
};

// ── Оқушыны таңдау ─────────────────────────────────
window.selectSpStudent = function(id) {
  window._spSelected = id;
  const s = (window._spAllStudents || {})[id];
  if (!s) return;

  renderSpStudentList(window._spAllStudents || {});
  renderStudentCard(id, s);
};

// ── Жеке карточка ───────────────────────────────────
function renderStudentCard(id, student) {
  const wrap = document.getElementById("spDetailWrap");
  if (!wrap) return;

  const answers  = Object.values(analyticsData.answers  || {});
  const photos   = Object.values(analyticsData.photos   || {});
  const emotions = Object.values(analyticsData.emotions || {});

  const myAnswers   = answers.filter(a  => a.name === student.name);
  const myPhotos    = photos.filter(p   => p.name === student.name);
  const myEmotions  = emotions.filter(e => e.name === student.name);

  const joinTime = student.time
    ? new Date(student.time).toLocaleTimeString("kk-KZ", { hour:"2-digit", minute:"2-digit" })
    : "--";

  // Белсенділік скор
  const totalStudents = Object.keys(window._spAllStudents||{}).length || 1;
  const allAnswers    = answers.length;
  const myScore       = myAnswers.length > 0 ? Math.min(100, Math.round(
    (myAnswers.length / Math.max(allAnswers / totalStudents, 1)) * 100
  )) : 0;

  const scoreColor = myScore >= 80 ? "#16a34a" : myScore >= 50 ? "#d97706" : "#dc2626";
  const scoreBg    = myScore >= 80 ? "#f0fdf4" : myScore >= 50 ? "#fef3c7" : "#fef2f2";
  const scoreBd    = myScore >= 80 ? "#86efac" : myScore >= 50 ? "#fde68a" : "#fca5a5";

  wrap.innerHTML = `
    <!-- Профиль -->
    <div style="background:white;border-radius:18px;padding:20px;margin-bottom:14px;border:1px solid #e2e6f0;display:flex;align-items:center;gap:16px;">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#eef2ff,#f0fdf4);border:3px solid #c7d2fe;display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;">
        ${student.avatar||"🙂"}
      </div>
      <div style="flex:1;">
        <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px;">${student.name||"--"}</div>
        <div style="font-size:12px;color:#64748b;">🕐 Қосылды: ${joinTime}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">📚 Бөлме: ${currentRoom||"--"}</div>
      </div>
      <div style="background:${scoreBg};border:2px solid ${scoreBd};border-radius:16px;padding:12px 20px;text-align:center;flex-shrink:0;">
        <div style="font-size:32px;font-weight:800;color:${scoreColor};">${myScore}%</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">Белсенділік</div>
      </div>
    </div>

    <!-- Статистика -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
      ${[
        ["✏️","Жауаптар",myAnswers.length,"#4f46e5","#eef2ff","#c7d2fe"],
        ["📷","Фотолар",myPhotos.length,"#0369a1","#e0f2fe","#7dd3fc"],
        ["😊","Эмоциялар",myEmotions.length,"#7c3aed","#fdf4ff","#e9d5ff"],
      ].map(([icon,label,val,c,bg,bd]) => `
        <div style="background:${bg};border:1.5px solid ${bd};border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:22px;margin-bottom:4px;">${icon}</div>
          <div style="font-size:24px;font-weight:800;color:${c};">${val}</div>
          <div style="font-size:11px;color:#64748b;">${label}</div>
        </div>`).join("")}
    </div>

    <!-- Прогресс бары -->
    <div style="background:white;border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid #e2e6f0;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📊 Сабақтағы белсенділік</div>
      ${[
        ["Жауап берді", myAnswers.length > 0, "#4f46e5"],
        ["Фото жіберді", myPhotos.length > 0, "#0369a1"],
        ["Эмоция білдірді", myEmotions.length > 0, "#7c3aed"],
      ].map(([label, done, color]) => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:5px;">
            <span>${label}</span>
            <span style="font-weight:700;color:${done?color:'#94a3b8'}">${done?"✅ Иә":"⬜ Жоқ"}</span>
          </div>
          <div style="background:#f0f2f8;border-radius:999px;height:8px;overflow:hidden;">
            <div style="height:100%;border-radius:999px;background:${color};width:${done?'100%':'0%'};transition:width .5s;"></div>
          </div>
        </div>`).join("")}
    </div>

    <!-- Жауаптар тізімі -->
    ${myAnswers.length > 0 ? `
      <div style="background:white;border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">✏️ Жауаптар тарихы</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${myAnswers.map((a,i) => `
            <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:10px;padding:10px 12px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:11px;font-weight:700;color:#4f46e5;">#${i+1}</span>
                <span style="font-size:10px;color:#94a3b8;">${a.time?new Date(a.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"}):"--"}</span>
              </div>
              <div style="font-size:13px;color:#334155;">${a.text||"--"}</div>
            </div>`).join("")}
        </div>
      </div>` : ""}

    <!-- Фотолар -->
    ${myPhotos.length > 0 ? `
      <div style="background:white;border-radius:16px;padding:16px;margin-bottom:14px;border:1px solid #e2e6f0;">
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">📷 Жіберілген фотолар</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;">
          ${myPhotos.map(p => `
            <div style="border-radius:10px;overflow:hidden;border:1px solid #e2e6f0;aspect-ratio:1;">
              <img src="${p.url||""}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>
            </div>`).join("")}
        </div>
      </div>` : ""}

    <!-- AI Бағалау -->
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px;padding:16px;">
      <div style="font-size:13px;font-weight:700;color:white;margin-bottom:10px;">⚡ AI Бағалама жасау</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:10px;">
        Оқушының сабақтағы жұмысы бойынша AI пікір жазады
      </div>
      <button onclick="generateStudentAIFeedback('${student.name}',${myAnswers.length},${myPhotos.length},${myScore})" style="
        width:100%;padding:10px;border:none;border-radius:10px;
        background:rgba(255,255,255,0.2);color:white;
        font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
        border:1.5px solid rgba(255,255,255,0.3);
      ">🤖 AI бағалама алу</button>
      <div id="spAIFeedback" style="margin-top:10px;font-size:12px;color:rgba(255,255,255,0.9);line-height:1.6;"></div>
    </div>
  `;
}

// ── AI Бағалама ─────────────────────────────────────
window.generateStudentAIFeedback = async function(name, answers, photos, score) {
  const el = document.getElementById("spAIFeedback");
  if (!el) return;
  el.textContent = "⏳ AI жазып жатыр...";

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "feedback",
        prompt: `Оқушы: "${name}". Сабақта: ${answers} жауап берді, ${photos} фото жіберді. Белсенділік: ${score}%. Осы деректер бойынша оқушыға қысқа (3-4 сөйлем) конструктивті бағалама жаз. Мадақтаумен бастап, кеңеспен аяқта.`,
        lang: currentLang || "kk"
      })
    });
    const data = await res.json();
    el.textContent = data.answer || "Бағалама алынбады";
  } catch(e) {
    el.textContent = "Қате: " + e.message;
  }
};

// ── CSV экспорт ─────────────────────────────────────
window.exportProgressCSV = function() {
  const students = Object.values(window._spAllStudents || {});
  if (!students.length) { showToast("⚠️ Деректер жоқ!", "warn"); return; }

  const answers = Object.values(analyticsData.answers || {});
  const photos  = Object.values(analyticsData.photos  || {});

  const rows = [["Аты","Аватар","Қосылды","Жауаптар","Фотолар","Белсенділік"]];
  students.forEach(s => {
    const myAns   = answers.filter(a => a.name === s.name).length;
    const myPhoto = photos.filter(p => p.name === s.name).length;
    const score   = myAns > 0 ? "✅" : "⬜";
    rows.push([
      s.name||"--", s.avatar||"",
      s.time ? new Date(s.time).toLocaleTimeString("kk-KZ") : "",
      myAns, myPhoto, score
    ]);
  });

  const csv  = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `оқушылар_прогресі_${new Date().toLocaleDateString("kk-KZ").replace(/\./g,"-")}.csv`;
  a.click();
};

// =====================================================
// ШАМ 31: АТА-АНА ХАБАРЛАМАСЫ
// AI автоматты жазады → WhatsApp / Email / Көшіру
// =====================================================

window.openParentMessage = function() {
  if (document.getElementById("pmModal")) {
    document.getElementById("pmModal").style.display = "flex";
    loadPmStudents();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "pmModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(900px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#065f46,#059669,#34d399);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">💌 Ата-ана хабарламасы</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">AI автоматты хабарлама жазады → WhatsApp / Email</div>
    </div>
    <button onclick="document.getElementById('pmModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
  `;

  // Body
  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- форма
  const left = document.createElement("div");
  left.style.cssText = "width:300px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#f0fdf4;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;">Хабарлама параметрлері</div>

    <!-- Оқушы таңдау -->
    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Оқушы</label>
      <select id="pmStudent" onchange="pmStudentChanged()" style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;background:#fff;box-sizing:border-box;">
        <option value="">-- Таңдаңыз --</option>
      </select>
    </div>

    <!-- Хабарлама типі -->
    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">Хабарлама түрі</label>
      <div style="display:flex;flex-direction:column;gap:5px;" id="pmTypeBtns">
        ${[
          ["positive","✅ Мадақтау","Жақсы нәтиже, мадақ"],
          ["progress","📈 Прогресс","Дамуы туралы"],
          ["concern","⚠️ Алаңдаушылық","Назар аудару керек"],
          ["homework","📚 Үй тапсырмасы","Тапсырма хабарламасы"],
          ["general","💬 Жалпы","Жалпы ақпарат"],
        ].map(([v,l,d],i) => `
          <button class="pm-type-btn" data-t="${v}" onclick="setPmType('${v}')" style="
            padding:9px 12px;border-radius:9px;text-align:left;cursor:pointer;
            font-size:12px;font-weight:700;font-family:inherit;
            border:1.5px solid ${i===0?'#86efac':'#e2e6f0'};
            background:${i===0?'#f0fdf4':'#fff'};color:#334155;
            display:flex;flex-direction:column;gap:1px;
          ">
            <span>${l}</span>
            <span style="font-size:10px;font-weight:400;color:#94a3b8;">${d}</span>
          </button>`).join("")}
      </div>
    </div>

    <!-- Тіл -->
    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Тіл</label>
      <div style="display:flex;gap:5px;">
        ${[["kk","🇰🇿 Қаз"],["ru","🇷🇺 Рус"],["en","🇬🇧 Eng"]].map(([v,l],i) => `
          <button class="pm-lang-btn" data-l="${v}" onclick="setPmLang('${v}')" style="
            flex:1;padding:7px 5px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            border:1.5px solid ${i===0?'#86efac':'#e2e6f0'};
            background:${i===0?'#f0fdf4':'#fff'};color:#334155;
          ">${l}</button>`).join("")}
      </div>
    </div>

    <!-- Қосымша ескертпе -->
    <div style="margin-bottom:14px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Қосымша ескертпе (міндетті емес)</label>
      <textarea id="pmNote" rows="3" placeholder="Мысалы: Ертең сынақ жұмысы бар..."
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:12px;font-family:inherit;resize:none;background:#fff;box-sizing:border-box;"></textarea>
    </div>

    <!-- Генерация -->
    <button id="pmGenBtn" onclick="generateParentMsg()" style="
      width:100%;padding:12px;border:none;border-radius:12px;
      background:linear-gradient(135deg,#059669,#10b981);
      color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;
      box-shadow:0 4px 14px rgba(5,150,105,0.3);margin-bottom:8px;
    ">⚡ AI хабарлама жасау</button>

    <!-- Статус -->
    <div id="pmStatus" style="font-size:11px;color:#64748b;text-align:center;min-height:16px;"></div>
  `;

  // RIGHT -- preview + жіберу
  const right = document.createElement("div");
  right.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;";
  right.innerHTML = `
    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid #e2e6f0;background:#fff;flex-shrink:0;">
      ${[["single","Жеке хабарлама"],["bulk","Топтық жіберу"]].map(([v,l],i) => `
        <button class="pm-tab-btn" data-tab="${v}" onclick="setPmTab('${v}')" style="
          padding:12px 18px;border:none;background:transparent;
          font-size:13px;font-weight:${i===0?'700':'600'};cursor:pointer;font-family:inherit;
          color:${i===0?'#4f46e5':'#64748b'};
          border-bottom:2px solid ${i===0?'#4f46e5':'transparent'};
        ">${l}</button>`).join("")}
    </div>

    <!-- Single -->
    <div id="pmSinglePanel" style="flex:1;overflow-y:auto;padding:16px;">

      <!-- Message preview -->
      <div style="background:#e9f5e9;border-radius:18px 18px 18px 4px;padding:14px 16px;margin-bottom:14px;min-height:100px;border:1px solid #c8e6c9;">
        <div style="font-size:10px;font-weight:700;color:#2e7d32;margin-bottom:6px;display:flex;align-items:center;gap:5px;">
          <span style="width:8px;height:8px;border-radius:50%;background:#25d366;display:inline-block;"></span>
          WhatsApp хабарламасы
        </div>
        <div id="pmMsgPreview" style="font-size:13px;color:#1b5e20;line-height:1.6;white-space:pre-wrap;min-height:60px;">
          <span style="color:#94a3b8;font-style:italic;">AI хабарлама осында шығады...</span>
        </div>
      </div>

      <!-- Actions -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <button onclick="sendWhatsApp()" style="
          padding:12px;border:none;border-radius:12px;
          background:linear-gradient(135deg,#128c7e,#25d366);
          color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
          display:flex;align-items:center;justify-content:center;gap:6px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          WhatsApp
        </button>
        <button onclick="sendEmail()" style="
          padding:12px;border:none;border-radius:12px;
          background:linear-gradient(135deg,#1a73e8,#4285f4);
          color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
          display:flex;align-items:center;justify-content:center;gap:6px;
        ">📧 Email</button>
      </div>
      <button onclick="copyPmMsg()" style="
        width:100%;padding:10px;border:1.5px solid #e2e6f0;border-radius:10px;
        background:#f9fafb;color:#374151;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
      ">📋 Хабарламаны көшіру</button>

      <!-- Phone input -->
      <div style="margin-top:12px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Ата-ана телефоны (WhatsApp үшін)</label>
        <input id="pmPhone" type="tel" placeholder="+7 777 123 45 67"
          style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
      </div>

      <!-- Email input -->
      <div style="margin-top:8px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Email</label>
        <input id="pmEmail" type="email" placeholder="parent@mail.com"
          style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
      </div>
    </div>

    <!-- Bulk -->
    <div id="pmBulkPanel" style="display:none;flex:1;overflow-y:auto;padding:16px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">Барлық оқушыларға хабарлама</div>
      <div id="pmBulkList" style="display:flex;flex-direction:column;gap:8px;">
        <div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px;">Алдымен AI хабарлама жасаңыз</div>
      </div>
    </div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._pmType = "positive";
  window._pmLang = "kk";
  window._pmMsg  = "";
  loadPmStudents();
};

// ── Студенттерді жүктеу ─────────────────────────────
function loadPmStudents() {
  const sel = document.getElementById("pmStudent");
  if (!sel) return;
  const students = Object.values(analyticsData.students || {});
  sel.innerHTML = '<option value="">-- Таңдаңыз --</option>' +
    students.map(s => `<option value="${s.name}">${s.avatar||"🙂"} ${s.name||"--"}</option>`).join("");
}

// ── Тип + Тіл таңдау ───────────────────────────────
window.setPmType = function(t) {
  window._pmType = t;
  document.querySelectorAll(".pm-type-btn").forEach(btn => {
    const isA = btn.dataset.t === t;
    btn.style.borderColor = isA ? "#86efac" : "#e2e6f0";
    btn.style.background  = isA ? "#f0fdf4" : "#fff";
  });
};

window.setPmLang = function(l) {
  window._pmLang = l;
  document.querySelectorAll(".pm-lang-btn").forEach(btn => {
    const isA = btn.dataset.l === l;
    btn.style.borderColor = isA ? "#86efac" : "#e2e6f0";
    btn.style.background  = isA ? "#f0fdf4" : "#fff";
  });
};

window.setPmTab = function(tab) {
  document.querySelectorAll(".pm-tab-btn").forEach(btn => {
    const isA = btn.dataset.tab === tab;
    btn.style.color = isA ? "#4f46e5" : "#64748b";
    btn.style.borderBottomColor = isA ? "#4f46e5" : "transparent";
    btn.style.fontWeight = isA ? "700" : "600";
  });
  document.getElementById("pmSinglePanel").style.display = tab === "single" ? "block" : "none";
  document.getElementById("pmBulkPanel").style.display   = tab === "bulk"   ? "block" : "none";
};

window.pmStudentChanged = function() {
  const preview = document.getElementById("pmMsgPreview");
  if (preview) preview.innerHTML = '<span style="color:#94a3b8;font-style:italic;">AI хабарлама осында шығады...</span>';
  window._pmMsg = "";
};

// ── AI Хабарлама жасау ──────────────────────────────
window.generateParentMsg = async function() {
  const studentName = document.getElementById("pmStudent")?.value;
  const note        = document.getElementById("pmNote")?.value.trim() || "";
  const btn         = document.getElementById("pmGenBtn");
  const status      = document.getElementById("pmStatus");

  if (!studentName) {
    if (status) { status.textContent = "❗ Оқушы таңдаңыз!"; status.style.color = "#dc2626"; }
    return;
  }

  // Оқушы деректері
  const answers  = Object.values(analyticsData.answers  || {}).filter(a => a.name === studentName);
  const photos   = Object.values(analyticsData.photos   || {}).filter(p => p.name === studentName);
  const emotions = Object.values(analyticsData.emotions || {}).filter(e => e.name === studentName);
  const hasAns   = answers.length > 0;
  const hasPhoto = photos.length > 0;

  if (btn) { btn.disabled = true; btn.textContent = "⏳ Жасалуда..."; }
  if (status) { status.textContent = "AI жазып жатыр..."; status.style.color = "#f59e0b"; }

  const TYPE_PROMPTS = {
    positive:  "Оқушының жақсы нәтижесі туралы ата-анаға мадақтау хабарламасы жаз.",
    progress:  "Оқушының сабақтағы дамуы мен прогресі туралы хабарлама жаз.",
    concern:   "Оқушының сабақта белсенді болмауы туралы мұғалімнің алаңдаушылығын ата-анаға жеткіз (дұрыс, мейірімді тонмен).",
    homework:  "Оқушының үй тапсырмасын орындауы туралы қысқа еске салу хабарламасы жаз.",
    general:   "Мұғалімнен ата-анаға жалпы сабақ туралы хабарлама жаз.",
  };

  const langNames = { kk:"қазақ", ru:"орыс", en:"ағылшын" };
  const lang = window._pmLang || "kk";
  const type = window._pmType || "positive";

  const prompt = `Мұғалімнің атынан ата-анаға хабарлама жаз.
Тіл: ${langNames[lang]}
Оқушы: ${studentName}
Жауаптар берді: ${hasAns ? answers.length + " рет" : "жоқ"}
Фото жіберді: ${hasPhoto ? "иә" : "жоқ"}
${note ? "Қосымша: " + note : ""}

${TYPE_PROMPTS[type]}

Хабарлама 4-6 сөйлемнен тұрсын. Достық тонда, кәсіби. Мұғалім аты орнына "Мұғалім" деп жаз.
Тек хабарлама мәтінін бер, бастапқы немесе аяқтаушы сөздер жазба.`;

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", prompt, lang })
    });
    const data = await res.json();
    window._pmMsg = data.answer || "";

    const preview = document.getElementById("pmMsgPreview");
    if (preview) preview.textContent = window._pmMsg;

    if (status) { status.textContent = "✅ Хабарлама дайын!"; status.style.color = "#10b981"; }

    // Bulk panel-ді жаңарту
    updateBulkPanel(studentName, window._pmMsg);

  } catch(e) {
    if (status) { status.textContent = "Қате: " + e.message; status.style.color = "#dc2626"; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ AI хабарлама жасау"; }
  }
};

// ── WhatsApp жіберу ─────────────────────────────────
window.sendWhatsApp = function() {
  const msg   = window._pmMsg;
  const phone = document.getElementById("pmPhone")?.value.trim().replace(/\D/g,"") || "";
  if (!msg) { showToast("Алдымен хабарлама жасаңыз!", "info"); return; }
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
};

// ── Email жіберу ────────────────────────────────────
window.sendEmail = function() {
  const msg   = window._pmMsg;
  const email = document.getElementById("pmEmail")?.value.trim() || "";
  if (!msg) { showToast("Алдымен хабарлама жасаңыз!", "info"); return; }
  const student = document.getElementById("pmStudent")?.value || "Оқушы";
  const subject = encodeURIComponent(`Мұғалімнен хабарлама -- ${student}`);
  const body    = encodeURIComponent(msg);
  window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
};

// ── Хабарламаны көшіру ──────────────────────────────
window.copyPmMsg = function() {
  const msg = window._pmMsg;
  if (!msg) { showToast("Алдымен хабарлама жасаңыз!", "info"); return; }
  navigator.clipboard.writeText(msg).then(() => {
    const btn = event.target;
    btn.textContent = "✅ Көшірілді!";
    btn.style.background = "#f0fdf4";
    btn.style.borderColor = "#86efac";
    btn.style.color = "#16a34a";
    setTimeout(() => {
      btn.textContent = "📋 Хабарламаны көшіру";
      btn.style.background = "#f9fafb";
      btn.style.borderColor = "#e2e6f0";
      btn.style.color = "#374151";
    }, 2000);
  });
};

// ── Топтық жіберу панелі ────────────────────────────
function updateBulkPanel(studentName, msg) {
  const list = document.getElementById("pmBulkList");
  if (!list) return;

  const students = Object.values(analyticsData.students || {});
  if (!students.length) return;

  // Жаңа карточка қосу
  const existing = list.querySelector(`[data-student="${studentName}"]`);
  if (existing) {
    existing.querySelector(".pm-bulk-msg").textContent = msg;
    return;
  }

  if (list.querySelector(".pm-bulk-empty")) {
    list.innerHTML = "";
  }

  const s    = students.find(st => st.name === studentName);
  const card = document.createElement("div");
  card.dataset.student = studentName;
  card.style.cssText   = "background:#f8f9ff;border:1px solid #e2e6f0;border-radius:12px;padding:12px;";
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <span style="font-size:18px;">${s?.avatar||"🙂"}</span>
      <span style="font-size:13px;font-weight:700;color:#0f172a;">${studentName}</span>
      <div style="margin-left:auto;display:flex;gap:5px;">
        <button onclick="bulkWhatsApp('${studentName}')" style="background:#25d366;color:white;border:none;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;">WA</button>
        <button onclick="bulkCopy('${studentName}')" style="background:#f9fafb;border:1px solid #e2e6f0;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:700;cursor:pointer;color:#334155;">📋</button>
      </div>
    </div>
    <div class="pm-bulk-msg" style="font-size:12px;color:#334155;line-height:1.5;background:#fff;border-radius:8px;padding:8px;border:1px solid #e2e6f0;max-height:60px;overflow:hidden;cursor:pointer;" onclick="this.style.maxHeight=this.style.maxHeight==='60px'?'none':'60px'">${msg}</div>
  `;
  list.appendChild(card);
  window[`_pmMsg_${studentName}`] = msg;
}

window.bulkWhatsApp = function(name) {
  const msg = window[`_pmMsg_${name}`] || "";
  if (!msg) return;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
};

window.bulkCopy = function(name) {
  const msg = window[`_pmMsg_${name}`] || "";
  if (msg) navigator.clipboard.writeText(msg);
};

// =====================================================
// ШАМ 32: МҰҒАЛІМ ПОРТФОЛИОСЫ
// Атестация үшін кәсіби PDF есеп
// Барлық сабақтар + статистика + AI пікір
// =====================================================

window.openPortfolio = function() {
  if (document.getElementById("pfModal")) {
    document.getElementById("pfModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "pfModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(920px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#1e1b4b,#4338ca,#6366f1);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">📁 Мұғалім портфолиосы</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Атестация үшін кәсіби PDF есеп</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="generatePortfolioPDF()" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">🖨 PDF жасау</button>
      <button onclick="document.getElementById('pfModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  // Body
  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- деректер енгізу
  const left = document.createElement("div");
  left.style.cssText = "width:300px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#fafbff;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;">Мұғалім туралы</div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Аты-жөні</label>
      <input id="pfName" type="text" placeholder="Мырзаева Назгүл Асқарқызы"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updatePfPreview()"/>
    </div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Мектеп / Мекеме</label>
      <input id="pfSchool" type="text" placeholder="№25 жалпы орта білім беретін мектеп"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updatePfPreview()"/>
    </div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Пән</label>
      <input id="pfSubject" type="text" placeholder="Математика"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;" oninput="updatePfPreview()"/>
    </div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Санат / Дәреже</label>
      <select id="pfCategory" style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;background:#fff;" oninput="updatePfPreview()">
        <option>Мұғалім</option>
        <option>Педагог-сарапшы</option>
        <option>Педагог-зерттеуші</option>
        <option>Педагог-шебер</option>
        <option>Магистр</option>
      </select>
    </div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Педагогикалық өтіл</label>
      <input id="pfExperience" type="text" placeholder="10 жыл"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
    </div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Оқу жылы</label>
      <input id="pfYear" type="text" placeholder="2024-2025"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
    </div>

    <div style="margin-bottom:9px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Email</label>
      <input id="pfEmail" type="email" placeholder="teacher@school.kz"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
    </div>

    <div style="margin-bottom:14px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Қосымша жетістіктер</label>
      <textarea id="pfAchievements" rows="4" placeholder="• Облыстық олимпиада жеңімпаздары дайындадым&#10;• Ашық сабақтар өткіздім&#10;• Семинарларға қатыстым"
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;resize:none;box-sizing:border-box;"></textarea>
    </div>

    <button id="pfAIBtn" onclick="generatePfAISummary()" style="
      width:100%;padding:10px;border:none;border-radius:10px;
      background:linear-gradient(135deg,#4f46e5,#7c3aed);
      color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
      margin-bottom:8px;
    ">⚡ AI қорытынды жасау</button>

    <button onclick="generatePortfolioPDF()" style="
      width:100%;padding:10px;border:none;border-radius:10px;
      background:linear-gradient(135deg,#1e1b4b,#4338ca);
      color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
      box-shadow:0 4px 12px rgba(67,56,202,0.3);
    ">🖨 PDF басып шығару</button>
  `;

  // RIGHT -- preview
  const right = document.createElement("div");
  right.style.cssText = "flex:1;overflow-y:auto;padding:16px;background:#f0f2f8;";
  right.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;text-align:center;">Портфолио алдын ала қарау</div>
    <div id="pfPreview" style="background:white;border-radius:16px;padding:0;border:1px solid #e2e6f0;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);"></div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  // Бүгінгі жылды орнату
  const yr = new Date().getFullYear();
  document.getElementById("pfYear").value = `${yr-1}-${yr}`;
  window._pfAISummary = "";
  updatePfPreview();
};

// ── Preview жаңарту ─────────────────────────────────
window.updatePfPreview = function() {
  const preview = document.getElementById("pfPreview");
  if (!preview) return;
  preview.innerHTML = buildPortfolioHTML(false);
};

// ── Статистика жинау ────────────────────────────────
function collectStats() {
  const students = Object.values(analyticsData.students || {});
  const answers  = Object.values(analyticsData.answers  || {});
  const photos   = Object.values(analyticsData.photos   || {});
  const emotions = analyticsData.emotions || {};

  const answeredNames = new Set(answers.map(a => a.name));
  const actPct = students.length > 0
    ? Math.round((answeredNames.size / students.length) * 100) : 0;

  const topEmo = Object.entries(emotions).sort((a,b)=>b[1]-a[1])[0];

  return { students, answers, photos, emotions, actPct, topEmo };
}

// ── Portfolio HTML ──────────────────────────────────
function buildPortfolioHTML(forPrint) {
  const name         = document.getElementById("pfName")?.value.trim() || "Мұғалім аты";
  const school       = document.getElementById("pfSchool")?.value.trim() || "Мектеп";
  const subject      = document.getElementById("pfSubject")?.value.trim() || "Пән";
  const category     = document.getElementById("pfCategory")?.value || "Мұғалім";
  const experience   = document.getElementById("pfExperience")?.value.trim() || "";
  const year         = document.getElementById("pfYear")?.value.trim() || "";
  const email        = document.getElementById("pfEmail")?.value.trim() || "";
  const achievements = document.getElementById("pfAchievements")?.value.trim() || "";
  const aiSummary    = window._pfAISummary || "";
  const stats        = collectStats();
  const today        = new Date().toLocaleDateString("kk-KZ", { year:"numeric", month:"long", day:"numeric" });

  return `
    <!-- Cover -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4338ca,#6366f1);padding:${forPrint?'40px':'28px'} ${forPrint?'50px':'32px'};text-align:center;color:white;">
      <div style="font-size:${forPrint?'13':'11'}px;letter-spacing:.2em;text-transform:uppercase;opacity:.7;margin-bottom:8px;">КӘСІБИ ПОРТФОЛИО</div>
      <div style="font-size:${forPrint?'32':'24'}px;font-weight:800;margin-bottom:6px;">${name}</div>
      <div style="font-size:${forPrint?'16':'13'}px;opacity:.85;margin-bottom:4px;">${category} • ${subject}</div>
      <div style="font-size:${forPrint?'13':'11'}px;opacity:.7;">${school}</div>
      ${year ? `<div style="font-size:${forPrint?'12':'10'}px;opacity:.6;margin-top:6px;">${year} оқу жылы</div>` : ""}
    </div>

    <!-- Stats -->
    <div style="padding:${forPrint?'28px':'18px'} ${forPrint?'40px':'24px'};">
      <div style="font-size:${forPrint?'18':'14'}px;font-weight:800;color:#1e1b4b;margin-bottom:${forPrint?'16':'12'}px;padding-bottom:8px;border-bottom:2px solid #e2e6f0;">
        📊 SmartBoardAI PRO -- Сабақ статистикасы
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${forPrint?'14':'10'}px;margin-bottom:${forPrint?'24':'16'}px;">
        ${[
          ["👥",stats.students.length,"Оқушылар","#4f46e5","#eef2ff","#c7d2fe"],
          ["✏️",stats.answers.length,"Жауаптар","#16a34a","#f0fdf4","#86efac"],
          ["📷",stats.photos.length,"Фотолар","#0369a1","#e0f2fe","#7dd3fc"],
          ["📈",stats.actPct+"%","Белсенділік","#7c3aed","#fdf4ff","#e9d5ff"],
        ].map(([ic,val,lbl,c,bg,bd]) => `
          <div style="background:${bg};border:1.5px solid ${bd};border-radius:${forPrint?'14':'10'}px;padding:${forPrint?'14':'10'}px;text-align:center;">
            <div style="font-size:${forPrint?'22':'18'}px;margin-bottom:4px;">${ic}</div>
            <div style="font-size:${forPrint?'26':'20'}px;font-weight:800;color:${c};">${val}</div>
            <div style="font-size:${forPrint?'11':'10'}px;color:#64748b;">${lbl}</div>
          </div>`).join("")}
      </div>

      <!-- Teacher info -->
      <div style="font-size:${forPrint?'18':'14'}px;font-weight:800;color:#1e1b4b;margin-bottom:${forPrint?'14':'10'}px;padding-bottom:8px;border-bottom:2px solid #e2e6f0;">
        👤 Жеке мәліметтер
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:${forPrint?'10':'8'}px;margin-bottom:${forPrint?'20':'14'}px;">
        ${[
          ["Аты-жөні", name],
          ["Мекеме", school],
          ["Пән", subject],
          ["Санат", category],
          ["Педагогикалық өтіл", experience||"--"],
          ["Email", email||"--"],
        ].map(([l,v]) => `
          <div style="background:#f8f9ff;border-radius:${forPrint?'10':'8'}px;padding:${forPrint?'10':'8'}px 12px;border:1px solid #e2e6f0;">
            <div style="font-size:${forPrint?'11':'10'}px;color:#94a3b8;margin-bottom:2px;">${l}</div>
            <div style="font-size:${forPrint?'13':'12'}px;font-weight:700;color:#0f172a;">${v}</div>
          </div>`).join("")}
      </div>

      <!-- Digital tools -->
      <div style="font-size:${forPrint?'18':'14'}px;font-weight:800;color:#1e1b4b;margin-bottom:${forPrint?'14':'10'}px;padding-bottom:8px;border-bottom:2px solid #e2e6f0;">
        💻 Цифрлық технологияларды қолдану
      </div>
      <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:${forPrint?'14':'10'}px;padding:${forPrint?'16':'12'}px;margin-bottom:${forPrint?'20':'14'}px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:${forPrint?'13':'12'}px;color:#334155;">
          ${[
            ["⚡ AI Lesson Flow","Сабақ жоспарлау"],
            ["🎨 AI Дифференциация","Деңгейлік тапсырмалар"],
            ["🗳 Student Voting","Интерактивті дауыс"],
            ["🎮 Kahoot тест","Жарыс тест"],
            ["🖊 Collaborative Board","Бірлескен жұмыс"],
            ["📚 Homework Module","Үй тапсырмасы"],
            ["📊 Analytics Dashboard","Аналитика"],
            ["🏆 AI Сертификат","Марапаттау"],
          ].map(([t,d]) => `
            <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:white;border-radius:8px;border:1px solid #e2e6f0;">
              <span style="font-size:${forPrint?'14':'12'}px;">${t}</span>
              <span style="font-size:${forPrint?'11':'10'}px;color:#64748b;">-- ${d}</span>
            </div>`).join("")}
        </div>
      </div>

      <!-- Achievements -->
      ${achievements ? `
        <div style="font-size:${forPrint?'18':'14'}px;font-weight:800;color:#1e1b4b;margin-bottom:${forPrint?'14':'10'}px;padding-bottom:8px;border-bottom:2px solid #e2e6f0;">
          🏅 Жетістіктер мен марапаттар
        </div>
        <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:${forPrint?'14':'10'}px;padding:${forPrint?'16':'12'}px;margin-bottom:${forPrint?'20':'14'}px;white-space:pre-wrap;font-size:${forPrint?'13':'12'}px;line-height:1.7;color:#334155;">
          ${achievements}
        </div>` : ""}

      <!-- AI Summary -->
      ${aiSummary ? `
        <div style="font-size:${forPrint?'18':'14'}px;font-weight:800;color:#1e1b4b;margin-bottom:${forPrint?'14':'10'}px;padding-bottom:8px;border-bottom:2px solid #e2e6f0;">
          🤖 AI Педагогикалық қорытынды
        </div>
        <div style="background:linear-gradient(135deg,#eef2ff,#fdf4ff);border:1.5px solid #c7d2fe;border-radius:${forPrint?'14':'10'}px;padding:${forPrint?'16':'12'}px;margin-bottom:${forPrint?'20':'14'}px;font-size:${forPrint?'13':'12'}px;line-height:1.7;color:#334155;font-style:italic;">
          ${aiSummary}
        </div>` : ""}

      <!-- Footer -->
      <div style="border-top:2px solid #e2e6f0;padding-top:${forPrint?'16':'12'}px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-size:${forPrint?'13':'11'}px;color:#64748b;">SmartBoardAI PRO арқылы жасалды</div>
          <div style="font-size:${forPrint?'11':'10'}px;color:#94a3b8;">${today}</div>
        </div>
        <div style="text-align:right;">
          <div style="width:140px;height:1px;background:#334155;margin-bottom:4px;margin-left:auto;"></div>
          <div style="font-size:${forPrint?'11':'10'}px;color:#64748b;">Мұғалім қолы</div>
        </div>
      </div>
    </div>
  `;
}

// ── AI Қорытынды ────────────────────────────────────
window.generatePfAISummary = async function() {
  const name     = document.getElementById("pfName")?.value.trim() || "мұғалім";
  const subject  = document.getElementById("pfSubject")?.value.trim() || "пән";
  const exp      = document.getElementById("pfExperience")?.value.trim() || "";
  const stats    = collectStats();
  const btn      = document.getElementById("pfAIBtn");

  if (btn) { btn.disabled = true; btn.textContent = "⏳ AI жазып жатыр..."; }

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        lang: currentLang || "kk",
        prompt: `${name} мұғалімінің педагогикалық портфолиосы үшін кәсіби қорытынды жаз.
Пән: ${subject}. Педагогикалық өтіл: ${exp}.
SmartBoardAI PRO платформасын пайдаланды: ${stats.students.length} оқушымен жұмыс жасады, ${stats.answers.length} жауап жинады, белсенділік ${stats.actPct}%.
4-5 сөйлемнен тұратын ресми, кәсіби педагогикалық қорытынды жаз. Атестация комиссиясына арналған стильде.`
      })
    });
    const data = await res.json();
    window._pfAISummary = data.answer || "";
    updatePfPreview();
  } catch(e) {
    window._pfAISummary = "AI қорытынды алынбады.";
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ AI қорытынды жасау"; }
  }
};

// ── PDF жасау ───────────────────────────────────────
window.generatePortfolioPDF = function() {
  const name = document.getElementById("pfName")?.value.trim() || "portfolio";

  const printDoc = `<!DOCTYPE html>
<html lang="kk">
<head>
  <meta charset="UTF-8">
  <title>Портфолио -- ${name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Inter',sans-serif; background:white; color:#0f172a; }
    @media print {
      @page { size:A4; margin:0; }
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  </style>
</head>
<body>${buildPortfolioHTML(true)}</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { showToast("Браузер popup-ты блоктады. Рұқсат беріңіз.", "info"); return; }
  win.document.write(printDoc);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 600);
};

// =====================================================
// ШАМ 33: MEMORY GAME
// Мұғалім жұп карточка жасайды → тақтада немесе
// оқушы телефонда ойнайды → нәтиже Firebase-та
// =====================================================

window.openMemoryGame = function() {
  if (document.getElementById("mgModal")) {
    document.getElementById("mgModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "mgModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(960px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#be123c,#e11d48,#f43f5e);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">🧠 Memory Game</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Жұп карточкалар -- тақтада немесе телефонда ойнаңыз</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="mgPlayBtn" onclick="launchMemoryGame()" style="display:none;background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">▶ Ойынды бастау</button>
      <button onclick="document.getElementById('mgModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- карточкалар редакторы
  const left = document.createElement("div");
  left.style.cssText = "width:300px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#fff5f5;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">Карточка жұптары</div>

    <!-- AI генерация -->
    <div style="background:linear-gradient(135deg,#fef2f2,#fff5f5);border:1px solid #fecaca;border-radius:12px;padding:12px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;color:#be123c;margin-bottom:8px;">⚡ AI автоматты жасау</div>
      <input id="mgAITopic" type="text" placeholder="Тақырып: Жануарлар, Математика..."
        style="width:100%;padding:8px 10px;border:1.5px solid #fecaca;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;margin-bottom:7px;background:#fff;"/>
      <div style="display:flex;gap:5px;margin-bottom:7px;">
        <select id="mgAIPairs" style="flex:1;padding:7px;border:1.5px solid #fecaca;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;">
          <option value="4">4 жұп</option>
          <option value="6" selected>6 жұп</option>
          <option value="8">8 жұп</option>
          <option value="10">10 жұп</option>
        </select>
        <select id="mgAIType" style="flex:1;padding:7px;border:1.5px solid #fecaca;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;">
          <option value="word">Сөз↔Аударма</option>
          <option value="term">Термин↔Анықтама</option>
          <option value="emoji">Emoji↔Сөз</option>
          <option value="formula">Формула↔Жауап</option>
        </select>
      </div>
      <button id="mgAIBtn" onclick="generateMGPairs()" style="width:100%;padding:9px;border:none;border-radius:9px;background:linear-gradient(135deg,#be123c,#e11d48);color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">⚡ AI жұп жасау</button>
    </div>

    <!-- Қол жұп қосу -->
    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">немесе қол жасаңыз</div>
    <div style="display:flex;gap:5px;margin-bottom:8px;">
      <input id="mgCard1" type="text" placeholder="Жұп 1" style="flex:1;padding:7px 9px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;"/>
      <span style="display:flex;align-items:center;color:#94a3b8;font-size:14px;">↔</span>
      <input id="mgCard2" type="text" placeholder="Жұп 2" style="flex:1;padding:7px 9px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;"/>
      <button onclick="addMGPair()" style="padding:7px 10px;border:none;border-radius:8px;background:#4f46e5;color:white;font-size:14px;font-weight:700;cursor:pointer;">+</button>
    </div>

    <!-- Жұптар тізімі -->
    <div id="mgPairsList" style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;">
      <div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">Жұптар жоқ -- AI немесе қол жасаңыз</div>
    </div>

    <!-- Ойын параметрлері -->
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e6f0;">
      <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Ойын параметрлері</div>
      <div style="display:flex;gap:6px;margin-bottom:6px;">
        <label style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px;">
          <input type="checkbox" id="mgTimer" checked> Таймер
        </label>
        <label style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px;">
          <input type="checkbox" id="mgShuffle" checked> Аралас
        </label>
      </div>
      <select id="mgTheme" style="width:100%;padding:7px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;">
        <option value="default">🎨 Стандарт тақырып</option>
        <option value="ocean">🌊 Мұхит</option>
        <option value="forest">🌲 Орман</option>
        <option value="space">🚀 Ғарыш</option>
        <option value="candy">🍬 Кәмпит</option>
      </select>
    </div>
  `;

  // RIGHT -- preview + ойын
  const right = document.createElement("div");
  right.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;";
  right.innerHTML = `
    <div style="padding:12px 16px;background:white;border-bottom:1px solid #e2e6f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <span style="font-size:12px;font-weight:700;color:#374151;">Алдын ала қарау</span>
      <div id="mgStats" style="font-size:11px;color:#64748b;"></div>
    </div>
    <div id="mgPreview" style="flex:1;overflow-y:auto;padding:16px;background:#f8f9ff;display:flex;align-items:flex-start;justify-content:center;">
      <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
        <div style="font-size:52px;margin-bottom:12px;">🧠</div>
        <div style="font-size:15px;font-weight:700;color:#374151;">Memory Game</div>
        <div style="font-size:13px;margin-top:6px;line-height:1.6;">AI немесе қол жұп жасаңыз,<br>содан соң ойынды бастаңыз</div>
      </div>
    </div>
    <div id="mgGameArea" style="display:none;flex:1;overflow-y:auto;padding:16px;background:#f8f9ff;flex-direction:column;"></div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._mgPairs = [];
  window._mgFlipped = [];
  window._mgMatched = new Set();
  window._mgMoves   = 0;
  window._mgTimer   = null;
  window._mgSecs    = 0;
};

// ── AI жұп жасау ────────────────────────────────────
window.generateMGPairs = async function() {
  const topic  = document.getElementById("mgAITopic")?.value.trim();
  const pairs  = document.getElementById("mgAIPairs")?.value || "6";
  const type   = document.getElementById("mgAIType")?.value || "word";
  const btn    = document.getElementById("mgAIBtn");

  if (!topic) { showToast("⚠️ Тақырып жазыңыз!", "warn"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Жасалуда..."; }

  const typePrompts = {
    word:    `${pairs} сөз↔аударма немесе синоним жұбын жаса`,
    term:    `${pairs} термин↔қысқа анықтама жұбын жаса`,
    emoji:   `${pairs} emoji↔сөз жұбын жаса`,
    formula: `${pairs} формула немесе өрнек↔жауап жұбын жаса`,
  };

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        lang: currentLang || "kk",
        prompt: `Тақырып: "${topic}". ${typePrompts[type]}.
ТІКЕЛЕЙ JSON массив қайтар (ешқандай түсіндірме жазба):
[{"a":"бірінші карточка","b":"екінші карточка"},...]
Тек JSON, басқа ештеңе жазба.`
      })
    });
    const data = await res.json();
    const clean = (data.answer || "").replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean);

    window._mgPairs = parsed.map((p,i) => ({
      id: i, a: p.a || "", b: p.b || ""
    }));
    renderMGPairsList();
    renderMGPreview();

    const playBtn = document.getElementById("mgPlayBtn");
    if (playBtn) playBtn.style.display = "flex";

  } catch(e) {
    showToast("AI қате: " + e.message, "info");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ AI жұп жасау"; }
  }
};

// ── Қол жұп қосу ────────────────────────────────────
window.addMGPair = function() {
  const a = document.getElementById("mgCard1")?.value.trim();
  const b = document.getElementById("mgCard2")?.value.trim();
  if (!a || !b) return;

  (window._mgPairs = window._mgPairs || []).push({
    id: Date.now(), a, b
  });
  document.getElementById("mgCard1").value = "";
  document.getElementById("mgCard2").value = "";
  renderMGPairsList();
  renderMGPreview();

  const playBtn = document.getElementById("mgPlayBtn");
  if (playBtn && window._mgPairs.length >= 2) playBtn.style.display = "flex";
};

window.removeMGPair = function(id) {
  window._mgPairs = (window._mgPairs || []).filter(p => p.id !== id);
  renderMGPairsList();
  renderMGPreview();
};

// ── Жұптар тізімі ───────────────────────────────────
function renderMGPairsList() {
  const el = document.getElementById("mgPairsList");
  if (!el) return;
  const pairs = window._mgPairs || [];

  if (!pairs.length) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">Жұптар жоқ</div>`;
    return;
  }

  el.innerHTML = pairs.map((p,i) => `
    <div style="display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #e2e6f0;border-radius:9px;padding:7px 10px;">
      <span style="font-size:10px;font-weight:700;color:#94a3b8;min-width:16px;">${i+1}</span>
      <span style="flex:1;font-size:12px;color:#334155;font-weight:600;">${p.a}</span>
      <span style="color:#94a3b8;font-size:12px;">↔</span>
      <span style="flex:1;font-size:12px;color:#334155;font-weight:600;">${p.b}</span>
      <button onclick="removeMGPair(${p.id})" style="background:#fef2f2;border:none;border-radius:5px;padding:2px 7px;font-size:11px;color:#dc2626;cursor:pointer;font-weight:700;">✕</button>
    </div>`).join("");

  const stats = document.getElementById("mgStats");
  if (stats) stats.textContent = `${pairs.length} жұп • ${pairs.length * 2} карточка`;
}

// ── Preview ──────────────────────────────────────────
function renderMGPreview() {
  const el = document.getElementById("mgPreview");
  if (!el) return;
  const pairs = window._mgPairs || [];
  if (!pairs.length) return;

  const THEMES = {
    default: { bg:"#4f46e5", front:"#eef2ff", border:"#c7d2fe", text:"#4f46e5" },
    ocean:   { bg:"#0369a1", front:"#e0f2fe", border:"#7dd3fc", text:"#0369a1" },
    forest:  { bg:"#15803d", front:"#f0fdf4", border:"#86efac", text:"#15803d" },
    space:   { bg:"#1e1b4b", front:"#fdf4ff", border:"#e9d5ff", text:"#7c3aed" },
    candy:   { bg:"#be123c", front:"#fff1f2", border:"#fecdd3", text:"#be123c" },
  };
  const theme = THEMES[document.getElementById("mgTheme")?.value || "default"];

  // Барлық карточкалар = пар a + пар b
  const allCards = [];
  pairs.forEach(p => {
    allCards.push({ id: p.id + "_a", pairId: p.id, text: p.a });
    allCards.push({ id: p.id + "_b", pairId: p.id, text: p.b });
  });

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;width:100%;">
      ${allCards.map(c => `
        <div style="aspect-ratio:1;background:${theme.bg};border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(15,23,42,0.12);">
          <div style="width:30px;height:30px;border:3px solid rgba(255,255,255,0.4);border-radius:50%;"></div>
        </div>`).join("")}
    </div>`;
}

// ── Ойынды бастау ───────────────────────────────────
window.launchMemoryGame = function() {
  const pairs = window._mgPairs || [];
  if (pairs.length < 2) { showToast("Кем дегенде 2 жұп керек!", "info"); return; }

  const preview  = document.getElementById("mgPreview");
  const gameArea = document.getElementById("mgGameArea");
  if (preview)  preview.style.display  = "none";
  if (gameArea) gameArea.style.display = "flex";

  const THEMES = {
    default: { bg:"#4f46e5", front:"#eef2ff", border:"#c7d2fe", textColor:"#4f46e5", backText:"white" },
    ocean:   { bg:"#0369a1", front:"#e0f2fe", border:"#7dd3fc", textColor:"#0369a1", backText:"white" },
    forest:  { bg:"#15803d", front:"#f0fdf4", border:"#86efac", textColor:"#15803d", backText:"white" },
    space:   { bg:"#1e1b4b", front:"#fdf4ff", border:"#e9d5ff", textColor:"#7c3aed", backText:"white" },
    candy:   { bg:"#be123c", front:"#fff1f2", border:"#fecdd3", textColor:"#be123c", backText:"white" },
  };
  const themeKey = document.getElementById("mgTheme")?.value || "default";
  const theme    = THEMES[themeKey];

  // Карточкалар жасау
  let allCards = [];
  pairs.forEach(p => {
    allCards.push({ id: p.id + "_a", pairId: p.id, text: p.a });
    allCards.push({ id: p.id + "_b", pairId: p.id, text: p.b });
  });

  // Аралас
  if (document.getElementById("mgShuffle")?.checked) {
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
  }

  window._mgFlipped  = [];
  window._mgMatched  = new Set();
  window._mgMoves    = 0;
  window._mgSecs     = 0;
  window._mgAllCards = allCards;
  window._mgLocked   = false;

  gameArea.innerHTML = `
    <!-- Scoreboard -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-shrink:0;flex-wrap:wrap;">
      <div style="background:white;border:1px solid #e2e6f0;border-radius:10px;padding:8px 14px;text-align:center;">
        <div id="mgMovesCount" style="font-size:20px;font-weight:800;color:#4f46e5;">0</div>
        <div style="font-size:10px;color:#64748b;">Қадам</div>
      </div>
      <div style="background:white;border:1px solid #e2e6f0;border-radius:10px;padding:8px 14px;text-align:center;">
        <div id="mgMatchCount" style="font-size:20px;font-weight:800;color:#16a34a;">0</div>
        <div style="font-size:10px;color:#64748b;">Тапқан</div>
      </div>
      <div style="background:white;border:1px solid #e2e6f0;border-radius:10px;padding:8px 14px;text-align:center;">
        <div id="mgTimerDisp" style="font-size:20px;font-weight:800;color:#f59e0b;">00:00</div>
        <div style="font-size:10px;color:#64748b;">Уақыт</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:6px;">
        <button onclick="launchMemoryGame()" style="padding:7px 14px;border:1px solid #e2e6f0;border-radius:8px;background:#f9fafb;font-size:12px;font-weight:700;cursor:pointer;color:#334155;">↺ Қайта</button>
        <button onclick="addMemoryToBoard()" style="padding:7px 14px;border:none;border-radius:8px;background:#4f46e5;color:white;font-size:12px;font-weight:700;cursor:pointer;">📌 Тақтаға</button>
      </div>
    </div>

    <!-- Grid -->
    <div id="mgGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px;flex:1;overflow-y:auto;">
      ${allCards.map(c => `
        <div class="mg-card" id="mgc-${c.id}" data-id="${c.id}" data-pair="${c.pairId}"
          onclick="flipCard('${c.id}')"
          style="aspect-ratio:1;border-radius:14px;cursor:pointer;position:relative;
          transform-style:preserve-3d;transition:transform .4s;
          box-shadow:0 4px 12px rgba(15,23,42,0.12);">
          <!-- Back -->
          <div style="position:absolute;inset:0;border-radius:14px;background:${theme.bg};
            display:flex;align-items:center;justify-content:center;backface-visibility:hidden;">
            <span style="font-size:24px;color:${theme.backText};opacity:.5;">?</span>
          </div>
          <!-- Front -->
          <div style="position:absolute;inset:0;border-radius:14px;background:${theme.front};
            border:2px solid ${theme.border};
            display:flex;align-items:center;justify-content:center;
            backface-visibility:hidden;transform:rotateY(180deg);padding:8px;text-align:center;">
            <span style="font-size:13px;font-weight:700;color:${theme.textColor};word-break:break-word;line-height:1.3;">${c.text}</span>
          </div>
        </div>`).join("")}
    </div>
  `;

  // Таймер
  if (document.getElementById("mgTimer")?.checked) {
    if (window._mgTimerInt) clearInterval(window._mgTimerInt);
    window._mgTimerInt = setInterval(() => {
      window._mgSecs++;
      const m = String(Math.floor(window._mgSecs/60)).padStart(2,"0");
      const s = String(window._mgSecs%60).padStart(2,"0");
      const el = document.getElementById("mgTimerDisp");
      if (el) el.textContent = m+":"+s;
    }, 1000);
  }
};

// ── Карточка аудару ──────────────────────────────────
window.flipCard = function(cardId) {
  if (window._mgLocked) return;
  if (window._mgMatched.has(cardId)) return;
  if (window._mgFlipped.includes(cardId)) return;

  const card = document.getElementById("mgc-" + cardId);
  if (!card) return;

  // Аудару анимациясы
  card.style.transform = "rotateY(180deg)";
  window._mgFlipped.push(cardId);

  if (window._mgFlipped.length === 2) {
    window._mgMoves++;
    const movesEl = document.getElementById("mgMovesCount");
    if (movesEl) movesEl.textContent = window._mgMoves;

    window._mgLocked = true;
    const [id1, id2] = window._mgFlipped;
    const c1 = document.getElementById("mgc-" + id1);
    const c2 = document.getElementById("mgc-" + id2);

    const pair1 = c1?.dataset.pair;
    const pair2 = c2?.dataset.pair;

    setTimeout(() => {
      if (pair1 === pair2) {
        // Сәйкес!
        [c1, c2].forEach(c => {
          if (c) {
            c.style.transform = "rotateY(180deg) scale(1.05)";
            c.style.boxShadow = "0 0 20px rgba(34,197,94,0.5)";
            c.style.cursor = "default";
            c.onclick = null;
            // Green border
            const front = c.querySelector("div:last-child");
            if (front) { front.style.borderColor = "#22c55e"; front.style.background = "#f0fdf4"; }
          }
        });
        window._mgMatched.add(id1);
        window._mgMatched.add(id2);

        const matchEl = document.getElementById("mgMatchCount");
        if (matchEl) matchEl.textContent = window._mgMatched.size / 2;

        // Жеңіс тексеру
        if (window._mgMatched.size === (window._mgAllCards || []).length) {
          setTimeout(showMGWin, 500);
        }
      } else {
        // Сәйкес емес -- қайтару
        [c1, c2].forEach(c => {
          if (c) {
            c.style.transform = "";
            const front = c.querySelector("div:last-child");
            if (front) { front.style.borderColor = ""; front.style.background = ""; }
          }
        });
      }
      window._mgFlipped = [];
      window._mgLocked  = false;
    }, 900);
  }
};

// ── Жеңіс экраны ────────────────────────────────────
function showMGWin() {
  if (window._mgTimerInt) clearInterval(window._mgTimerInt);
  const m = String(Math.floor(window._mgSecs/60)).padStart(2,"0");
  const s = String(window._mgSecs%60).padStart(2,"0");

  const gameArea = document.getElementById("mgGameArea");
  if (!gameArea) return;

  const win = document.createElement("div");
  win.style.cssText = "position:absolute;inset:0;background:rgba(255,255,255,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;border-radius:0 0 22px 0;";
  win.innerHTML = `
    <div style="text-align:center;padding:30px;">
      <div style="font-size:64px;margin-bottom:12px;">🎉</div>
      <div style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:8px;">Мүкеммел!</div>
      <div style="font-size:15px;color:#64748b;margin-bottom:20px;">Барлық жұптар табылды!</div>
      <div style="display:flex;gap:16px;justify-content:center;margin-bottom:24px;">
        <div style="background:#eef2ff;border:2px solid #c7d2fe;border-radius:14px;padding:14px 20px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#4f46e5;">${window._mgMoves}</div>
          <div style="font-size:11px;color:#64748b;">Қадам</div>
        </div>
        <div style="background:#fef3c7;border:2px solid #fde68a;border-radius:14px;padding:14px 20px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#d97706;">${m}:${s}</div>
          <div style="font-size:11px;color:#64748b;">Уақыт</div>
        </div>
      </div>
      <button onclick="launchMemoryGame()" style="padding:12px 28px;border:none;border-radius:12px;background:linear-gradient(135deg,#be123c,#e11d48);color:white;font-size:14px;font-weight:800;cursor:pointer;margin-right:8px;font-family:inherit;">↺ Қайта ойна</button>
      <button onclick="addMemoryToBoard()" style="padding:12px 28px;border:none;border-radius:12px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">📌 Тақтаға қосу</button>
    </div>`;

  gameArea.style.position = "relative";
  gameArea.appendChild(win);
}

// ── Тақтаға қосу ────────────────────────────────────
window.addMemoryToBoard = function() {
  const pairs = window._mgPairs || [];
  if (!pairs.length) return;

  const html = `
    <div style="background:linear-gradient(135deg,#fef2f2,#fff5f5);border-radius:16px;padding:16px;">
      <div style="font-size:16px;font-weight:800;color:#be123c;margin-bottom:12px;">🧠 Memory Game карточкалары</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${pairs.map(p => `
          <div style="background:white;border:1.5px solid #fecaca;border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:8px;">
            <span style="flex:1;font-size:13px;font-weight:700;color:#be123c;">${p.a}</span>
            <span style="color:#94a3b8;font-size:12px;">↔</span>
            <span style="flex:1;font-size:13px;color:#334155;">${p.b}</span>
          </div>`).join("")}
      </div>
    </div>`;

  addBlock("ai", html);
  document.getElementById("mgModal").style.display = "none";
};

// =====================================================
// ШАМ 34: ALPACA RACE 🦙
// Firebase нақты жарыс -- оқушы жауап берсе alpaca жүреді
// Мұғалім: сұрақ жібереді + жарысты басқарады
// =====================================================

let _raceOn  = false;
let _raceQ   = 0;    // Ағымдағы сұрақ индексі
let _raceQList = [];

window.openAlpacaRace = function() {
  if (document.getElementById("raceModal")) {
    document.getElementById("raceModal").style.display = "flex";
    loadRaceStudents();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "raceModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(1000px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#064e3b,#059669,#34d399);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">🦙 Alpaca Race</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Нақты уақыт жарысы -- дұрыс жауап = алпака алға!</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <div id="raceRoomBadge" style="background:rgba(255,255,255,0.15);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);">Бөлме жоқ</div>
      <button onclick="toggleRace()" id="raceToggleBtn" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">▶ Жарысты бастау</button>
      <button onclick="resetRace()" style="background:rgba(255,255,255,0.12);color:white;border:1.5px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">↺</button>
      <button onclick="document.getElementById('raceModal').style.display='none'" style="background:rgba(255,255,255,0.12);color:white;border:1.5px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- сұрақтар
  const left = document.createElement("div");
  left.style.cssText = "width:300px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#f0fdf4;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">Сұрақтар</div>

    <!-- AI -->
    <div style="background:white;border:1px solid #86efac;border-radius:12px;padding:12px;margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:7px;">⚡ AI сұрақ жасау</div>
      <input id="raceAITopic" type="text" placeholder="Тақырып..."
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;margin-bottom:6px;"/>
      <div style="display:flex;gap:5px;margin-bottom:7px;">
        <select id="raceAICount" style="flex:1;padding:7px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;">
          <option value="3">3 сұрақ</option>
          <option value="5" selected>5 сұрақ</option>
          <option value="8">8 сұрақ</option>
          <option value="10">10 сұрақ</option>
        </select>
      </div>
      <button id="raceAIBtn" onclick="generateRaceQuestions()" style="width:100%;padding:8px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">⚡ AI жасау</button>
    </div>

    <!-- Қол сұрақ -->
    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Немесе қол жасаңыз</div>
    <input id="raceQ" type="text" placeholder="Сұрақ"
      style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;margin-bottom:5px;"/>
    <input id="raceA" type="text" placeholder="Дұрыс жауап"
      style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;margin-bottom:6px;"/>
    <button onclick="addRaceQuestion()" style="width:100%;padding:8px;border:none;border-radius:8px;background:#4f46e5;color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:12px;">+ Сұрақ қосу</button>

    <!-- Тізім -->
    <div id="raceQList" style="display:flex;flex-direction:column;gap:5px;max-height:260px;overflow-y:auto;">
      <div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">Сұрақ жоқ</div>
    </div>

    <!-- Ағымдағы сұрақ -->
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e6f0;">
      <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Сұрақ жіберу</div>
      <button onclick="sendNextQuestion()" style="width:100%;padding:9px;border:none;border-radius:9px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">➡ Келесі сұрақ жіберу</button>
      <div id="raceCurrQ" style="margin-top:8px;font-size:11px;color:#64748b;text-align:center;min-height:14px;"></div>
    </div>
  `;

  // RIGHT -- жарыс треки
  const right = document.createElement("div");
  right.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;background:#f0fdf4;";
  right.innerHTML = `
    <!-- Track -->
    <div style="flex:1;overflow-y:auto;padding:16px;" id="raceTrack">
      <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
        <div style="font-size:64px;margin-bottom:12px;">🦙</div>
        <div style="font-size:15px;font-weight:700;color:#374151;">Жарысты бастаңыз!</div>
        <div style="font-size:13px;margin-top:6px;line-height:1.6;">Сұрақ жасап, жарысты іске қосыңыз.<br>Оқушылар жауап берген сайын алпакалары алға жүреді.</div>
      </div>
    </div>

    <!-- Current Q display -->
    <div style="padding:12px 16px;background:white;border-top:1px solid #e2e6f0;flex-shrink:0;">
      <div id="raceLiveQ" style="font-size:13px;font-weight:700;color:#0f172a;min-height:20px;"></div>
    </div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  _raceQList = [];
  window._raceScores = {};
  loadRaceStudents();
  listenRaceAnswers();

  const badge = document.getElementById("raceRoomBadge");
  if (badge) badge.textContent = currentRoom ? `🟢 ${currentRoom}` : "Бөлме жоқ";
};

// ── Студенттерді жүктеу ─────────────────────────────
function loadRaceStudents() {
  const students = Object.values(analyticsData.students || {});
  window._raceStudents = students;
  renderRaceTrack();
}

// ── AI Сұрақ жасау ──────────────────────────────────
window.generateRaceQuestions = async function() {
  const topic = document.getElementById("raceAITopic")?.value.trim();
  const count = document.getElementById("raceAICount")?.value || "5";
  const btn   = document.getElementById("raceAIBtn");
  if (!topic) { showToast("⚠️ Тақырып жазыңыз!", "warn"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "⏳..."; }

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat", lang: currentLang || "kk",
        prompt: `Тақырып: "${topic}". ${count} қысқа сұрақ жаса.
ТІКЕЛЕЙ JSON массив қайтар:
[{"q":"сұрақ мәтіні","a":"дұрыс жауап"},...]
Тек JSON, басқа ештеңе жазба.`
      })
    });
    const data  = await res.json();
    const clean = (data.answer || "").replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean);
    _raceQList = parsed.map((p,i) => ({ id:i, q:p.q||"", a:p.a||"", sent:false }));
    _raceQ = 0;
    renderRaceQList();
  } catch(e) {
    showToast("AI қате: " + e.message, "info");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ AI жасау"; }
  }
};

// ── Қол сұрақ ───────────────────────────────────────
window.addRaceQuestion = function() {
  const q = document.getElementById("raceQ")?.value.trim();
  const a = document.getElementById("raceA")?.value.trim();
  if (!q || !a) return;
  _raceQList.push({ id: Date.now(), q, a, sent: false });
  document.getElementById("raceQ").value = "";
  document.getElementById("raceA").value = "";
  renderRaceQList();
};

function renderRaceQList() {
  const el = document.getElementById("raceQList");
  if (!el) return;
  if (!_raceQList.length) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">Сұрақ жоқ</div>`;
    return;
  }
  el.innerHTML = _raceQList.map((q,i) => `
    <div style="background:${q.sent?'#f0fdf4':'#fff'};border:1px solid ${q.sent?'#86efac':'#e2e6f0'};border-radius:9px;padding:8px 10px;">
      <div style="font-size:11px;font-weight:700;color:${q.sent?'#16a34a':'#94a3b8'};">${q.sent?'✅':'○'} #${i+1}</div>
      <div style="font-size:12px;color:#334155;margin-top:2px;">${q.q}</div>
      <div style="font-size:11px;color:#64748b;">→ ${q.a}</div>
    </div>`).join("");
}

// ── Келесі сұрақ жіберу ─────────────────────────────
window.sendNextQuestion = async function() {
  if (!currentRoom) { showToast("Бөлме жоқ!", "info"); return; }
  const unsent = _raceQList.filter(q => !q.sent);
  if (!unsent.length) { showToast("Барлық сұрақтар жіберілді!", "info"); return; }
  const q = unsent[0];

  await set(ref(db, `rooms/${currentRoom}/race/question`), {
    id: q.id, q: q.q, answer: q.a, time: Date.now(), active: true
  });

  q.sent = true;
  renderRaceQList();

  const currEl = document.getElementById("raceCurrQ");
  const liveEl = document.getElementById("raceLiveQ");
  if (currEl) currEl.textContent = `Жіберілді: "${q.q}"`;
  if (liveEl) liveEl.innerHTML = `<span style="color:#059669;font-weight:800;">Ағымдағы сұрақ:</span> ${q.q}`;
};

// ── Жарысты қосу/өшіру ──────────────────────────────
window.toggleRace = function() {
  _raceOn = !_raceOn;
  const btn = document.getElementById("raceToggleBtn");
  if (btn) {
    btn.textContent = _raceOn ? "⏸ Тоқтату" : "▶ Жалғастыру";
    btn.style.background = _raceOn ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.15)";
  }
  if (currentRoom) {
    set(ref(db, `rooms/${currentRoom}/race/active`), _raceOn);
  }
  if (_raceOn) renderRaceTrack();
};

// ── Жарысты қайтару ─────────────────────────────────
window.resetRace = function() {
  if (!confirm("Жарысты нөлге қайтарасыз ба?")) return;
  window._raceScores = {};
  _raceOn = false;
  _raceQ  = 0;
  _raceQList.forEach(q => q.sent = false);
  if (currentRoom) {
    set(ref(db, `rooms/${currentRoom}/race`), null);
  }
  const btn = document.getElementById("raceToggleBtn");
  if (btn) { btn.textContent = "▶ Жарысты бастау"; btn.style.background = "rgba(255,255,255,0.15)"; }
  const liveEl = document.getElementById("raceLiveQ");
  if (liveEl) liveEl.innerHTML = "";
  renderRaceQList();
  renderRaceTrack();
};

// ── Firebase тыңдаушы ───────────────────────────────
function listenRaceAnswers() {
  if (!currentRoom) return;
  onValue(ref(db, `rooms/${currentRoom}/race/answers`), (snap) => {
    const answers = snap.val() || {};
    // Скор есептеу
    window._raceScores = {};
    Object.values(answers).forEach(a => {
      if (a.correct) {
        window._raceScores[a.studentId] = (window._raceScores[a.studentId] || 0) + 1;
      }
    });
    // Студент деректерін жаңарту
    onValue(ref(db, `rooms/${currentRoom}/students`), (sSnap) => {
      window._raceStudents = Object.values(sSnap.val() || {});
      renderRaceTrack();
    }, { onlyOnce: true });
  });
}

// ── Жарыс треки ─────────────────────────────────────
function renderRaceTrack() {
  const el = document.getElementById("raceTrack");
  if (!el) return;

  const students = window._raceStudents || Object.values(analyticsData.students || {});
  const scores   = window._raceScores || {};
  const maxQ     = _raceQList.filter(q => q.sent).length || 1;

  if (!students.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:40px;color:#94a3b8;">
        <div style="font-size:48px;">🦙</div>
        <div style="font-size:14px;font-weight:700;margin-top:10px;">Оқушылар жоқ</div>
        <div style="font-size:12px;margin-top:4px;">Бөлме ашып, оқушылар қосылсын</div>
      </div>`;
    return;
  }

  const ALPACAS = ["🦙","🐪","🐎","🐴","🦌","🐂","🦬","🐏"];
  const COLORS  = [
    ["#ef4444","#fef2f2"],["#3b82f6","#eff6ff"],["#f59e0b","#fffbeb"],
    ["#10b981","#f0fdf4"],["#8b5cf6","#faf5ff"],["#ec4899","#fdf2f8"],
    ["#06b6d4","#ecfeff"],["#f97316","#fff7ed"],
  ];

  // Сорттау -- скор бойынша
  const sorted = [...students].map(s => ({
    ...s,
    score: scores[s.studentId || s.name] || 0,
  })).sort((a,b) => b.score - a.score);

  el.innerHTML = `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#64748b;margin-bottom:4px;">
        <span>Жарыс треки</span>
        <span>${sorted.filter(s=>s.score>0).length}/${students.length} белсенді</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${sorted.map((s, i) => {
        const pct     = Math.min(100, Math.round((s.score / maxQ) * 100));
        const [c, bg] = COLORS[i % COLORS.length];
        const alpaca  = s.avatar || ALPACAS[i % ALPACAS.length];
        const rank    = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;

        return `
          <div style="background:white;border:1.5px solid ${i===0?c:'#e2e6f0'};border-radius:14px;padding:12px 14px;${i===0?`box-shadow:0 4px 16px ${c}30;`:''}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:18px;min-width:24px;text-align:center;">${rank}</span>
              <span style="font-size:22px;">${alpaca}</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:800;color:#0f172a;">${escapeHtml(s.name||"Оқушы")}</div>
              </div>
              <div style="background:${bg};border:1px solid ${c};border-radius:8px;padding:4px 10px;text-align:center;">
                <div style="font-size:18px;font-weight:800;color:${c};">${s.score}</div>
                <div style="font-size:9px;color:#64748b;">ұпай</div>
              </div>
            </div>

            <!-- Трек -->
            <div style="position:relative;background:#f0f2f8;border-radius:999px;height:28px;overflow:visible;">
              <!-- Progress -->
              <div style="position:absolute;top:0;left:0;height:100%;width:${Math.max(pct,4)}%;background:linear-gradient(90deg,${c},${c}88);border-radius:999px;transition:width .6s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:4px;min-width:32px;">
              </div>
              <!-- Alpaca position -->
              <div style="position:absolute;top:50%;transform:translateY(-50%);left:calc(${Math.max(pct,4)}% - 16px);transition:left .6s ease;font-size:22px;line-height:1;z-index:2;">${alpaca}</div>
              <!-- Finish flag -->
              <div style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:16px;z-index:1;">🏁</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:#94a3b8;">
              <span>Бастапқы</span>
              <span style="color:${c};font-weight:700;">${pct}%</span>
              <span>Финиш</span>
            </div>
          </div>`;
      }).join("")}
    </div>
  `;
}

// =====================================================
// ШАМ 35: CROSSWORD -- AI сөзжұмбақ
// AI сөздер + кеңестер жасайды → grid автоматты
// Тақтада интерактив ойын
// =====================================================

window.openCrossword = function() {
  if (document.getElementById("cwModal")) {
    document.getElementById("cwModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "cwModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(1020px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">✏️ Crossword -- Сөзжұмбақ</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">AI сөздер жасайды → интерактив тор → тақтада ойнаңыз</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button id="cwAddBoardBtn" onclick="addCrosswordToBoard()" style="display:none;background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">📌 Тақтаға</button>
      <button onclick="document.getElementById('cwModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- параметрлер
  const left = document.createElement("div");
  left.style.cssText = "width:280px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#f8f9ff;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;">Сөзжұмбақ параметрлері</div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Тақырып</label>
      <input id="cwTopic" type="text" placeholder="Мысалы: Жануарлар, Физика..."
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
    </div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Пән</label>
      <input id="cwSubject" type="text" placeholder="Биология, Математика..."
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
    </div>

    <div style="margin-bottom:10px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Сөз саны</label>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;">
        ${[5,8,10,12].map((n,i) => `
          <button class="cw-count-btn" data-n="${n}" onclick="setCWCount(${n})" style="
            padding:7px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
            border:1.5px solid ${i===1?'#c7d2fe':'#e2e6f0'};
            background:${i===1?'#eef2ff':'#f9fafb'};color:${i===1?'#4f46e5':'#374151'};
          ">${n}</button>`).join("")}
      </div>
    </div>

    <div style="margin-bottom:14px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:5px;">Тіл</label>
      <div style="display:flex;gap:5px;">
        ${[["kk","🇰🇿 Қаз"],["ru","🇷🇺 Рус"],["en","🇬🇧 Eng"]].map(([v,l],i) => `
          <button class="cw-lang-btn" data-l="${v}" onclick="setCWLang('${v}')" style="
            flex:1;padding:7px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            border:1.5px solid ${i===0?'#c7d2fe':'#e2e6f0'};
            background:${i===0?'#eef2ff':'#f9fafb'};color:${i===0?'#4f46e5':'#374151'};
          ">${l}</button>`).join("")}
      </div>
    </div>

    <button id="cwGenBtn" onclick="generateCrossword()" style="
      width:100%;padding:12px;border:none;border-radius:12px;
      background:linear-gradient(135deg,#1a1a2e,#0f3460);
      color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;
      box-shadow:0 4px 14px rgba(15,52,96,0.3);margin-bottom:10px;
    ">✏️ Сөзжұмбақ жасау</button>

    <div id="cwStatus" style="font-size:11px;color:#64748b;text-align:center;min-height:14px;"></div>

    <!-- Кеңестер тізімі -->
    <div id="cwCluesList" style="margin-top:14px;display:none;">
      <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;">Кеңестер</div>
      <div id="cwAcross" style="margin-bottom:10px;"></div>
      <div id="cwDown"></div>
    </div>
  `;

  // RIGHT -- crossword grid
  const right = document.createElement("div");
  right.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;background:#f0f2f8;";
  right.innerHTML = `
    <div style="padding:10px 16px;background:white;border-bottom:1px solid #e2e6f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <span style="font-size:12px;font-weight:700;color:#374151;">Сөзжұмбақ торы</span>
      <div style="display:flex;gap:6px;">
        <button id="cwCheckBtn" onclick="checkCWAnswers()" style="display:none;padding:5px 12px;border:none;border-radius:7px;background:#4f46e5;color:white;font-size:11px;font-weight:700;cursor:pointer;">✓ Тексеру</button>
        <button id="cwRevealBtn" onclick="revealCWAnswers()" style="display:none;padding:5px 12px;border:1px solid #e2e6f0;border-radius:7px;background:#f9fafb;color:#374151;font-size:11px;font-weight:700;cursor:pointer;">👁 Жауап</button>
        <button id="cwResetBtn" onclick="resetCWAnswers()" style="display:none;padding:5px 12px;border:1px solid #e2e6f0;border-radius:7px;background:#f9fafb;color:#374151;font-size:11px;font-weight:700;cursor:pointer;">↺ Тазалау</button>
      </div>
    </div>
    <div id="cwGrid" style="flex:1;overflow:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center;">
      <div style="text-align:center;padding:60px;color:#94a3b8;">
        <div style="font-size:52px;margin-bottom:12px;">✏️</div>
        <div style="font-size:14px;font-weight:700;color:#374151;">Сөзжұмбақ</div>
        <div style="font-size:12px;margin-top:6px;line-height:1.6;">Тақырып жазып, «Сөзжұмбақ жасау» батырмасын басыңыз</div>
      </div>
    </div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._cwCount = 8;
  window._cwLang  = "kk";
  window._cwData  = null;
};

window.setCWCount = function(n) {
  window._cwCount = n;
  document.querySelectorAll(".cw-count-btn").forEach(btn => {
    const isA = parseInt(btn.dataset.n) === n;
    btn.style.borderColor = isA ? "#c7d2fe" : "#e2e6f0";
    btn.style.background  = isA ? "#eef2ff" : "#f9fafb";
    btn.style.color       = isA ? "#4f46e5" : "#374151";
  });
};

window.setCWLang = function(l) {
  window._cwLang = l;
  document.querySelectorAll(".cw-lang-btn").forEach(btn => {
    const isA = btn.dataset.l === l;
    btn.style.borderColor = isA ? "#c7d2fe" : "#e2e6f0";
    btn.style.background  = isA ? "#eef2ff" : "#f9fafb";
    btn.style.color       = isA ? "#4f46e5" : "#374151";
  });
};

// ── AI Сөзжұмбақ жасау ──────────────────────────────
window.generateCrossword = async function() {
  const topic   = document.getElementById("cwTopic")?.value.trim();
  const subject = document.getElementById("cwSubject")?.value.trim() || "";
  const count   = window._cwCount || 8;
  const lang    = window._cwLang  || "kk";
  const btn     = document.getElementById("cwGenBtn");
  const status  = document.getElementById("cwStatus");

  if (!topic) { if (status) { status.textContent = "❗ Тақырып жазыңыз!"; status.style.color="#dc2626"; } return; }

  if (btn) { btn.disabled = true; btn.textContent = "⏳ Жасалуда..."; }
  if (status) { status.textContent = "AI сөздер жасап жатыр..."; status.style.color = "#f59e0b"; }

  // Grid loading
  const grid = document.getElementById("cwGrid");
  if (grid) grid.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;"><div style="font-size:32px;animation:spin 1s linear infinite;display:inline-block;">⚙️</div><div style="margin-top:12px;font-size:13px;">AI сөзжұмбақ жасап жатыр...</div></div><style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>`;

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat", lang,
        prompt: `Тақырып: "${topic}". Пән: ${subject||"жалпы"}.
${count} сөз таңда. Әр сөзге қысқа кеңес жаз.
ТІКЕЛЕЙ JSON қайтар (ешқандай түсіндірме жазба):
[{"word":"СӨЗБАС","clue":"кеңес мәтіні"},...]
Ережелер:
- word тек ЛАТЫН немесе ҚАЗАҚ БАСТАПҚЫ ӘРІПТЕРМЕН, бас әрпімен (A-Z, А-Я)
- Бос орынсыз, тиресіз
- 3-12 әріп ұзындығы
- clue сөздің анықтамасы немесе кеңесі (${lang==='kk'?'қазақша':lang==='ru'?'орысша':'ағылшынша'})
Тек JSON массив, басқа ештеңе жазба.`
      })
    });
    const data  = await res.json();
    const clean = (data.answer || "").replace(/```json|```/gi, "").trim();
    let words   = JSON.parse(clean);

    // Тазалау -- бос орын, арнайы символдар алу
    words = words.map(w => ({
      word:  (w.word || "").toUpperCase().replace(/[^A-ZА-ЯЁӘІҢҒҮҰҚӨҺ]/g, ""),
      clue:  w.clue || ""
    })).filter(w => w.word.length >= 3 && w.word.length <= 15);

    if (!words.length) throw new Error("Сөздер алынбады");

    // Grid жасау
    const cwData = buildCrosswordGrid(words);
    window._cwData = cwData;

    renderCrosswordGrid(cwData);
    renderCrosswordClues(cwData);

    if (status) { status.textContent = `✅ ${cwData.placed.length} сөз орналастырылды!`; status.style.color = "#10b981"; }

    // Батырмаларды көрсету
    ["cwCheckBtn","cwRevealBtn","cwResetBtn","cwAddBoardBtn"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "inline-flex";
    });
    const cluesList = document.getElementById("cwCluesList");
    if (cluesList) cluesList.style.display = "block";

  } catch(e) {
    if (grid) grid.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;"><div style="font-size:32px;">❌</div><div style="margin-top:8px;font-size:14px;font-weight:700;">${e.message}</div></div>`;
    if (status) { status.textContent = "Қате -- қайталап көріңіз"; status.style.color = "#dc2626"; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "✏️ Сөзжұмбақ жасау"; }
  }
};

// ── Crossword Grid алгоритмі ─────────────────────────
function buildCrosswordGrid(words) {
  const SIZE   = 20;
  const grid   = Array.from({length:SIZE}, () => Array(SIZE).fill(null));
  const placed = [];
  let   num    = 1;

  // Бірінші сөзді ортасына горизонталь орналастыру
  const first = words[0];
  const startC = Math.floor((SIZE - first.word.length) / 2);
  const startR = Math.floor(SIZE / 2);

  for (let i = 0; i < first.word.length; i++) {
    grid[startR][startC + i] = { letter: first.word[i], wordIds: [] };
  }
  placed.push({
    id: 1, word: first.word, clue: first.clue,
    row: startR, col: startC, dir: "across", num: num++
  });

  // Қалған сөздерді орналастыру
  for (let wi = 1; wi < words.length; wi++) {
    const w = words[wi];
    let bestScore = -1, bestPlace = null;

    for (const p of placed) {
      // Сәйкес әріп іздеу
      for (let pi = 0; pi < p.word.length; pi++) {
        for (let wi2 = 0; wi2 < w.word.length; wi2++) {
          if (p.word[pi] !== w.word[wi2]) continue;

          let r, c, dir;
          if (p.dir === "across") {
            // Вертикаль
            r = p.row - wi2;
            c = p.col + pi;
            dir = "down";
          } else {
            // Горизонталь
            r = p.row + pi;
            c = p.col - wi2;
            dir = "across";
          }

          // Жарамдылық тексеру
          if (!canPlace(grid, SIZE, w.word, r, c, dir)) continue;

          // Score -- басқа сөздермен қиылысу саны
          let score = 1;
          for (let k = 0; k < w.word.length; k++) {
            const tr = dir === "down" ? r + k : r;
            const tc = dir === "across" ? c + k : c;
            if (grid[tr]?.[tc]?.letter === w.word[k]) score += 2;
          }

          if (score > bestScore) { bestScore = score; bestPlace = {r, c, dir}; }
        }
      }
    }

    if (bestPlace) {
      const {r, c, dir} = bestPlace;
      for (let k = 0; k < w.word.length; k++) {
        const tr = dir === "down" ? r + k : r;
        const tc = dir === "across" ? c + k : c;
        if (!grid[tr][tc]) grid[tr][tc] = { letter: w.word[k], wordIds: [] };
      }
      placed.push({ id: placed.length + 1, word: w.word, clue: w.clue, row: r, col: c, dir, num: num++ });
    }
  }

  // Grid-ті trim
  const { minR, maxR, minC, maxC } = findBounds(grid, SIZE);
  const trimmed = [];
  for (let r = minR; r <= maxR; r++) {
    trimmed.push(grid[r].slice(minC, maxC + 1));
  }

  // Нөмірлерді орнату
  const numbered = {};
  placed.forEach(p => {
    const key = `${p.row - minR},${p.col - minC}`;
    if (!numbered[key]) numbered[key] = p.num;
    p.row -= minR;
    p.col -= minC;
  });

  return { grid: trimmed, placed, numbered, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

function canPlace(grid, SIZE, word, r, c, dir) {
  for (let k = 0; k < word.length; k++) {
    const tr = dir === "down" ? r + k : r;
    const tc = dir === "across" ? c + k : c;
    if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) return false;
    const cell = grid[tr][tc];
    if (cell && cell.letter !== word[k]) return false;
    // Параллель тексеру
    if (!cell) {
      if (dir === "across") {
        if (grid[tr-1]?.[tc]?.letter && !isIntersection(grid, tr-1, tc, word, k, dir)) return false;
        if (grid[tr+1]?.[tc]?.letter && !isIntersection(grid, tr+1, tc, word, k, dir)) return false;
      } else {
        if (grid[tr]?.[tc-1]?.letter && !isIntersection(grid, tr, tc-1, word, k, dir)) return false;
        if (grid[tr]?.[tc+1]?.letter && !isIntersection(grid, tr, tc+1, word, k, dir)) return false;
      }
    }
  }
  // Бастапқы және аяқ жер тексеру
  if (dir === "across") {
    if (grid[r]?.[c-1]?.letter) return false;
    if (grid[r]?.[c+word.length]?.letter) return false;
  } else {
    if (grid[r-1]?.[c]?.letter) return false;
    if (grid[r+word.length]?.[c]?.letter) return false;
  }
  return true;
}

function isIntersection(grid, r, c, word, k, dir) { return false; }

function findBounds(grid, SIZE) {
  let minR=SIZE,maxR=0,minC=SIZE,maxC=0;
  for (let r=0;r<SIZE;r++) for (let c=0;c<SIZE;c++) {
    if (grid[r][c]) { minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c); }
  }
  return {minR,maxR,minC,maxC};
}

// ── Grid рендер ──────────────────────────────────────
function renderCrosswordGrid(cw) {
  const el = document.getElementById("cwGrid");
  if (!el) return;

  const CELL = 38;
  const gridEl = document.createElement("div");
  gridEl.style.cssText = `display:inline-grid;grid-template-columns:repeat(${cw.cols},${CELL}px);gap:2px;background:#1a1a2e;padding:10px;border-radius:12px;box-shadow:0 8px 28px rgba(15,23,42,0.2);`;

  for (let r = 0; r < cw.rows; r++) {
    for (let c = 0; c < cw.cols; c++) {
      const cell   = cw.grid[r]?.[c];
      const numKey = `${r},${c}`;
      const num    = cw.numbered[numKey];
      const div    = document.createElement("div");

      if (!cell) {
        div.style.cssText = `width:${CELL}px;height:${CELL}px;background:#1a1a2e;border-radius:4px;`;
      } else {
        div.style.cssText = `width:${CELL}px;height:${CELL}px;background:white;border-radius:4px;position:relative;display:flex;align-items:center;justify-content:center;border:1.5px solid #e2e6f0;`;

        if (num) {
          const numEl = document.createElement("span");
          numEl.style.cssText = "position:absolute;top:1px;left:2px;font-size:8px;font-weight:800;color:#4f46e5;line-height:1;";
          numEl.textContent = num;
          div.appendChild(numEl);
        }

        const inp = document.createElement("input");
        inp.type      = "text";
        inp.maxLength = 1;
        inp.dataset.r = r;
        inp.dataset.c = c;
        inp.dataset.answer = cell.letter;
        inp.style.cssText  = `width:100%;height:100%;border:none;outline:none;text-align:center;font-size:${CELL > 36 ? 16 : 13}px;font-weight:800;color:#0f172a;text-transform:uppercase;background:transparent;font-family:inherit;`;
        inp.addEventListener("input", (e) => {
          inp.value = inp.value.toUpperCase().slice(-1);
          // Автоматты келесіге өту
          if (inp.value) {
            const next = gridEl.querySelector(`input[data-r="${r}"][data-c="${c+1}"]`) ||
                         gridEl.querySelector(`input[data-r="${r+1}"][data-c="${c}"]`);
            if (next) next.focus();
          }
        });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !inp.value) {
            const prev = gridEl.querySelector(`input[data-r="${r}"][data-c="${c-1}"]`) ||
                         gridEl.querySelector(`input[data-r="${r-1}"][data-c="${c}"]`);
            if (prev) { prev.value = ""; prev.focus(); }
          }
        });
        div.appendChild(inp);
      }
      gridEl.appendChild(div);
    }
  }

  el.innerHTML = "";
  el.appendChild(gridEl);
}

// ── Кеңестер ────────────────────────────────────────
function renderCrosswordClues(cw) {
  const acrossEl = document.getElementById("cwAcross");
  const downEl   = document.getElementById("cwDown");

  const across = cw.placed.filter(p => p.dir === "across").sort((a,b) => a.num - b.num);
  const down   = cw.placed.filter(p => p.dir === "down").sort((a,b) => a.num - b.num);

  if (acrossEl) acrossEl.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#4f46e5;margin-bottom:5px;">→ ГОРИЗОНТАЛЬ</div>
    ${across.map(p => `<div style="font-size:11px;color:#334155;margin-bottom:3px;padding:4px 6px;background:#fff;border-radius:6px;border:1px solid #e2e6f0;"><b style="color:#4f46e5;">${p.num}.</b> ${p.clue}</div>`).join("")}`;

  if (downEl) downEl.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:5px;">↓ ВЕРТИКАЛЬ</div>
    ${down.map(p => `<div style="font-size:11px;color:#334155;margin-bottom:3px;padding:4px 6px;background:#fff;border-radius:6px;border:1px solid #e2e6f0;"><b style="color:#7c3aed;">${p.num}.</b> ${p.clue}</div>`).join("")}`;
}

// ── Тексеру ──────────────────────────────────────────
window.checkCWAnswers = function() {
  const inputs = document.querySelectorAll("#cwGrid input");
  let correct = 0, total = 0;
  inputs.forEach(inp => {
    total++;
    const ans = inp.dataset.answer || "";
    if (inp.value.toUpperCase() === ans.toUpperCase()) {
      correct++;
      inp.style.color      = "#16a34a";
      inp.style.background = "#f0fdf4";
      inp.parentElement.style.borderColor = "#86efac";
    } else if (inp.value) {
      inp.style.color      = "#dc2626";
      inp.style.background = "#fef2f2";
      inp.parentElement.style.borderColor = "#fca5a5";
    }
  });
  const status = document.getElementById("cwStatus");
  if (status) {
    const pct = Math.round((correct/total)*100);
    status.textContent = `✅ ${correct}/${total} дұрыс (${pct}%)`;
    status.style.color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  }
};

// ── Жауаптарды ашу ───────────────────────────────────
window.revealCWAnswers = function() {
  document.querySelectorAll("#cwGrid input").forEach(inp => {
    inp.value            = inp.dataset.answer || "";
    inp.style.color      = "#4f46e5";
    inp.style.background = "#eef2ff";
  });
};

// ── Тазалау ──────────────────────────────────────────
window.resetCWAnswers = function() {
  document.querySelectorAll("#cwGrid input").forEach(inp => {
    inp.value            = "";
    inp.style.color      = "#0f172a";
    inp.style.background = "transparent";
    inp.parentElement.style.borderColor = "#e2e6f0";
  });
  const status = document.getElementById("cwStatus");
  if (status) status.textContent = "";
};

// ── Тақтаға қосу ────────────────────────────────────
window.addCrosswordToBoard = function() {
  const cw = window._cwData;
  if (!cw) return;

  const across = cw.placed.filter(p => p.dir === "across").sort((a,b) => a.num-b.num);
  const down   = cw.placed.filter(p => p.dir === "down").sort((a,b) => a.num-b.num);

  const html = `
    <div style="background:#f8f9ff;border-radius:14px;padding:14px;">
      <div style="font-size:16px;font-weight:800;color:#1a1a2e;margin-bottom:12px;">✏️ Сөзжұмбақ</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#4f46e5;margin-bottom:6px;">→ ГОРИЗОНТАЛЬ</div>
          ${across.map(p => `<div style="font-size:12px;color:#334155;margin-bottom:3px;"><b style="color:#4f46e5;">${p.num}.</b> ${p.clue}</div>`).join("")}
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:6px;">↓ ВЕРТИКАЛЬ</div>
          ${down.map(p => `<div style="font-size:12px;color:#334155;margin-bottom:3px;"><b style="color:#7c3aed;">${p.num}.</b> ${p.clue}</div>`).join("")}
        </div>
      </div>
    </div>`;

  addBlock("ai", html);
  document.getElementById("cwModal").style.display = "none";
};

// =====================================================
// ШАМ 36: FLASHCARDS PRO -- Anki стилінде
// AI карточка жасайды → flip анимация → прогресс
// 3 режим: Оқу / Тест / Жарыс
// =====================================================

window.openFlashcards = function() {
  if (document.getElementById("fcModal")) {
    document.getElementById("fcModal").style.display = "flex";
    return;
  }

  const modal = document.createElement("div");
  modal.id = "fcModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(960px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#4c1d95,#6d28d9,#8b5cf6);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">🃏 Flashcards Pro</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">AI карточка жасайды → flip → Білдім / Білмедім</div>
    </div>
    <button onclick="document.getElementById('fcModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT
  const left = document.createElement("div");
  left.style.cssText = "width:280px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#faf5ff;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;">Карточка жинағы</div>

    <!-- AI -->
    <div style="background:white;border:1px solid #e9d5ff;border-radius:12px;padding:12px;margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:8px;">⚡ AI жасау</div>
      <input id="fcTopic" type="text" placeholder="Тақырып..."
        style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;margin-bottom:6px;"/>
      <div style="display:flex;gap:5px;margin-bottom:7px;">
        <select id="fcCount" style="flex:1;padding:7px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;">
          <option value="5">5 карточка</option>
          <option value="10" selected>10 карточка</option>
          <option value="15">15 карточка</option>
          <option value="20">20 карточка</option>
        </select>
        <select id="fcType" style="flex:1;padding:7px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;">
          <option value="term">Термин↔Анықтама</option>
          <option value="qa">Сұрақ↔Жауап</option>
          <option value="word">Сөз↔Аударма</option>
          <option value="formula">Формула↔Мысал</option>
        </select>
      </div>
      <button id="fcAIBtn" onclick="generateFlashcards()" style="width:100%;padding:9px;border:none;border-radius:9px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">⚡ Карточка жасау</button>
    </div>

    <!-- Қол қосу -->
    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Немесе қол қосыңыз</div>
    <textarea id="fcFront" rows="2" placeholder="Алдыңғы жақ (сұрақ/термин)"
      style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:5px;"></textarea>
    <textarea id="fcBack" rows="2" placeholder="Артқы жақ (жауап/анықтама)"
      style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:6px;"></textarea>
    <button onclick="addFlashcard()" style="width:100%;padding:8px;border:none;border-radius:8px;background:#7c3aed;color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:12px;">+ Карточка қосу</button>

    <!-- Прогресс -->
    <div id="fcProgress" style="display:none;background:white;border:1px solid #e9d5ff;border-radius:10px;padding:10px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:6px;">📊 Прогресс</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;">
        <span>✅ <span id="fcKnown">0</span> білдім</span>
        <span>❌ <span id="fcUnknown">0</span> білмедім</span>
        <span>⬜ <span id="fcLeft">0</span> қалды</span>
      </div>
      <div style="background:#f0f2f8;border-radius:999px;height:8px;overflow:hidden;">
        <div id="fcProgressBar" style="height:100%;border-radius:999px;background:linear-gradient(90deg,#7c3aed,#a78bfa);width:0%;transition:width .4s;"></div>
      </div>
    </div>

    <!-- Режим -->
    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Режим</div>
    <div style="display:flex;flex-direction:column;gap:5px;" id="fcModeBtns">
      ${[["study","📖 Оқу режимі","Flip + Білдім/Білмедім"],["test","🎯 Тест режимі","4 нұсқалы тест"],["speed","⚡ Жылдам","Таймермен жарыс"]].map(([v,l,d],i) => `
        <button class="fc-mode-btn" data-m="${v}" onclick="setFCMode('${v}')" style="
          padding:8px 10px;border-radius:9px;text-align:left;cursor:pointer;font-family:inherit;
          border:1.5px solid ${i===0?'#c4b5fd':'#e2e6f0'};
          background:${i===0?'#f5f3ff':'#fff'};color:#334155;
          display:flex;flex-direction:column;gap:1px;
        ">
          <span style="font-size:12px;font-weight:700;">${l}</span>
          <span style="font-size:10px;color:#94a3b8;">${d}</span>
        </button>`).join("")}
    </div>

    <button id="fcStartBtn" onclick="startFlashcards()" style="
      display:none;width:100%;padding:10px;border:none;border-radius:10px;
      background:linear-gradient(135deg,#4c1d95,#7c3aed);
      color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;
      margin-top:10px;box-shadow:0 4px 12px rgba(76,29,149,0.3);
    ">▶ Бастау</button>
  `;

  // RIGHT
  const right = document.createElement("div");
  right.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;background:#f5f3ff;";
  right.innerHTML = `
    <div id="fcCardArea" style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;">
      <div style="text-align:center;color:#94a3b8;">
        <div style="font-size:52px;margin-bottom:12px;">🃏</div>
        <div style="font-size:15px;font-weight:700;color:#374151;">Flashcards Pro</div>
        <div style="font-size:13px;margin-top:6px;line-height:1.6;">AI немесе қол карточка жасаңыз,<br>содан соң ойынды бастаңыз</div>
      </div>
    </div>
    <div id="fcAllCards" style="display:none;flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;"></div>
    <div id="fcBottomBar" style="display:none;padding:12px 16px;background:white;border-top:1px solid #e2e6f0;flex-shrink:0;"></div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._fcCards   = [];
  window._fcMode    = "study";
  window._fcIndex   = 0;
  window._fcKnown   = new Set();
  window._fcUnknown = new Set();
  window._fcFlipped = false;

  // CSS inject
  if (!document.getElementById("fcStyles")) {
    const s = document.createElement("style");
    s.id = "fcStyles";
    s.textContent = `
      .fc-card-wrap { perspective:1000px; cursor:pointer; }
      .fc-card-inner { position:relative; width:100%; height:100%; transform-style:preserve-3d; transition:transform .5s cubic-bezier(.4,0,.2,1); }
      .fc-card-inner.flipped { transform:rotateY(180deg); }
      .fc-card-front, .fc-card-back { position:absolute; inset:0; backface-visibility:hidden; border-radius:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; }
      .fc-card-back { transform:rotateY(180deg); }
    `;
    document.head.appendChild(s);
  }
};

// ── AI Карточка жасау ────────────────────────────────
window.generateFlashcards = async function() {
  const topic = document.getElementById("fcTopic")?.value.trim();
  const count = document.getElementById("fcCount")?.value || "10";
  const type  = document.getElementById("fcType")?.value || "term";
  const btn   = document.getElementById("fcAIBtn");
  if (!topic) { showToast("⚠️ Тақырып жазыңыз!", "warn"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "⏳..."; }

  const typeMap = {
    term:    "термин және оның анықтамасы",
    qa:      "сұрақ және қысқа жауап",
    word:    "сөз және оның аудармасы/синонимі",
    formula: "формула/ереже және мысал/мән",
  };

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat", lang: currentLang || "kk",
        prompt: `Тақырып: "${topic}". ${count} флэшкарточка жаса -- ${typeMap[type]}.
ТІКЕЛЕЙ JSON массив қайтар:
[{"front":"алдыңғы жақ мәтіні","back":"артқы жақ мәтіні"},...]
Тек JSON, басқа ештеңе жазба.`
      })
    });
    const data   = await res.json();
    const clean  = (data.answer || "").replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean);
    window._fcCards = parsed.map((c, i) => ({
      id: i, front: c.front || "", back: c.back || "",
      known: false
    }));
    window._fcKnown   = new Set();
    window._fcUnknown = new Set();
    window._fcIndex   = 0;
    updateFCProgress();
    showAllCards();
    const startBtn = document.getElementById("fcStartBtn");
    if (startBtn) startBtn.style.display = "block";
  } catch(e) {
    showToast("AI қате: " + e.message, "info");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ Карточка жасау"; }
  }
};

// ── Қол карточка ────────────────────────────────────
window.addFlashcard = function() {
  const f = document.getElementById("fcFront")?.value.trim();
  const b = document.getElementById("fcBack")?.value.trim();
  if (!f || !b) return;
  (window._fcCards = window._fcCards || []).push({ id: Date.now(), front: f, back: b });
  document.getElementById("fcFront").value = "";
  document.getElementById("fcBack").value  = "";
  updateFCProgress();
  showAllCards();
  const btn = document.getElementById("fcStartBtn");
  if (btn && window._fcCards.length >= 1) btn.style.display = "block";
};

// ── Барлық карточкалар mini grid ────────────────────
function showAllCards() {
  const area  = document.getElementById("fcCardArea");
  const allEl = document.getElementById("fcAllCards");
  if (!area || !allEl) return;
  area.style.display   = "none";
  allEl.style.display  = "grid";

  allEl.innerHTML = (window._fcCards || []).map((c,i) => `
    <div style="background:white;border:1.5px solid #e9d5ff;border-radius:12px;padding:10px;cursor:pointer;transition:.15s;"
      onmouseover="this.style.borderColor='#c4b5fd'"
      onmouseout="this.style.borderColor='#e9d5ff'"
      onclick="startFlashcardsAt(${i})">
      <div style="font-size:10px;font-weight:700;color:#7c3aed;margin-bottom:4px;">#${i+1}</div>
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:4px;line-height:1.3;">${c.front}</div>
      <div style="font-size:11px;color:#64748b;line-height:1.3;">${c.back}</div>
    </div>`).join("");
}

window.startFlashcardsAt = function(idx) {
  window._fcIndex = idx;
  startFlashcards();
};

// ── Режим таңдау ────────────────────────────────────
window.setFCMode = function(m) {
  window._fcMode = m;
  document.querySelectorAll(".fc-mode-btn").forEach(btn => {
    const isA = btn.dataset.m === m;
    btn.style.borderColor = isA ? "#c4b5fd" : "#e2e6f0";
    btn.style.background  = isA ? "#f5f3ff" : "#fff";
  });
};

// ── Прогресс жаңарту ─────────────────────────────────
function updateFCProgress() {
  const total   = (window._fcCards || []).length;
  const known   = window._fcKnown.size;
  const unknown = window._fcUnknown.size;
  const left    = total - known - unknown;
  const pct     = total > 0 ? Math.round((known / total) * 100) : 0;

  const prog = document.getElementById("fcProgress");
  if (prog) prog.style.display = total > 0 ? "block" : "none";
  const k = document.getElementById("fcKnown");    if (k) k.textContent = known;
  const u = document.getElementById("fcUnknown");  if (u) u.textContent = unknown;
  const l = document.getElementById("fcLeft");     if (l) l.textContent = left;
  const bar = document.getElementById("fcProgressBar");
  if (bar) bar.style.width = pct + "%";
}

// ── Flashcard ойыны ──────────────────────────────────
window.startFlashcards = function() {
  const cards = window._fcCards || [];
  if (!cards.length) return;
  window._fcFlipped = false;

  const area  = document.getElementById("fcCardArea");
  const allEl = document.getElementById("fcAllCards");
  const botEl = document.getElementById("fcBottomBar");
  if (area)  area.style.display  = "flex";
  if (allEl) allEl.style.display = "none";

  const mode = window._fcMode || "study";

  if (mode === "study") startStudyMode(cards);
  else if (mode === "test") startTestMode(cards);
  else if (mode === "speed") startSpeedMode(cards);
};

// ── STUDY MODE ───────────────────────────────────────
function startStudyMode(cards) {
  const idx  = window._fcIndex || 0;
  const card = cards[idx];
  if (!card) { showFCComplete(); return; }

  const area  = document.getElementById("fcCardArea");
  const botEl = document.getElementById("fcBottomBar");
  if (!area) return;

  const THEMES = [
    ["linear-gradient(135deg,#4c1d95,#7c3aed)","#faf5ff","#7c3aed"],
    ["linear-gradient(135deg,#1e3a8a,#3b82f6)","#eff6ff","#1d4ed8"],
    ["linear-gradient(135deg,#14532d,#16a34a)","#f0fdf4","#15803d"],
    ["linear-gradient(135deg,#7c2d12,#c2410c)","#fff7ed","#c2410c"],
    ["linear-gradient(135deg,#1a1a2e,#374151)","#f9fafb","#374151"],
  ];
  const [bg, lightBg, accent] = THEMES[idx % THEMES.length];

  area.innerHTML = `
    <div style="width:100%;max-width:500px;">
      <!-- Counter -->
      <div style="text-align:center;font-size:12px;color:#64748b;margin-bottom:12px;font-weight:600;">
        ${idx + 1} / ${cards.length}
        <span style="margin-left:8px;background:#f5f3ff;color:#7c3aed;padding:2px 8px;border-radius:999px;font-size:11px;">${
          window._fcKnown.has(card.id) ? "✅ Білдім" :
          window._fcUnknown.has(card.id) ? "❌ Білмедім" : "⬜ Жаңа"
        }</span>
      </div>

      <!-- Card -->
      <div class="fc-card-wrap" style="width:100%;height:260px;" onclick="flipFC()">
        <div class="fc-card-inner" id="fcCardInner">
          <!-- Front -->
          <div class="fc-card-front" style="background:${bg};box-shadow:0 20px 60px rgba(76,29,149,0.3);">
            <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;">Сұрақ</div>
            <div style="font-size:20px;font-weight:800;color:white;line-height:1.4;">${card.front}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:16px;">Жауапты көру үшін басыңыз ▼</div>
          </div>
          <!-- Back -->
          <div class="fc-card-back" style="background:${lightBg};border:2px solid ${accent}33;box-shadow:0 20px 60px rgba(76,29,149,0.15);">
            <div style="font-size:11px;color:${accent};text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;opacity:.7;">Жауап</div>
            <div style="font-size:18px;font-weight:800;color:#0f172a;line-height:1.5;">${card.back}</div>
          </div>
        </div>
      </div>

      <!-- Hint -->
      <div id="fcHint" style="text-align:center;font-size:12px;color:#94a3b8;margin:10px 0;">Карточканы аударыңыз</div>

      <!-- Buttons (hidden until flip) -->
      <div id="fcActionBtns" style="display:none;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px;">
        <button onclick="fcAnswer('unknown')" style="padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">❌ Білмедім</button>
        <button onclick="fcAnswer('skip')" style="padding:12px;border:1.5px solid #e2e6f0;border-radius:12px;background:#f9fafb;color:#374151;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">⏭ Өткізу</button>
        <button onclick="fcAnswer('known')" style="padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#16a34a,#22c55e);color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">✅ Білдім!</button>
      </div>
    </div>
  `;
  window._fcFlipped = false;
}

window.flipFC = function() {
  const inner = document.getElementById("fcCardInner");
  const hint  = document.getElementById("fcHint");
  const btns  = document.getElementById("fcActionBtns");
  if (!inner) return;

  window._fcFlipped = !window._fcFlipped;
  if (window._fcFlipped) {
    inner.classList.add("flipped");
    if (hint) hint.textContent = "Жауабыңызды бағалаңыз";
    if (btns) btns.style.display = "grid";
  } else {
    inner.classList.remove("flipped");
    if (hint) hint.textContent = "Карточканы аударыңыз";
    if (btns) btns.style.display = "none";
  }
};

window.fcAnswer = function(result) {
  const card = (window._fcCards || [])[window._fcIndex || 0];
  if (!card) return;

  if (result === "known")   window._fcKnown.add(card.id);
  if (result === "unknown") window._fcUnknown.add(card.id);

  updateFCProgress();

  window._fcIndex = (window._fcIndex || 0) + 1;
  if (window._fcIndex >= (window._fcCards || []).length) {
    showFCComplete();
  } else {
    startStudyMode(window._fcCards || []);
  }
};

// ── TEST MODE ────────────────────────────────────────
function startTestMode(cards) {
  const idx  = window._fcIndex || 0;
  if (idx >= cards.length) { showFCComplete(); return; }
  const card = cards[idx];

  // 4 нұсқа жасау
  const others = cards.filter(c => c.id !== card.id);
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
  const options  = [...shuffled, card].sort(() => Math.random() - 0.5);

  const area = document.getElementById("fcCardArea");
  if (!area) return;

  area.innerHTML = `
    <div style="width:100%;max-width:520px;">
      <div style="text-align:center;font-size:12px;color:#64748b;margin-bottom:14px;font-weight:600;">${idx+1} / ${cards.length}</div>

      <div style="background:linear-gradient(135deg,#4c1d95,#7c3aed);border-radius:18px;padding:20px;margin-bottom:16px;text-align:center;box-shadow:0 16px 48px rgba(76,29,149,0.3);">
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">Қайсысы дұрыс?</div>
        <div style="font-size:20px;font-weight:800;color:white;">${card.front}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${options.map((opt, i) => `
          <button onclick="fcTestAnswer(this,'${opt.id}','${card.id}')" style="
            padding:14px 12px;border-radius:12px;text-align:center;cursor:pointer;
            border:2px solid #e9d5ff;background:white;font-size:13px;font-weight:600;
            color:#334155;font-family:inherit;line-height:1.4;transition:.15s;
          " onmouseover="this.style.borderColor='#c4b5fd';this.style.background='#faf5ff'"
             onmouseout="if(!this.dataset.answered){this.style.borderColor='#e9d5ff';this.style.background='white'}">
            <span style="display:block;font-size:16px;font-weight:800;color:#7c3aed;margin-bottom:4px;">${["A","B","C","D"][i]}</span>
            ${opt.back}
          </button>`).join("")}
      </div>
    </div>
  `;
}

window.fcTestAnswer = function(btn, selectedId, correctId) {
  const btns = btn.parentElement.querySelectorAll("button");
  btns.forEach(b => { b.dataset.answered = "1"; b.style.cursor = "default"; b.onclick = null; });

  const isCorrect = selectedId === correctId;
  btn.style.background   = isCorrect ? "#f0fdf4" : "#fef2f2";
  btn.style.borderColor  = isCorrect ? "#22c55e" : "#ef4444";
  btn.style.color        = isCorrect ? "#16a34a" : "#dc2626";

  // Дұрыс жауапты бояу
  btns.forEach(b => {
    if (b.onclick === null && b !== btn) {
      // Check correct button
    }
  });

  const card = (window._fcCards || [])[window._fcIndex || 0];
  if (card) {
    if (isCorrect) window._fcKnown.add(card.id);
    else window._fcUnknown.add(card.id);
  }
  updateFCProgress();

  setTimeout(() => {
    window._fcIndex = (window._fcIndex || 0) + 1;
    if (window._fcIndex >= (window._fcCards || []).length) showFCComplete();
    else startTestMode(window._fcCards || []);
  }, 800);
};

// ── SPEED MODE ───────────────────────────────────────
function startSpeedMode(cards) {
  window._fcSpeedSecs  = 10;
  window._fcSpeedScore = 0;

  const idx  = window._fcIndex || 0;
  if (idx >= cards.length) { showFCComplete(); return; }
  const card = cards[idx];

  const area = document.getElementById("fcCardArea");
  if (!area) return;

  if (window._fcSpeedTimer) clearInterval(window._fcSpeedTimer);

  area.innerHTML = `
    <div style="width:100%;max-width:480px;text-align:center;">
      <!-- Timer -->
      <div style="font-size:48px;font-weight:800;color:#7c3aed;margin-bottom:8px;" id="fcSpeedTime">10</div>
      <div style="background:#e9d5ff;border-radius:999px;height:8px;overflow:hidden;margin-bottom:16px;">
        <div id="fcSpeedBar" style="height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa);border-radius:999px;width:100%;transition:width 1s linear;"></div>
      </div>

      <div style="background:white;border-radius:18px;padding:20px;margin-bottom:14px;border:2px solid #e9d5ff;box-shadow:0 8px 24px rgba(76,29,149,0.12);">
        <div style="font-size:11px;color:#7c3aed;margin-bottom:8px;">⚡ Жылдам жауап бер!</div>
        <div style="font-size:20px;font-weight:800;color:#0f172a;">${card.front}</div>
      </div>

      <input id="fcSpeedInput" type="text" placeholder="Жауабыңыз..."
        style="width:100%;padding:12px 14px;border:2px solid #e9d5ff;border-radius:12px;font-size:15px;font-family:inherit;box-sizing:border-box;margin-bottom:8px;"
        onkeydown="if(event.key==='Enter') checkSpeedAnswer()"/>
      <button onclick="checkSpeedAnswer()" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#4c1d95,#7c3aed);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">➡ Жауап</button>
      <div style="margin-top:10px;font-size:12px;color:#64748b;">⚡ Ұпай: <span id="fcSpeedScore" style="font-weight:800;color:#7c3aed;">${window._fcSpeedScore}</span></div>
    </div>
  `;

  let secs = 10;
  window._fcSpeedTimer = setInterval(() => {
    secs--;
    const timeEl = document.getElementById("fcSpeedTime");
    const barEl  = document.getElementById("fcSpeedBar");
    if (timeEl) { timeEl.textContent = secs; timeEl.style.color = secs <= 3 ? "#dc2626" : "#7c3aed"; }
    if (barEl)  barEl.style.width = (secs / 10 * 100) + "%";
    if (secs <= 0) {
      clearInterval(window._fcSpeedTimer);
      window._fcIndex = (window._fcIndex || 0) + 1;
      if (window._fcIndex >= (window._fcCards || []).length) showFCComplete();
      else startSpeedMode(window._fcCards || []);
    }
  }, 1000);

  setTimeout(() => document.getElementById("fcSpeedInput")?.focus(), 100);
}

window.checkSpeedAnswer = function() {
  if (window._fcSpeedTimer) clearInterval(window._fcSpeedTimer);
  const input  = document.getElementById("fcSpeedInput");
  const answer = input?.value.trim().toLowerCase() || "";
  const card   = (window._fcCards || [])[window._fcIndex || 0];
  const correct = (card?.back || "").toLowerCase().trim();

  const isCorrect = answer === correct || correct.includes(answer) && answer.length > 2;
  if (isCorrect) {
    window._fcSpeedScore = (window._fcSpeedScore || 0) + 1;
    window._fcKnown.add(card?.id);
  } else {
    window._fcUnknown.add(card?.id);
  }
  updateFCProgress();

  window._fcIndex = (window._fcIndex || 0) + 1;
  if (window._fcIndex >= (window._fcCards || []).length) showFCComplete();
  else startSpeedMode(window._fcCards || []);
};

// ── Аяқталды ────────────────────────────────────────
function showFCComplete() {
  const area  = document.getElementById("fcCardArea");
  const total = (window._fcCards || []).length;
  const known = window._fcKnown.size;
  const pct   = total > 0 ? Math.round((known / total) * 100) : 0;
  if (!area) return;

  area.innerHTML = `
    <div style="text-align:center;padding:30px;max-width:400px;">
      <div style="font-size:60px;margin-bottom:14px;">${pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:8px;">
        ${pct >= 80 ? "Тамаша!" : pct >= 50 ? "Жақсы!" : "Жалғастыр!"}
      </div>
      <div style="font-size:48px;font-weight:800;color:#7c3aed;margin-bottom:4px;">${pct}%</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:20px;">${known} / ${total} карточка</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button onclick="window._fcIndex=0;window._fcKnown=new Set();window._fcUnknown=new Set();startFlashcards()" style="padding:11px 20px;border:none;border-radius:11px;background:linear-gradient(135deg,#4c1d95,#7c3aed);color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">↺ Қайта</button>
        <button onclick="window._fcIndex=0;startFlashcards()" style="padding:11px 20px;border:1.5px solid #e9d5ff;border-radius:11px;background:#faf5ff;color:#7c3aed;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">📖 Бастан</button>
        <button onclick="addFCToBoard()" style="padding:11px 20px;border:none;border-radius:11px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">📌 Тақтаға</button>
      </div>
    </div>
  `;
}

// ── Тақтаға қосу ────────────────────────────────────
window.addFCToBoard = function() {
  const cards = window._fcCards || [];
  if (!cards.length) return;
  const html = `
    <div style="background:linear-gradient(135deg,#faf5ff,#f5f3ff);border-radius:14px;padding:14px;">
      <div style="font-size:15px;font-weight:800;color:#4c1d95;margin-bottom:12px;">🃏 Flashcards -- ${cards.length} карточка</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        ${cards.map(c => `
          <div style="background:white;border:1px solid #e9d5ff;border-radius:9px;padding:9px 11px;">
            <div style="font-size:12px;font-weight:700;color:#4c1d95;margin-bottom:3px;">${c.front}</div>
            <div style="font-size:11px;color:#64748b;">${c.back}</div>
          </div>`).join("")}
      </div>
    </div>`;
  addBlock("ai", html);
  document.getElementById("fcModal").style.display = "none";
};

// =====================================================
// ШАМ 37: LESSON LIBRARY -- Сабақтар кітапханасы
// Сабақты сақтау / жүктеу / іздеу / бөлісу
// Firebase-та жалпы + жеке коллекция
// =====================================================

window.openLessonLibrary = function() {
  if (document.getElementById("llModal")) {
    document.getElementById("llModal").style.display = "flex";
    loadLibrary();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "llModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(1000px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#0c4a6e,#0369a1,#0ea5e9);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">📚 Сабақтар кітапханасы</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Дайын сабақтарды сақтаңыз, іздеңіз, бөлісіңіз</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="saveCurrLesson()" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">💾 Ағымдағы сабақты сақтау</button>
      <button onclick="document.getElementById('llModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- іздеу + фильтр
  const left = document.createElement("div");
  left.style.cssText = "width:260px;flex-shrink:0;padding:16px;border-right:1px solid #e2e6f0;overflow-y:auto;background:#f0f9ff;";
  left.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">Іздеу</div>

    <input id="llSearch" type="text" placeholder="🔍 Тақырып немесе пән..."
      oninput="searchLibrary(this.value)"
      style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:12px;"/>

    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Коллекция</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:14px;">
      ${[["my","👤 Менің сабақтарым"],["shared","🌐 Жалпы кітапхана"],["favorites","⭐ Таңдаулылар"]].map(([v,l],i) => `
        <button class="ll-col-btn" data-c="${v}" onclick="setLLCol('${v}')" style="
          padding:9px 12px;border-radius:9px;text-align:left;cursor:pointer;font-size:12px;font-weight:700;
          border:1.5px solid ${i===0?'#7dd3fc':'#e2e6f0'};
          background:${i===0?'#e0f2fe':'#fff'};color:#334155;font-family:inherit;
        ">${l}</button>`).join("")}
    </div>

    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Пән</div>
    <select id="llSubjectFilter" onchange="filterLibrary()" style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:12px;font-family:inherit;background:#fff;box-sizing:border-box;margin-bottom:12px;">
      <option value="">Барлық пәндер</option>
      <option>Математика</option>
      <option>Физика</option>
      <option>Химия</option>
      <option>Биология</option>
      <option>Тарих</option>
      <option>Қазақ тілі</option>
      <option>Орыс тілі</option>
      <option>Ағылшын тілі</option>
      <option>География</option>
      <option>Информатика</option>
    </select>

    <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;">Сынып</div>
    <select id="llGradeFilter" onchange="filterLibrary()" style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:12px;font-family:inherit;background:#fff;box-sizing:border-box;margin-bottom:14px;">
      <option value="">Барлық сыныптар</option>
      ${[1,2,3,4,5,6,7,8,9,10,11].map(n=>`<option>${n}-сынып</option>`).join("")}
    </select>

    <!-- Статистика -->
    <div style="background:white;border:1px solid #bae6fd;border-radius:10px;padding:10px 12px;">
      <div style="font-size:11px;font-weight:700;color:#0369a1;margin-bottom:6px;">📊 Статистика</div>
      <div id="llStats" style="font-size:11px;color:#64748b;line-height:1.8;"></div>
    </div>
  `;

  // RIGHT -- сабақтар тор
  const right = document.createElement("div");
  right.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;";
  right.innerHTML = `
    <div style="padding:12px 16px;background:white;border-bottom:1px solid #e2e6f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div style="display:flex;gap:6px;">
        <button id="llViewGrid" onclick="setLLView('grid')" style="padding:5px 10px;border-radius:7px;background:#eef2ff;border:1.5px solid #c7d2fe;color:#4f46e5;font-size:11px;font-weight:700;cursor:pointer;">⊞ Тор</button>
        <button id="llViewList" onclick="setLLView('list')" style="padding:5px 10px;border-radius:7px;background:#f9fafb;border:1px solid #e2e6f0;color:#64748b;font-size:11px;font-weight:700;cursor:pointer;">☰ Тізім</button>
      </div>
      <span id="llCount" style="font-size:11px;color:#64748b;font-weight:600;">0 сабақ</span>
    </div>
    <div id="llLessons" style="flex:1;overflow-y:auto;padding:14px;"></div>
  `;

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._llCol     = "my";
  window._llView    = "grid";
  window._llAll     = [];
  window._llFavs    = new Set(JSON.parse(localStorage.getItem("sb_ll_favs") || "[]"));
  loadLibrary();
};

// ── Коллекция таңдау ────────────────────────────────
window.setLLCol = function(col) {
  window._llCol = col;
  document.querySelectorAll(".ll-col-btn").forEach(btn => {
    const isA = btn.dataset.c === col;
    btn.style.borderColor = isA ? "#7dd3fc" : "#e2e6f0";
    btn.style.background  = isA ? "#e0f2fe" : "#fff";
  });
  loadLibrary();
};

// ── View ────────────────────────────────────────────
window.setLLView = function(view) {
  window._llView = view;
  document.getElementById("llViewGrid").style.background = view === "grid" ? "#eef2ff" : "#f9fafb";
  document.getElementById("llViewList").style.background = view === "list" ? "#eef2ff" : "#f9fafb";
  renderLibrary(window._llAll || []);
};

// ── Жүктеу ──────────────────────────────────────────
function loadLibrary() {
  const col   = window._llCol || "my";
  const path  = col === "shared"    ? "library/shared"
               : col === "favorites" ? "library/shared"
               : `library/teachers/${btoa(auth?.currentUser?.email||"guest").replace(/=/g,"")}`;

  onValue(ref(db, path), (snap) => {
    const data = snap.val() || {};
    let lessons = Object.entries(data).map(([id, l]) => ({ ...l, id }));

    if (col === "favorites") {
      lessons = lessons.filter(l => window._llFavs.has(l.id));
    }

    window._llAll = lessons;
    filterLibrary();
    updateLLStats(lessons);
  }, { onlyOnce: true });
}

function updateLLStats(lessons) {
  const el = document.getElementById("llStats");
  if (!el) return;
  const subjects = [...new Set(lessons.map(l => l.subject).filter(Boolean))];
  el.innerHTML = `
    Барлығы: <b>${lessons.length}</b> сабақ<br>
    Пәндер: <b>${subjects.length}</b><br>
    ⭐ Таңдаулы: <b>${window._llFavs.size}</b>
  `;
}

// ── Іздеу + фильтр ──────────────────────────────────
window.searchLibrary = function(q) {
  window._llSearch = q.toLowerCase();
  filterLibrary();
};

window.filterLibrary = function() {
  const q       = window._llSearch || "";
  const subject = document.getElementById("llSubjectFilter")?.value || "";
  const grade   = document.getElementById("llGradeFilter")?.value || "";

  let filtered = window._llAll || [];
  if (q)       filtered = filtered.filter(l =>
    (l.title||"").toLowerCase().includes(q) ||
    (l.subject||"").toLowerCase().includes(q));
  if (subject) filtered = filtered.filter(l => l.subject === subject);
  if (grade)   filtered = filtered.filter(l => l.grade === grade);

  renderLibrary(filtered);
};

// ── Рендер ──────────────────────────────────────────
function renderLibrary(lessons) {
  const el    = document.getElementById("llLessons");
  const count = document.getElementById("llCount");
  if (!el) return;
  if (count) count.textContent = `${lessons.length} сабақ`;

  if (!lessons.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#94a3b8;">
        <div style="font-size:48px;margin-bottom:12px;">📭</div>
        <div style="font-size:14px;font-weight:700;color:#374151;">Сабақтар жоқ</div>
        <div style="font-size:12px;margin-top:6px;">«💾 Ағымдағы сабақты сақтау» батырмасын қолданыңыз</div>
      </div>`;
    return;
  }

  const isGrid = (window._llView || "grid") === "grid";
  el.style.display = isGrid ? "grid" : "flex";
  el.style.gridTemplateColumns = isGrid ? "repeat(auto-fill,minmax(220px,1fr))" : "";
  el.style.flexDirection = "column";
  el.style.gap = "10px";

  const SUBJECT_COLORS = {
    "Математика":["#eef2ff","#4f46e5"],"Физика":["#e0f2fe","#0369a1"],
    "Химия":["#fef3c7","#d97706"],"Биология":["#f0fdf4","#16a34a"],
    "Тарих":["#fff7ed","#c2410c"],"Қазақ тілі":["#fdf4ff","#7c3aed"],
  };

  el.innerHTML = lessons.map(l => {
    const [bg, ac] = SUBJECT_COLORS[l.subject] || ["#f8f9ff","#4f46e5"];
    const isFav = window._llFavs.has(l.id);
    const dateStr = l.savedAt
      ? new Date(l.savedAt).toLocaleDateString("kk-KZ",{day:"numeric",month:"short",year:"numeric"})
      : "";

    if (isGrid) {
      return `
        <div style="background:#fff;border:1.5px solid #e2e6f0;border-radius:16px;overflow:hidden;cursor:pointer;transition:.15s;box-shadow:0 2px 8px rgba(15,23,42,0.06);"
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(15,23,42,0.12)'"
          onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(15,23,42,0.06)'">
          <!-- Color header -->
          <div style="background:${bg};padding:12px 14px;border-bottom:1px solid ${ac}22;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="font-size:11px;font-weight:700;color:${ac};background:${ac}15;padding:2px 8px;border-radius:999px;">${l.subject||"Жалпы"}</div>
              <button onclick="toggleLLFav('${l.id}',event)" style="background:none;border:none;cursor:pointer;font-size:16px;">${isFav?"⭐":"☆"}</button>
            </div>
            <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:8px;line-height:1.3;">${l.title||"Сабақ"}</div>
          </div>
          <!-- Info -->
          <div style="padding:10px 14px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
              ${l.grade ? `<span style="font-size:10px;background:#f0f2f8;color:#64748b;padding:2px 7px;border-radius:999px;">${l.grade}</span>` : ""}
              ${l.blocksCount ? `<span style="font-size:10px;background:#f0f2f8;color:#64748b;padding:2px 7px;border-radius:999px;">${l.blocksCount} блок</span>` : ""}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${dateStr}</div>
            <div style="display:flex;gap:5px;">
              <button onclick="loadLesson('${l.id}')" style="flex:1;padding:7px;border:none;border-radius:8px;background:${ac};color:white;font-size:11px;font-weight:700;cursor:pointer;">📂 Ашу</button>
              <button onclick="shareLesson('${l.id}',event)" style="padding:7px 10px;border:1px solid #e2e6f0;border-radius:8px;background:#f9fafb;font-size:11px;cursor:pointer;" title="Бөлісу">🔗</button>
              <button onclick="deleteLesson('${l.id}',event)" style="padding:7px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;font-size:11px;cursor:pointer;" title="Жою">🗑</button>
            </div>
          </div>
        </div>`;
    } else {
      return `
        <div style="background:#fff;border:1px solid #e2e6f0;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📄</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;">${l.title||"Сабақ"}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${[l.subject,l.grade,dateStr].filter(Boolean).join(" • ")}</div>
          </div>
          <div style="display:flex;gap:5px;">
            <button onclick="toggleLLFav('${l.id}',event)" style="background:none;border:none;cursor:pointer;font-size:16px;">${isFav?"⭐":"☆"}</button>
            <button onclick="loadLesson('${l.id}')" style="padding:6px 12px;border:none;border-radius:8px;background:${ac};color:white;font-size:11px;font-weight:700;cursor:pointer;">📂 Ашу</button>
            <button onclick="shareLesson('${l.id}',event)" style="padding:6px 10px;border:1px solid #e2e6f0;border-radius:8px;background:#f9fafb;font-size:11px;cursor:pointer;">🔗</button>
            <button onclick="deleteLesson('${l.id}',event)" style="padding:6px 10px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;color:#dc2626;font-size:11px;cursor:pointer;">🗑</button>
          </div>
        </div>`;
    }
  }).join("");
}

// ── Ағымдағы сабақты сақтау ─────────────────────────
window.saveCurrLesson = function() {
  const blocks  = getCurrentBlocks?.() || [];
  const subject = document.getElementById("llSaveSubject");
  const grade   = document.getElementById("llSaveGrade");

  // Save dialog
  const dialog = document.createElement("div");
  dialog.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:500;display:flex;align-items:center;justify-content:center;";
  dialog.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:24px;width:min(420px,92vw);box-shadow:0 20px 60px rgba(15,23,42,0.2);">
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:16px;">💾 Сабақты сақтау</div>
      <div style="margin-bottom:10px;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Сабақ атауы</label>
        <input id="llSaveTitle" type="text" placeholder="Мысалы: Квадрат теңдеу -- 8-сынып"
          style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;"/>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Пән</label>
          <input id="llSaveSubject" type="text" placeholder="Математика"
            style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;"/>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Сынып</label>
          <input id="llSaveGrade" type="text" placeholder="8-сынып"
            style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;box-sizing:border-box;"/>
        </div>
      </div>
      <label style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px;margin-bottom:16px;cursor:pointer;">
        <input type="checkbox" id="llSharePublic"> Жалпы кітапханаға қосу (барлығы көреді)
      </label>
      <div style="display:flex;gap:8px;">
        <button onclick="this.closest('[style]').remove()" style="flex:1;padding:10px;border:1px solid #e2e6f0;border-radius:10px;background:#f9fafb;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Болдырмау</button>
        <button onclick="confirmSaveLesson()" style="flex:1;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">💾 Сақтау</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
};

window.confirmSaveLesson = async function() {
  const title   = document.getElementById("llSaveTitle")?.value.trim();
  const subject = document.getElementById("llSaveSubject")?.value.trim() || "";
  const grade   = document.getElementById("llSaveGrade")?.value.trim() || "";
  const isPublic = document.getElementById("llSharePublic")?.checked || false;
  if (!title) { showToast("⚠️ Атауын жазыңыз!", "warn"); return; }

  const blocks = getCurrentBlocks?.() || [];
  const email  = auth?.currentUser?.email || "guest";
  const uid    = btoa(email).replace(/=/g, "");

  const lessonData = {
    title, subject, grade,
    blocks: blocks.slice(0, 50),
    blocksCount: blocks.length,
    savedAt: Date.now(),
    author: email,
    authorId: uid,
  };

  try {
    const myRef   = push(ref(db, `library/teachers/${uid}`));
    await set(myRef, lessonData);

    if (isPublic) {
      await set(ref(db, `library/shared/${myRef.key}`), lessonData);
    }

    document.querySelector("[style*='position:fixed;inset:0;background:rgba(15,23,42,0.5)']")?.remove();
    showToast("✅ Сабақ сақталды!", "ok");
    loadLibrary();
  } catch(e) {
    showToast("❌ Қате: " + e.message, "error");
  }
};

// ── Сабақты ашу ─────────────────────────────────────
window.loadLesson = function(id) {
  const lesson = (window._llAll || []).find(l => l.id === id);
  if (!lesson?.blocks?.length) { showToast("Блоктар жоқ", "info"); return; }

  if (!confirm(`"${lesson.title}" сабағын тақтаға жүктеу керек пе? Ағымдағы тақта тазаланады.`)) return;

  // Тақтаны тазалап жаңа блоктарды қосу
  const arr = getCurrentBlocks?.();
  if (arr) {
    arr.length = 0;
    lesson.blocks.forEach(b => arr.push(b));
    window.renderBoard?.();
  }

  document.getElementById("llModal").style.display = "none";
  showToast(`✅ "${lesson.title}" тақтаға жүктелді!`, "ok");
};

// ── Бөлісу ──────────────────────────────────────────
window.shareLesson = function(id, e) {
  e?.stopPropagation();
  const lesson = (window._llAll || []).find(l => l.id === id);
  if (!lesson) return;
  const shareText = `📚 SmartBoardAI PRO сабағы: "${lesson.title}"${lesson.subject?` -- ${lesson.subject}`:''}${lesson.grade?` (${lesson.grade})`:''}`;
  navigator.clipboard.writeText(shareText).then(() => {
    showToast("✅ Сабақ туралы мәлімет көшірілді!", "ok");
  });
};

// ── Таңдаулы ────────────────────────────────────────
window.toggleLLFav = function(id, e) {
  e?.stopPropagation();
  if (window._llFavs.has(id)) window._llFavs.delete(id);
  else window._llFavs.add(id);
  localStorage.setItem("sb_ll_favs", JSON.stringify([...window._llFavs]));
  filterLibrary();
  updateLLStats(window._llAll || []);
};

// ── Жою ────────────────────────────────────────────
window.deleteLesson = function(id, e) {
  e?.stopPropagation();
  if (!confirm("Сабақты жоясыз ба?")) return;
  const email = auth?.currentUser?.email || "guest";
  const uid   = btoa(email).replace(/=/g, "");
  set(ref(db, `library/teachers/${uid}/${id}`), null);
  set(ref(db, `library/shared/${id}`), null);
  window._llAll = (window._llAll || []).filter(l => l.id !== id);
  filterLibrary();
};

// =====================================================
// ШАМ 38: TEACHER COMMUNITY
// Мұғалімдер чаты + сабақтарды бөлісу + форум
// Firebase Realtime DB нақты уақыт хабарламалар
// =====================================================

window.openCommunity = function() {
  if (document.getElementById("tcModal")) {
    document.getElementById("tcModal").style.display = "flex";
    loadCommunity();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "tcModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(1020px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#831843,#be185d,#ec4899);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">👥 Мұғалімдер қауымдастығы</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Нақты уақыт чат • Сабақтарды бөлісу • Форум</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <div id="tcOnline" style="background:rgba(255,255,255,0.15);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);">● 0 онлайн</div>
      <button onclick="document.getElementById('tcModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  `;

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden;";

  // LEFT -- навигация
  const left = document.createElement("div");
  left.style.cssText = "width:220px;flex-shrink:0;background:#fdf2f8;border-right:1px solid #fce7f3;display:flex;flex-direction:column;";
  left.innerHTML = `
    <div style="padding:14px;">
      <!-- Профиль -->
      <div style="background:white;border:1px solid #fce7f3;border-radius:12px;padding:10px 12px;margin-bottom:12px;">
        <div id="tcMyProfile" style="display:flex;align-items:center;gap:8px;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#be185d,#ec4899);display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:800;flex-shrink:0;" id="tcAvatar">?</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#0f172a;" id="tcMyName">Анонимді</div>
            <div style="font-size:10px;color:#94a3b8;" id="tcMyEmail">Кіру керек</div>
          </div>
        </div>
        <input id="tcNickname" type="text" placeholder="Лақап атыңыз..."
          style="width:100%;padding:6px 8px;border:1px solid #e2e6f0;border-radius:7px;font-size:11px;font-family:inherit;box-sizing:border-box;margin-top:7px;"
          onkeydown="if(event.key==='Enter') saveTCNickname()"/>
        <button onclick="saveTCNickname()" style="width:100%;padding:5px;border:none;border-radius:6px;background:#be185d;color:white;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px;">Сақтау</button>
      </div>

      <!-- Арналар -->
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">Арналар</div>
      <div style="display:flex;flex-direction:column;gap:3px;" id="tcChannels">
        ${[
          ["general","💬","Жалпы чат"],
          ["math","📐","Математика"],
          ["science","🔬","Жаратылыстану"],
          ["language","📝","Тілдер"],
          ["primary","🎒","Бастауыш"],
          ["share","📚","Сабақтар бөлісу"],
          ["ideas","💡","Идеялар"],
        ].map(([v,ic,l],i) => `
          <button class="tc-ch-btn" data-ch="${v}" onclick="setTCChannel('${v}')" style="
            padding:8px 10px;border-radius:8px;text-align:left;cursor:pointer;
            font-size:12px;font-weight:600;font-family:inherit;
            border:none;display:flex;align-items:center;gap:7px;
            background:${i===0?'#fce7f3':'transparent'};
            color:${i===0?'#be185d':'#374151'};
          ">
            <span>${ic}</span><span>${l}</span>
            <span class="tc-badge" id="tcBadge-${v}" style="display:none;background:#ef4444;color:white;font-size:9px;font-weight:800;padding:1px 5px;border-radius:999px;margin-left:auto;"></span>
          </button>`).join("")}
      </div>
    </div>

    <!-- Онлайн пайдаланушылар -->
    <div style="padding:14px;border-top:1px solid #fce7f3;margin-top:auto;">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;">Онлайн</div>
      <div id="tcOnlineList" style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto;"></div>
    </div>
  `;

  // CENTER -- чат
  const center = document.createElement("div");
  center.style.cssText = "flex:1;display:flex;flex-direction:column;overflow:hidden;border-right:1px solid #e2e6f0;";
  center.innerHTML = `
    <!-- Channel header -->
    <div style="padding:12px 16px;background:white;border-bottom:1px solid #e2e6f0;display:flex;align-items:center;gap:10px;flex-shrink:0;">
      <span id="tcCurrIcon" style="font-size:18px;">💬</span>
      <div>
        <div id="tcCurrName" style="font-size:13px;font-weight:700;color:#0f172a;">Жалпы чат</div>
        <div id="tcCurrDesc" style="font-size:10px;color:#94a3b8;">Барлық мұғалімдерге арналған</div>
      </div>
    </div>

    <!-- Messages -->
    <div id="tcMessages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#fafafa;"></div>

    <!-- Input -->
    <div style="padding:10px 14px;background:white;border-top:1px solid #e2e6f0;flex-shrink:0;">
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <div style="flex:1;background:#f9fafb;border:1.5px solid #e2e6f0;border-radius:12px;padding:8px 12px;display:flex;align-items:center;gap:6px;">
          <textarea id="tcInput" placeholder="Хабарлама жазыңыз..." rows="1"
            style="flex:1;border:none;outline:none;background:transparent;font-size:13px;font-family:inherit;resize:none;max-height:80px;"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendTCMessage();}"
            oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
          <button onclick="sendTCFile()" style="background:none;border:none;cursor:pointer;font-size:16px;color:#94a3b8;" title="Файл">📎</button>
        </div>
        <button onclick="sendTCMessage()" style="width:42px;height:42px;border:none;border-radius:12px;background:linear-gradient(135deg,#be185d,#ec4899);color:white;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➤</button>
      </div>
      <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap;">
        ${["👍","🎉","🔥","💡","❓","📚","✅","🙏"].map(e => `
          <button onclick="sendTCEmoji('${e}')" style="background:none;border:1px solid #e2e6f0;border-radius:6px;padding:3px 7px;font-size:14px;cursor:pointer;">${e}</button>`).join("")}
      </div>
    </div>
  `;

  // RIGHT -- форум постары
  const right = document.createElement("div");
  right.style.cssText = "width:260px;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;";
  right.innerHTML = `
    <div style="padding:12px 14px;background:white;border-bottom:1px solid #e2e6f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <span style="font-size:12px;font-weight:700;color:#0f172a;">📌 Жарияланымдар</span>
      <button onclick="openTCPostDialog()" style="background:#be185d;color:white;border:none;border-radius:7px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;">+ Жазу</button>
    </div>
    <div id="tcPosts" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;">
      <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">Жарияланымдар жоқ</div>
    </div>
  `;

  body.appendChild(left);
  body.appendChild(center);
  body.appendChild(right);
  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  window._tcChannel = "general";
  window._tcNick    = localStorage.getItem("sb_tc_nickname") || (auth?.currentUser?.email?.split("@")[0] || "Мұғалім");
  window._tcMsgListener = null;

  // Modal жабылғанда listener тазалау
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      if (window._tcMsgListener) { window._tcMsgListener(); window._tcMsgListener = null; }
    }
  });

  // Профиль
  const nameEl  = document.getElementById("tcMyName");
  const emailEl = document.getElementById("tcMyEmail");
  const nickInp = document.getElementById("tcNickname");
  if (nameEl)  nameEl.textContent  = window._tcNick;
  if (emailEl) emailEl.textContent = auth?.currentUser?.email || "guest";
  if (nickInp) nickInp.value       = window._tcNick;

  loadCommunity();
  markTCOnline();
};

// ── Nickname ────────────────────────────────────────
window.saveTCNickname = function() {
  const val = document.getElementById("tcNickname")?.value.trim();
  if (!val) return;
  window._tcNick = val;
  localStorage.setItem("sb_tc_nickname", val);
  const nameEl = document.getElementById("tcMyName");
  if (nameEl) nameEl.textContent = val;
};

// ── Online белгілеу ──────────────────────────────────
function markTCOnline() {
  const uid  = btoa((auth?.currentUser?.email || "guest") + Date.now()).replace(/=/g,"").slice(0,12);
  window._tcUID = uid;
  const onRef = ref(db, `community/online/${uid}`);
  set(onRef, { name: window._tcNick, time: Date.now() });
  // 30 сек сайын жаңарту
  setInterval(() => set(onRef, { name: window._tcNick, time: Date.now() }), 30000);
  // Онлайн тыңдау
  onValue(ref(db, "community/online"), (snap) => {
    const users = snap.val() || {};
    const now   = Date.now();
    // 60 секундтан ескілерін өшір
    const active = Object.entries(users).filter(([,u]) => (now - u.time) < 60000);
    const countEl = document.getElementById("tcOnline");
    if (countEl) countEl.textContent = `● ${active.length} онлайн`;
    const listEl = document.getElementById("tcOnlineList");
    if (listEl) {
      listEl.innerHTML = active.slice(0,8).map(([,u]) => `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;"></span>
          <span style="font-size:11px;color:#334155;font-weight:600;truncate;">${u.name||"Мұғалім"}</span>
        </div>`).join("");
    }
  });
}

// ── Арна таңдау ─────────────────────────────────────
window.setTCChannel = function(ch) {
  window._tcChannel = ch;
  document.querySelectorAll(".tc-ch-btn").forEach(btn => {
    const isA = btn.dataset.ch === ch;
    btn.style.background = isA ? "#fce7f3" : "transparent";
    btn.style.color      = isA ? "#be185d" : "#374151";
  });

  const META = {
    general: ["💬","Жалпы чат","Барлық мұғалімдерге арналған"],
    math:    ["📐","Математика","Математика мұғалімдері"],
    science: ["🔬","Жаратылыстану","Физика, химия, биология"],
    language:["📝","Тілдер","Қазақ, орыс, ағылшын тілі"],
    primary: ["🎒","Бастауыш","1-4 сынып мұғалімдері"],
    share:   ["📚","Сабақтарды бөлісу","Дайын сабақтар мен ресурстар"],
    ideas:   ["💡","Идеялар","Жаңа идеялар мен ұсыныстар"],
  };
  const [ic, name, desc] = META[ch] || ["💬","Чат",""];
  const icon = document.getElementById("tcCurrIcon");
  const nm   = document.getElementById("tcCurrName");
  const ds   = document.getElementById("tcCurrDesc");
  if (icon) icon.textContent = ic;
  if (nm)   nm.textContent   = name;
  if (ds)   ds.textContent   = desc;

  // Badge өшіру
  const badge = document.getElementById(`tcBadge-${ch}`);
  if (badge) badge.style.display = "none";

  loadCommunity();
};

// ── Чат жүктеу ──────────────────────────────────────
function loadCommunity() {
  if (window._tcMsgListener) window._tcMsgListener();
  const ch = window._tcChannel || "general";

  window._tcMsgListener = onValue(
    ref(db, `community/channels/${ch}/messages`),
    (snap) => {
      const msgs = snap.val() || {};
      renderTCMessages(Object.entries(msgs).sort((a,b) => (a[1].time||0) - (b[1].time||0)));
    }
  );

  loadTCPosts();
}

function renderTCMessages(entries) {
  const el = document.getElementById("tcMessages");
  if (!el) return;

  const myNick = window._tcNick || "Мұғалім";

  if (!entries.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-size:12px;"><div style="font-size:32px;margin-bottom:8px;">💬</div>Бірінші болып хабарлама жіберіңіз!</div>`;
    return;
  }

  el.innerHTML = entries.map(([id, msg]) => {
    const isMe   = msg.nick === myNick;
    const time   = msg.time ? new Date(msg.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"}) : "";
    const isEmoji = /^[\u{1F300}-\u{1F9FF}]+$/u.test(msg.text||"");

    return `
      <div style="display:flex;flex-direction:${isMe?'row-reverse':'row'};align-items:flex-end;gap:6px;">
        ${!isMe ? `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#be185d,#ec4899);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:800;flex-shrink:0;">${(msg.nick||"?")[0].toUpperCase()}</div>` : ""}
        <div style="max-width:68%;display:flex;flex-direction:column;${isMe?'align-items:flex-end':'align-items:flex-start'}">
          ${!isMe ? `<span style="font-size:10px;font-weight:700;color:#be185d;margin-bottom:2px;">${escapeHtml(msg.nick||"Мұғалім")}</span>` : ""}
          <div style="
            background:${isMe?'linear-gradient(135deg,#be185d,#ec4899)':'white'};
            color:${isMe?'white':'#0f172a'};
            padding:${isEmoji?'4px 8px':'9px 12px'};
            border-radius:${isMe?'14px 14px 4px 14px':'14px 14px 14px 4px'};
            font-size:${isEmoji?'28px':'13px'};
            line-height:1.4;
            border:${isMe?'none':'1px solid #f3f4f6'};
            box-shadow:0 2px 8px rgba(15,23,42,0.06);
            word-break:break-word;
          ">${msg.text||""}</div>
          <span style="font-size:10px;color:#94a3b8;margin-top:2px;">${time}</span>
        </div>
      </div>`;
  }).join("");

  // Автоматты скрол
  el.scrollTop = el.scrollHeight;
}

// ── Хабарлама жіберу ────────────────────────────────
window.sendTCMessage = async function() {
  const input = document.getElementById("tcInput");
  const text  = input?.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "auto";

  const ch = window._tcChannel || "general";
  try {
    await push(ref(db, `community/channels/${ch}/messages`), {
      nick: window._tcNick || "Мұғалім",
      text, time: Date.now(),
      uid: window._tcUID || "guest"
    });
  } catch(e) {
    console.error(e);
  }
};

window.sendTCEmoji = function(emoji) {
  const input = document.getElementById("tcInput");
  if (input) input.value += emoji;
  input?.focus();
};

window.sendTCFile = function() {
  showToast("ℹ️ Файл жіберу -- жақында қосылады!", "info");
};

// ── Жарияланым (Post) ───────────────────────────────
function loadTCPosts() {
  onValue(ref(db, "community/posts"), (snap) => {
    const posts = snap.val() || {};
    renderTCPosts(Object.entries(posts).sort((a,b) => (b[1].time||0) - (a[1].time||0)));
  }, { onlyOnce: true });
}

function renderTCPosts(entries) {
  const el = document.getElementById("tcPosts");
  if (!el) return;

  if (!entries.length) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">Жарияланымдар жоқ</div>`;
    return;
  }

  el.innerHTML = entries.slice(0,20).map(([id, p]) => {
    const time = p.time ? new Date(p.time).toLocaleDateString("kk-KZ",{day:"numeric",month:"short"}) : "";
    const likes = p.likes || 0;
    const hasLiked = (window._tcLiked || new Set()).has(id);

    return `
      <div style="background:white;border:1px solid #fce7f3;border-radius:12px;padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#be185d,#ec4899);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:800;">${(p.nick||"?")[0]}</div>
          <span style="font-size:11px;font-weight:700;color:#be185d;">${escapeHtml(p.nick||"Мұғалім")}</span>
          <span style="font-size:10px;color:#94a3b8;margin-left:auto;">${time}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">${escapeHtml(p.title||"")}</div>
        <div style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:8px;">${(p.body||"").slice(0,100)}${(p.body||"").length>100?"...":""}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          ${p.tag ? `<span style="background:#fce7f3;color:#be185d;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;">${p.tag}</span>` : ""}
          <button onclick="likeTCPost('${id}')" style="background:none;border:1px solid ${hasLiked?'#ec4899':'#e2e6f0'};border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:${hasLiked?'#be185d':'#64748b'};">❤ ${likes}</button>
        </div>
      </div>`;
  }).join("");
}

// ── Пост жасау ──────────────────────────────────────
window.openTCPostDialog = function() {
  const dialog = document.createElement("div");
  dialog.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:500;display:flex;align-items:center;justify-content:center;";
  dialog.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:22px;width:min(460px,92vw);box-shadow:0 20px 60px rgba(15,23,42,0.2);">
      <div style="font-size:15px;font-weight:800;color:#0f172a;margin-bottom:14px;">📌 Жаңа жарияланым</div>
      <input id="tcPostTitle" type="text" placeholder="Тақырып..."
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;box-sizing:border-box;margin-bottom:8px;"/>
      <textarea id="tcPostBody" rows="4" placeholder="Мазмұн..."
        style="width:100%;padding:9px 11px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:13px;font-family:inherit;resize:none;box-sizing:border-box;margin-bottom:8px;"></textarea>
      <select id="tcPostTag" style="width:100%;padding:8px 10px;border:1.5px solid #e2e6f0;border-radius:9px;font-size:12px;font-family:inherit;background:#fff;box-sizing:border-box;margin-bottom:14px;">
        <option value="">Тег таңдаңыз</option>
        <option>📚 Сабақ</option><option>💡 Идея</option>
        <option>❓ Сұрақ</option><option>🔥 Ресурс</option>
        <option>🎉 Жетістік</option><option>📢 Жарнама</option>
      </select>
      <div style="display:flex;gap:8px;">
        <button onclick="this.closest('[style]').remove()" style="flex:1;padding:10px;border:1px solid #e2e6f0;border-radius:10px;background:#f9fafb;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Болдырмау</button>
        <button onclick="publishTCPost()" style="flex:1;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#be185d,#ec4899);color:white;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">📌 Жариялау</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
};

// ── Firebase-та parent message сақтау ──────────────
window.saveParentMsgToFirebase = async function(studentName, msg) {
  if (!currentRoom) return;
  try {
    const msgRef = push(ref(db, `rooms/${currentRoom}/parentMessages`));
    await set(msgRef, {
      studentName,
      message: msg,
      teacherEmail: auth?.currentUser?.email || "",
      time: Date.now(),
      sent: true,
    });
    showToast("✅ Хабарлама Firebase-та сақталды", "ok");
  } catch(e) {
    console.error("Parent msg save error:", e);
  }
};

// ── Оқушыны тіркеу (Firebase-та) ──────────────────
// Мұғалім оқушының ата-анасының контактісін сақтайды
window.openStudentContacts = function() {
  const students = Object.values(analyticsData.students || {});
  if (!students.length) { showToast("⚠️ Оқушылар жоқ — алдымен бөлме ашыңыз", "warn"); return; }

  if (document.getElementById("scModal")) {
    document.getElementById("scModal").style.display = "flex";
    renderStudentContacts(students);
    return;
  }

  const modal = document.createElement("div");
  modal.id = "scModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(6px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:20px;width:min(600px,96vw);max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.2);overflow:hidden;";

  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#0c4a6e,#0369a1);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `<div><div style="font-size:15px;font-weight:800;color:white;">👥 Оқушы контактілері</div><div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Ата-ана телефоны мен emailін сақтаңыз</div></div>`;
  const cls = document.createElement("button");
  cls.style.cssText = "background:rgba(255,255,255,0.15);color:white;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;";
  cls.textContent = "✕";
  cls.onclick = () => modal.style.display = "none";
  hdr.appendChild(cls);

  const body = document.createElement("div");
  body.id = "scBody";
  body.style.cssText = "flex:1;overflow-y:auto;padding:14px;";

  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.body.appendChild(modal);

  renderStudentContacts(students);
};

function renderStudentContacts(students) {
  const body = document.getElementById("scBody");
  if (!body) return;

  body.innerHTML = `
    <div style="font-size:11px;color:#64748b;margin-bottom:12px;">
      Ата-ана контактілерін сақтаңыз — кейін хабарлама жіберуге пайдаланылады
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${students.map(s => {
        const saved = JSON.parse(localStorage.getItem("sb_contacts") || "{}");
        const contact = saved[s.name] || {};
        return `
          <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:12px;padding:12px 14px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:20px;">${s.avatar||"🙂"}</span>
              <span style="font-size:13px;font-weight:700;color:#0f172a;">${s.name||"Оқушы"}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <input type="tel" placeholder="📱 Телефон: +7..." value="${contact.phone||""}"
                id="sc_phone_${s.name.replace(/\s/g,'_')}"
                style="padding:7px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;"/>
              <input type="email" placeholder="📧 Email" value="${contact.email||""}"
                id="sc_email_${s.name.replace(/\s/g,'_')}"
                style="padding:7px 10px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;font-family:inherit;"/>
            </div>
            <button onclick="saveStudentContact('${s.name}')" style="
              width:100%;padding:7px;border:none;border-radius:8px;margin-top:7px;
              background:#0369a1;color:white;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;
            ">💾 Сақтау</button>
          </div>`;
      }).join("")}
    </div>`;
}

window.saveStudentContact = function(name) {
  const key    = name.replace(/\s/g, "_");
  const phone  = document.getElementById(`sc_phone_${key}`)?.value.trim() || "";
  const email  = document.getElementById(`sc_email_${key}`)?.value.trim() || "";
  const saved  = JSON.parse(localStorage.getItem("sb_contacts") || "{}");
  saved[name]  = { phone, email };
  localStorage.setItem("sb_contacts", JSON.stringify(saved));
  showToast("✅ " + name + " контакті сақталды", "ok");

  // Firebase-та да сақтау
  if (currentRoom && auth?.currentUser) {
    const uid = auth.currentUser.uid;
    set(ref(db, `users/${uid}/studentContacts/${btoa(name).replace(/=/g,"")}`), {
      name, phone, email, savedAt: Date.now()
    });
  }
};

window.publishTCPost = async function() {
  const title = document.getElementById("tcPostTitle")?.value.trim();
  const body  = document.getElementById("tcPostBody")?.value.trim();
  const tag   = document.getElementById("tcPostTag")?.value || "";
  if (!title || !body) { showToast("⚠️ Тақырып пен мазмұн жазыңыз!", "warn"); return; }

  try {
    await push(ref(db, "community/posts"), {
      nick: window._tcNick || "Мұғалім",
      title, body, tag,
      time: Date.now(), likes: 0,
      uid: window._tcUID || "guest"
    });
    document.querySelector("[style*='position:fixed;inset:0;background:rgba(15,23,42,0.5)']")?.remove();
    loadTCPosts();
  } catch(e) { showToast("❌ Қате: " + e.message, "error"); }
};

// ── Like ─────────────────────────────────────────────
window.likeTCPost = async function(id) {
  window._tcLiked = window._tcLiked || new Set();
  if (window._tcLiked.has(id)) return;
  window._tcLiked.add(id);
  const postRef = ref(db, `community/posts/${id}`);
  onValue(postRef, (snap) => {
    const p = snap.val();
    if (p) set(postRef, {...p, likes: (p.likes||0) + 1});
  }, { onlyOnce: true });
  loadTCPosts();
};

// =====================================================
// ШАМ 39: OFFLINE MODE
// Service Worker + Cache API + IndexedDB
// Интернетсіз жұмыс + автоматты синхрондау
// =====================================================

const OFFLINE_VERSION = "smartboard-v1";
const CACHE_ASSETS    = [
  "/teacher.html", "/teacher.js", "/main.css",
  "/student.html", "/student.js", "/hub.html",
  "/firebaseConfig.js", "/lessonCabinet.js",
];

// ── Service Worker ӨШІРІЛДІ ──────────────────────────
// Офлайн режим уақытша алынды (платформа жиі жаңартылып
// тұрғанда service worker ескі/бұзылған нұсқаны кэштен
// көрсетіп қоюы мүмкін). Бұрын орнатылған SW мен кэшті
// тазалаймыз, жаңасын тіркемейміз.
window.initOfflineMode = function() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });

  if (window.caches && caches.keys) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }

  window._swReg = null;
  updateOfflineUI(false);
  updateConnectionUI(navigator.onLine);
};

// ── Офлайн UI жаңарту ───────────────────────────────
function updateOfflineUI(swActive) {
  const badge = document.getElementById("offlineBadge");
  if (badge) {
    badge.style.display = swActive ? "flex" : "none";
    badge.title = swActive ? "Офлайн режим белсенді" : "Офлайн режим жоқ";
  }
}

function updateConnectionUI(isOnline) {
  const indicator = document.getElementById("connectionIndicator");
  if (!indicator) return;
  indicator.textContent = isOnline ? "🟢" : "🔴";
  indicator.title = isOnline ? "Онлайн" : "Офлайн";
}

// ── Toast хабарлама ─────────────────────────────────
function showOfflineToast(msg, type) {
  const existing = document.getElementById("offlineToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "offlineToast";
  toast.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:${type==="ok"?"#0f172a":"#b45309"};
    color:white;padding:10px 20px;border-radius:999px;
    font-size:13px;font-weight:700;font-family:'Inter',sans-serif;
    z-index:600;animation:card-in .3s ease;
    box-shadow:0 8px 24px rgba(15,23,42,0.3);
    display:flex;align-items:center;gap:8px;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── LocalStorage кэш (офлайн үшін) ──────────────────
window.saveOfflineBlocks = function() {
  try {
    const blocks = getCurrentBlocks?.() || [];
    const pages  = window.pages || [];
    localStorage.setItem("sb_offline_blocks",  JSON.stringify(blocks));
    localStorage.setItem("sb_offline_pages",   JSON.stringify(pages));
    localStorage.setItem("sb_offline_saved",   new Date().toISOString());
    return true;
  } catch(e) {
    console.error("Офлайн сақтау қатесі:", e);
    return false;
  }
};

window.loadOfflineBlocks = function() {
  try {
    const blocks = JSON.parse(localStorage.getItem("sb_offline_blocks") || "[]");
    const pages  = JSON.parse(localStorage.getItem("sb_offline_pages")  || "null");
    const saved  = localStorage.getItem("sb_offline_saved");
    return { blocks, pages, saved };
  } catch(e) {
    return { blocks: [], pages: null, saved: null };
  }
};

// ── Офлайн деректерді синхрондау ────────────────────
async function syncOfflineData() {
  if (!navigator.onLine) return;

  const queue = JSON.parse(localStorage.getItem("sb_offline_queue") || "[]");
  if (!queue.length) return;

  let synced = 0;
  for (const item of queue) {
    try {
      if (item.type === "answer" && currentRoom) {
        await push(ref(db, `rooms/${currentRoom}/answers`), item.data);
        synced++;
      } else if (item.type === "block" && currentRoom) {
        await set(ref(db, `rooms/${currentRoom}/activeBlock`), item.data);
        synced++;
      }
    } catch(e) {
      console.error("Sync қате:", e);
    }
  }

  if (synced > 0) {
    localStorage.removeItem("sb_offline_queue");
    showOfflineToast(`✅ ${synced} дерек синхрондалды`, "ok");
  }
}

// ── Офлайн кезекке қосу ─────────────────────────────
window.queueOfflineAction = function(type, data) {
  const queue = JSON.parse(localStorage.getItem("sb_offline_queue") || "[]");
  queue.push({ type, data, time: Date.now() });
  localStorage.setItem("sb_offline_queue", JSON.stringify(queue));
};

// ── Офлайн панель ───────────────────────────────────
window.openOfflinePanel = function() {
  if (document.getElementById("offlineModal")) {
    document.getElementById("offlineModal").style.display = "flex";
    refreshOfflinePanel();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "offlineModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(620px,96vw);max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  const hdr = document.createElement("div");
  hdr.style.cssText = "background:linear-gradient(135deg,#1f2937,#374151,#6b7280);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;";
  hdr.innerHTML = `
    <div>
      <div style="font-size:17px;font-weight:800;color:white;">📡 Офлайн режим</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Интернетсіз жұмыс + автоматты синхрондау</div>
    </div>
    <button onclick="document.getElementById('offlineModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
  `;

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:20px;";
  body.innerHTML = `
    <!-- Connection status -->
    <div id="offlineConnStatus" style="border-radius:16px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:14px;"></div>

    <!-- Actions -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <button onclick="saveOfflineNow()" style="padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#1f2937,#374151);color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <span style="font-size:24px;">💾</span>Ағымдағы сабақты<br>офлайн сақтау
      </button>
      <button onclick="loadOfflineNow()" style="padding:14px;border:1px solid #e2e6f0;border-radius:14px;background:#f9fafb;color:#374151;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <span style="font-size:24px;">📂</span>Офлайн сабақты<br>жүктеу
      </button>
      <button onclick="syncOfflineData();showOfflineToast('🔄 Синхрондалуда...','warn')" style="padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <span style="font-size:24px;">🔄</span>Деректерді<br>синхрондау
      </button>
      <button onclick="clearOfflineCache()" style="padding:14px;border:1px solid #fecaca;border-radius:14px;background:#fef2f2;color:#dc2626;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <span style="font-size:24px;">🗑</span>Кэшті<br>тазалау
      </button>
    </div>

    <!-- Cache info -->
    <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:14px;padding:14px;margin-bottom:14px;">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;">📦 Кэш мәліметтері</div>
      <div id="offlineCacheInfo" style="font-size:12px;color:#64748b;line-height:1.8;"></div>
    </div>

    <!-- Offline Queue -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px;">
      <div style="font-size:12px;font-weight:700;color:#d97706;margin-bottom:8px;">⏳ Синхрондау кезегі</div>
      <div id="offlineQueue" style="font-size:12px;color:#64748b;"></div>
    </div>

    <!-- Tips -->
    <div style="margin-top:14px;background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:14px;">
      <div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:8px;">💡 Кеңестер</div>
      <ul style="font-size:11px;color:#334155;line-height:1.8;padding-left:14px;margin:0;">
        <li>Сабақ алдында кэшті жаңалаңыз</li>
        <li>Блоктар автоматты localStorage-та сақталады</li>
        <li>Интернет қосылғанда деректер синхрондалады</li>
        <li>QR код жұмыс істеуі үшін бір желіде болыңыз</li>
      </ul>
    </div>
  `;

  wrap.appendChild(hdr);
  wrap.appendChild(body);
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  refreshOfflinePanel();
};

function refreshOfflinePanel() {
  const isOnline  = navigator.onLine;
  const connEl    = document.getElementById("offlineConnStatus");
  const cacheEl   = document.getElementById("offlineCacheInfo");
  const queueEl   = document.getElementById("offlineQueue");

  if (connEl) {
    connEl.style.background = isOnline ? "#f0fdf4" : "#fef3c7";
    connEl.style.border     = `1px solid ${isOnline ? "#86efac" : "#fde68a"}`;
    connEl.innerHTML = `
      <span style="font-size:32px;">${isOnline ? "🟢" : "🟡"}</span>
      <div>
        <div style="font-size:14px;font-weight:800;color:${isOnline?"#16a34a":"#d97706"};">
          ${isOnline ? "Онлайн" : "Офлайн режим"}
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">
          ${isOnline ? "Барлық мүмкіндіктер қолжетімді" : "Деректер жергілікті сақталуда"}
        </div>
      </div>`;
  }

  // Cache info
  if (cacheEl) {
    const saved    = localStorage.getItem("sb_offline_saved");
    const blocks   = JSON.parse(localStorage.getItem("sb_offline_blocks") || "[]");
    const swActive = !!window._swReg;
    cacheEl.innerHTML = `
      Service Worker: <b>${swActive?"✅ Белсенді":"❌ Жоқ"}</b><br>
      Соңғы сақтау: <b>${saved ? new Date(saved).toLocaleString("kk-KZ") : "--"}</b><br>
      Сақталған блоктар: <b>${blocks.length}</b><br>
      localStorage: <b>${Math.round(JSON.stringify(localStorage).length/1024)} KB</b>
    `;
  }

  // Queue
  if (queueEl) {
    const queue = JSON.parse(localStorage.getItem("sb_offline_queue") || "[]");
    queueEl.innerHTML = queue.length
      ? `${queue.length} дерек синхрондауды күтуде` +
        queue.slice(-3).map(q => `<div style="margin-top:3px;">• ${q.type} -- ${new Date(q.time).toLocaleTimeString("kk-KZ")}</div>`).join("")
      : "✅ Кезек бос";
  }
}

// ── Сабақты офлайн сақтау ───────────────────────────
window.saveOfflineNow = function() {
  const ok = saveOfflineBlocks();
  if (ok) {
    showOfflineToast("💾 Сабақ офлайн сақталды!", "ok");
    refreshOfflinePanel();
  }
};

// ── Офлайн сабақты жүктеу ───────────────────────────
window.loadOfflineNow = function() {
  const { blocks, pages, saved } = loadOfflineBlocks();
  if (!blocks.length && !pages) {
    showToast("Сақталған деректер жоқ. Алдымен сабақты сақтаңыз.", "info");
    return;
  }

  const when = saved ? new Date(saved).toLocaleString("kk-KZ") : "белгісіз";
  if (!confirm(`Офлайн сабақты жүктеу керек пе?\nСақталды: ${when}\nБлоктар: ${blocks.length}`)) return;

  const currBlocks = getCurrentBlocks?.();
  if (currBlocks) {
    currBlocks.length = 0;
    blocks.forEach(b => currBlocks.push(b));
    window.renderBoard?.();
  }

  showOfflineToast("📂 Офлайн сабақ жүктелді!", "ok");
  document.getElementById("offlineModal").style.display = "none";
};

// ── Кэшті тазалау ───────────────────────────────────
window.clearOfflineCache = function() {
  if (!confirm("Офлайн кэшті тазалайсыз ба?")) return;
  ["sb_offline_blocks","sb_offline_pages","sb_offline_saved","sb_offline_queue"].forEach(k =>
    localStorage.removeItem(k)
  );
  if (window._swReg) {
    caches.delete(OFFLINE_VERSION).then(() => {
      showOfflineToast("🗑 Кэш тазаланды", "warn");
      refreshOfflinePanel();
    });
  } else {
    showOfflineToast("🗑 Кэш тазаланды", "warn");
    refreshOfflinePanel();
  }
};

// ── Автосақтау (5 минут сайын) ───────────────────────
setInterval(() => {
  if (typeof getCurrentBlocks === "function") {
    const blocks = getCurrentBlocks();
    if (blocks.length > 0) {
      saveOfflineBlocks();
    }
  }
}, 5 * 60 * 1000);

// ── DOMContentLoaded іске қосу ──────────────────────
safeReady(() => {
  initOfflineMode();
});

// =====================================================
// ШАМ 40: PWA -- Mobile App
// Орнату + Push Notifications + App-like Experience
// =====================================================

// ── PWA Install ─────────────────────────────────────
// Банер өшірілді: ол "Офлайн жұмыс" дегенді жарнамалап тұрды,
// ал офлайн режим қазір сөндірілген. Браузердің меню/мекенжай
// жолағындағы өзіндік "орнату" белгішесі арқылы әлі де орнатуға
// болады, бізге тек төменгі банер керек емес.
let _pwaDeferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
});

window.addEventListener("appinstalled", () => {
  _pwaDeferredPrompt = null;
  hideInstallBanner();
  showOfflineToast("✅ SmartBoardAI PRO орнатылды!", "ok");
});

// ── Install Banner ───────────────────────────────────
function showInstallBanner() {
  if (document.getElementById("pwaBanner")) return;
  const banner = document.createElement("div");
  banner.id = "pwaBanner";
  banner.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;z-index:600;
    background:linear-gradient(135deg,#312e81,#4f46e5);
    padding:12px 20px;display:flex;align-items:center;gap:14px;
    box-shadow:0 -4px 20px rgba(15,23,42,0.2);
    animation:slide-up .4s ease;
    font-family:'Inter',system-ui,sans-serif;
  `;
  banner.innerHTML = `
    <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">⚡</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:14px;font-weight:800;color:white;">SmartBoardAI PRO орнатыңыз</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Жылдам кіру • Офлайн жұмыс • Хабарламалар</div>
    </div>
    <button onclick="installPWA()" style="
      background:white;color:#4f46e5;border:none;border-radius:10px;
      padding:9px 18px;font-size:13px;font-weight:800;cursor:pointer;
      flex-shrink:0;font-family:inherit;
    ">📲 Орнату</button>
    <button onclick="hideInstallBanner()" style="background:rgba(255,255,255,0.15);color:white;border:none;border-radius:8px;padding:9px 12px;font-size:12px;cursor:pointer;">✕</button>
  `;
  if (!document.getElementById("pwaBannerStyle")) {
    const s = document.createElement("style");
    s.id = "pwaBannerStyle";
    s.textContent = "@keyframes slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}";
    document.head.appendChild(s);
  }
  document.body.appendChild(banner);
}

function hideInstallBanner() {
  const b = document.getElementById("pwaBanner");
  if (b) b.remove();
  localStorage.setItem("sb_pwa_dismissed", "1");
}

window.installPWA = async function() {
  if (!_pwaDeferredPrompt) {
    openPWAGuide();
    return;
  }
  _pwaDeferredPrompt.prompt();
  const { outcome } = await _pwaDeferredPrompt.userChoice;
  if (outcome === "accepted") {
    showOfflineToast("✅ Орнатылуда...", "ok");
  }
  _pwaDeferredPrompt = null;
  hideInstallBanner();
};

// ── PWA Нұсқаулық (iOS үшін) ────────────────────────
function openPWAGuide() {
  if (document.getElementById("pwaGuideModal")) {
    document.getElementById("pwaGuideModal").style.display = "flex";
    return;
  }

  const isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari  = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  const modal = document.createElement("div");
  modal.id = "pwaGuideModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:500;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(480px,92vw);max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(15,23,42,0.22);";

  const steps = isIOS ? [
    { icon:"🌐", text:"Safari браузерін ашыңыз" },
    { icon:"⬆️", text:"Төменгі ортадағы «Бөлісу» батырмасын басыңыз" },
    { icon:"➕", text:"«Экранға қосу» (Add to Home Screen) таңдаңыз" },
    { icon:"✅", text:"«Қосу» батырмасын басыңыз" },
  ] : isAndroid ? [
    { icon:"🌐", text:"Chrome браузерін ашыңыз" },
    { icon:"⋮", text:"Жоғары оң жақтағы мәзірді ашыңыз" },
    { icon:"➕", text:"«Экранға қосу» таңдаңыз" },
    { icon:"✅", text:"«Орнату» батырмасын басыңыз" },
  ] : [
    { icon:"🖥️", text:"Chrome, Edge немесе Safari браузерін пайдаланыңыз" },
    { icon:"⬇️", text:"Мекенжай жолындағы орнату белгішесін іздеңіз" },
    { icon:"✅", text:"«Орнату» батырмасын басыңыз" },
  ];

  wrap.innerHTML = `
    <div style="background:linear-gradient(135deg,#312e81,#4f46e5);padding:20px 24px;border-radius:22px 22px 0 0;text-align:center;">
      <div style="font-size:52px;margin-bottom:10px;">📲</div>
      <div style="font-size:18px;font-weight:800;color:white;">SmartBoardAI PRO орнату</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">
        ${isIOS?"iPhone/iPad":"isAndroid"?"Android":"Компьютер"} нұсқаулығы
      </div>
    </div>
    <div style="padding:24px;">
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
        ${steps.map((s,i) => `
          <div style="display:flex;align-items:center;gap:14px;background:#f8f9ff;border-radius:14px;padding:12px 14px;">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:800;flex-shrink:0;">${i+1}</div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${s.icon}</span>
              <span style="font-size:13px;font-weight:600;color:#334155;">${s.text}</span>
            </div>
          </div>`).join("")}
      </div>

      <!-- Мүмкіндіктер -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:14px;margin-bottom:16px;">
        <div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:8px;">✅ Орнатылғаннан кейін</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${["⚡ Жылдам іске қосу","📡 Офлайн жұмыс","🔔 Push хабарламалар","🖥️ Full-screen режим","💾 Деректерді сақтау","🎨 Native UI"].map(f => `
            <div style="font-size:11px;color:#334155;display:flex;align-items:center;gap:5px;"><span style="color:#16a34a;">✓</span>${f}</div>`).join("")}
        </div>
      </div>

      <button onclick="document.getElementById('pwaGuideModal').style.display='none'" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;">Түсіндім!</button>
    </div>
  `;

  modal.appendChild(wrap);
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.body.appendChild(modal);
}

// ── PWA Panel (толық) ────────────────────────────────
window.openPWAPanel = function() {
  if (document.getElementById("pwaModal")) {
    document.getElementById("pwaModal").style.display = "flex";
    return;
  }

  const isPWA      = window.matchMedia("(display-mode: standalone)").matches;
  const isInstalled = isPWA || window.navigator.standalone;

  const modal = document.createElement("div");
  modal.id = "pwaModal";
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;border-radius:22px;width:min(680px,96vw);max-height:88vh;overflow-y:auto;box-shadow:0 24px 64px rgba(15,23,42,0.22);";

  wrap.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#312e81,#4f46e5,#7c3aed);padding:20px 24px;border-radius:22px 22px 0 0;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:17px;font-weight:800;color:white;">📲 Mobile App (PWA)</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Телефонға орнату • Push хабарламалар • App режимі</div>
      </div>
      <button onclick="document.getElementById('pwaModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
    </div>

    <div style="padding:20px 24px;">

      <!-- Status -->
      <div style="background:${isInstalled?"#f0fdf4":"#eef2ff"};border:2px solid ${isInstalled?"#86efac":"#c7d2fe"};border-radius:16px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:14px;">
        <span style="font-size:36px;">${isInstalled?"✅":"📲"}</span>
        <div>
          <div style="font-size:15px;font-weight:800;color:${isInstalled?"#16a34a":"#4f46e5"};">
            ${isInstalled?"Қолданба орнатылған!":"Қолданбаны орнатыңыз"}
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:3px;">
            ${isInstalled?"SmartBoardAI PRO App режимінде жұмыс жасап тұр":"Телефон экранына қосыңыз -- app сияқты ашылады"}
          </div>
        </div>
        ${!isInstalled ? `<button onclick="installPWA()" style="margin-left:auto;padding:10px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:13px;font-weight:800;cursor:pointer;flex-shrink:0;font-family:inherit;">📲 Орнату</button>` : ""}
      </div>

      <!-- Мүмкіндіктер -->
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">🚀 PWA мүмкіндіктері</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        ${[
          ["📱","Экранға қою","Үй экранынан бір touch-пен ашыңыз"],
          ["📡","Офлайн жұмыс","Интернетсіз сабақтарды пайдаланыңыз"],
          ["🔔","Push хабарлама","Оқушы жауаптарын хабарлайды"],
          ["🖥️","Full-screen","Браузер интерфейссіз толық экран"],
          ["⚡","Жылдам жүктелу","Service Worker кэші арқылы"],
          ["💾","Деректер сақтау","Локальды сақтау + синхрондау"],
        ].map(([ic,ti,de]) => `
          <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:12px;padding:12px;">
            <div style="font-size:22px;margin-bottom:6px;">${ic}</div>
            <div style="font-size:12px;font-weight:700;color:#0f172a;">${ti}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.4;">${de}</div>
          </div>`).join("")}
      </div>

      <!-- Push Notifications -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:700;color:#d97706;margin-bottom:10px;">🔔 Push хабарламалар</div>
        <div id="pwaNotifStatus" style="font-size:12px;color:#64748b;margin-bottom:10px;"></div>
        <button id="pwaNotifBtn" onclick="requestPushPermission()" style="
          padding:9px 18px;border:none;border-radius:9px;
          background:linear-gradient(135deg,#d97706,#f59e0b);
          color:white;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
        ">🔔 Хабарламаларға рұқсат беру</button>
      </div>

      <!-- App info -->
      <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:14px;padding:14px;margin-bottom:14px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">ℹ️ Қолданба туралы</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:#64748b;line-height:1.8;">
          <span>Атауы:</span><span><b>SmartBoardAI PRO</b></span>
          <span>Нұсқасы:</span><span><b>2.0.0</b></span>
          <span>Орнату түрі:</span><span><b>${isInstalled?"PWA App":"Браузер"}</b></span>
          <span>SW күйі:</span><span id="pwaSwStatus"><b>Тексерілуде...</b></span>
          <span>Кэш:</span><span id="pwaCacheSize"><b>...</b></span>
        </div>
      </div>

      <!-- Share App -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:14px;">
        <div style="font-size:12px;font-weight:700;color:#16a34a;margin-bottom:8px;">🔗 Бөлісу</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:8px;">Сілтемені достарыңызбен бөлісіңіз</div>
        <div style="display:flex;gap:6px;">
          <input id="pwaShareUrl" type="text" value="${location.origin}" readonly
            style="flex:1;padding:8px 10px;border:1px solid #e2e6f0;border-radius:8px;font-size:11px;background:#fff;"/>
          <button onclick="copyPWAUrl()" style="padding:8px 12px;border:none;border-radius:8px;background:#16a34a;color:white;font-size:11px;font-weight:700;cursor:pointer;">📋 Көшіру</button>
          <button onclick="sharePWAApp()" style="padding:8px 12px;border:none;border-radius:8px;background:#0369a1;color:white;font-size:11px;font-weight:700;cursor:pointer;">🔗 Бөлісу</button>
        </div>
      </div>
    </div>
  `;

  modal.appendChild(wrap);
  modal.addEventListener("click", e => { if (e.target === modal) modal.style.display = "none"; });
  document.body.appendChild(modal);

  // Status жаңарту
  updatePWAStatus();
};

function updatePWAStatus() {
  const swEl    = document.getElementById("pwaSwStatus");
  const cacheEl = document.getElementById("pwaCacheSize");
  const notifEl = document.getElementById("pwaNotifStatus");
  const notifBtn = document.getElementById("pwaNotifBtn");

  if (swEl) swEl.innerHTML = `<b>${window._swReg ? "✅ Белсенді" : "❌ Жоқ"}</b>`;

  // Cache өлшемі
  if (cacheEl && window._swReg) {
    caches.keys().then(keys => {
      let total = 0;
      Promise.all(keys.map(k => caches.open(k).then(c => c.keys().then(ks => total += ks.length))))
        .then(() => { if (cacheEl) cacheEl.innerHTML = `<b>${total} файл</b>`; });
    });
  }

  // Notification status
  const perm = Notification.permission;
  if (notifEl) {
    notifEl.textContent =
      perm === "granted"  ? "✅ Хабарламалар рұқсат етілген" :
      perm === "denied"   ? "❌ Хабарламалар тыйым салынған -- браузер баптауларынан өзгертіңіз" :
      "⬜ Хабарламаларға рұқсат берілмеген";
    notifEl.style.color =
      perm === "granted" ? "#16a34a" : perm === "denied" ? "#dc2626" : "#64748b";
  }
  if (notifBtn) {
    notifBtn.style.display = perm === "denied" ? "none" : "inline-block";
    if (perm === "granted") {
      notifBtn.textContent = "✅ Хабарламалар қосылған";
      notifBtn.style.background = "linear-gradient(135deg,#16a34a,#22c55e)";
      notifBtn.disabled = true;
    }
  }
}

// ── Push Permission ──────────────────────────────────
window.requestPushPermission = async function() {
  try {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      showOfflineToast("🔔 Push хабарламалар қосылды!", "ok");
      // Test notification
      setTimeout(() => {
        new Notification("SmartBoardAI PRO", {
          body: "🎉 Хабарламалар сәтті қосылды!",
          icon: "/icon-192.png",
        });
      }, 500);
    }
    updatePWAStatus();
  } catch(e) {
    console.error("Push permission:", e);
  }
};

// Оқушы жауап бергенде notification
window.notifyNewAnswer = function(studentName, answer) {
  if (Notification.permission !== "granted") return;
  new Notification("SmartBoardAI PRO -- Жаңа жауап", {
    body: `${studentName}: "${answer}"`,
    icon: "/icon-192.png",
    tag: "new-answer",
    renotify: true,
  });
};

// ── Share / Copy ──────────────────────────────────────
window.copyPWAUrl = function() {
  navigator.clipboard.writeText(location.origin).then(() => {
    showOfflineToast("📋 Сілтеме көшірілді!", "ok");
  });
};

window.sharePWAApp = function() {
  if (navigator.share) {
    navigator.share({
      title: "SmartBoardAI PRO",
      text: "🚀 Мұғалімге арналған AI интерактив тақта -- тегін қолданып көріңіз!",
      url: location.origin,
    });
  } else {
    copyPWAUrl();
  }
};

// ── PWA init ────────────────────────────────────────
safeReady(() => {
  // Install banner ӨШІРІЛДІ — әдейі ештеңе көрсетпейміз.
  // (_pwaDeferredPrompt әрқашан null болады, сонда да escape-hatch
  // ретінде шартты сақтап тұрмыз — болашақта қажет болса бір
  // жолды қайтару жеткілікті.)

  // Existing answer listener-ге notification hook
  const _origUpdateRight = window.updateAnalyticsUI;
  if (typeof _origUpdateRight === "function") {
    window.updateAnalyticsUI = function() {
      _origUpdateRight();
      // Жаңа жауап notification
      const answers = Object.values(analyticsData?.answers || {});
      if (answers.length > (window._lastAnswerCount || 0)) {
        const last = answers[answers.length - 1];
        if (last && window._lastAnswerCount !== undefined) {
          notifyNewAnswer(last.name || "Оқушы", (last.text || "").slice(0, 50));
        }
        window._lastAnswerCount = answers.length;
      }
    };
  }
});
