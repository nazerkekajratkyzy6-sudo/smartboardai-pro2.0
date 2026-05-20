// teacher.js — SmartBoardAI PRO (Phase 1 + Trainers Panel, NO i18n.js сыртқы файл)

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
  push,
  onValue,
  auth,
  onAuthStateChanged,
  signOut
} from "./firebaseConfig.js";

// ── safeReady: DOMContentLoaded немесе дереу ──────────
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
// TEACHER CABINET — STATE API
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
    "anagram–build_the_word",
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
    "6-synyp–Proporciya",
    "7-synyp–Birmusheler",
    "7-synyp–Kopmusheler",
    "8-synyp–Tendeuler trenazheri",
    "8-synyp–Viet_teoremasy",
    "9-synyp–Trigonomeriya",
    "10-synyp–Trigonomeriyalyq_tendeuler",
    "11-synyp–Korsetkistik_tendeuler",
    "Absoliutti_jiilik_7",
    "Algebra_trenazhery(7–11)",
    "Arif_prog",
    "Bir_ainymaly_tensizdikter_6",
    "Bolshek_5_synyp",
    "Dareze_7",
    "Formula_5_synyp",
    "funkciyalar_grafigi–7-synyp",
    "Geom_progressiya",
    "Geometriya_trenazhery(7–11)",
    "Grafiktiq_tasilme_tendeuler_zhuiesin_sheshu_7",
    "Grafiktiq_tasilmen_sheshu_7",
    "Jiilik_kestesi_jane_jiilik_alqaby",
    "Koleso_toptyq_zarys",
    "Kombinatorika_9",
    "Koordinata_zhaiyqtyq",
    "Kvadrat_tendeu_8",
    "Matematika_trenazhery(5–6synyp)",
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
    trainersTitle: "🕹 Тренажерлер",
    catGenerators: "Генераторлар",
    catMath: "Математика",
    catReflection: "Рефлексия",
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
    trainersTitle: "🕹 Тренажёры",
    catGenerators: "Генераторы",
    catMath: "Математика",
    catReflection: "Рефлексия",
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
      // Қарапайым мәтін – escape
      contentHtml = `<div class="board-text">${safe(b.content)}</div>`;
    } else if (b.type === "rich") {
  contentHtml = `
    <div class="board-text math-rich">
      ${b.content}
    </div>
  `;
}    else if (b.type === "ai") {
      contentHtml = `<div class="board-text">${safe(b.content)}</div>`;
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
      contentHtml = `<iframe src="${b.content}" class="board-video" allowfullscreen></iframe>`;
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
      alert("Алдымен бөлме ашыңыз");
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



// window-ға шығару — HTML onclick үшін
window.addBlock = addBlock;

// Тренажерді тікелей ашу (sidebar батырмалары)
window.openTrainerDirect = function(category, id) {
  // Relative URL — GitHub Pages-та да, localhost-та да жұмыс істейді
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
  openModal(
    "Формула (LaTeX)",
    "\\frac{a}{b}",
    (val) => {
      if (!val) return;
      addBlock("formula", val);
    }
  );
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

  // Егер бұрын жасалған болса — қайталап жасамау
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
// AI MODULE — Панель + тақтаға блок
// =====================================================
// =====================================================
// AI CENTER — generateAI v2.0
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
    .replace(/

/g, "<br><br>")
    .replace(/
/g, "<br>");

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
localStorage.setItem("teacherRoomId", currentRoom);

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

  // URL сілтемесін hint-ке қосу
  const hint = $("roomHint");
  if (hint) {
    hint.innerHTML = `Оқушылар <b>QR арқылы</b> қосылады — <a href="${url}" target="_blank"
      style="color:#818cf8;font-size:10px;word-break:break-all;">${url}</a>`;
  }

  const doQR = () => {
    if (typeof QRCode !== "undefined") {
      try {
        new QRCode(qrDiv, { text: url, width: 150, height: 150 });
        setTimeout(() => {
          const img = qrDiv.querySelector("img");
          const cvs = qrDiv.querySelector("canvas");
          if (img) { img.style.width = "150px"; img.style.height = "150px"; img.style.display = "block"; }
          if (cvs) { cvs.style.width = "150px"; cvs.style.height = "150px"; cvs.style.display = "block"; }
        }, 300);
        return;
      } catch (e) { /* fallback */ }
    }
    // Fallback: Google QR API
    qrDiv.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}"
      width="150" height="150" style="border-radius:6px;display:block;" alt="QR код"/>`;
  };

  if (typeof QRCode !== "undefined") {
    doQR();
  } else {
    // QRCode.js жүктелгенше күту (макс 3 сек)
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

      return `
        <div class="answer-item">
          <b>${avatar} ${name}</b><br>
          ${text}

          <div style="margin-top:6px; display:flex; gap:6px;">
            <button type="button" data-answer-name="${name}" data-answer-reaction="✅">✅</button>
            <button type="button" data-answer-name="${name}" data-answer-reaction="⭐">⭐</button>
          </div>
        </div>
      `;
    })
    .join("");

  box.querySelectorAll("[data-answer-reaction]").forEach((btn) => {
    btn.onclick = () => {
      const name = btn.dataset.answerName || "Оқушы";
      const reaction = btn.dataset.answerReaction || "✅";
      sendAnswerReaction(name, reaction);
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
console.log("👂 Teacher listening photos in room:", currentRoom);
const photosRef = ref(db, `rooms/${currentRoom}/studentPhotos`);
onValue(photosRef, (snap) => {
  console.log("📸 PHOTO STREAM TRIGGERED");

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

        return `
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            background:#fff;
            border-radius:10px;
            padding:8px;
            margin-bottom:8px;
            border:1px solid #e5e7eb;
          ">
            <span>${avatar} ${name}</span>

            <div style="display:flex; gap:6px;">
              <button type="button" data-open="${url}">👁</button>
              <button type="button" data-download="${url}">⬇</button>
              <button type="button" data-react="⭐" data-key="${photoKey}" data-name="${name}">⭐</button>
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
    window.sendFeedback(btn.dataset.key, btn.dataset.name, "⭐");
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

  // Тренажер iframe бар болса — оны fullscreen ашамыз
  const iframe = card.querySelector(".trainer-frame, .geogebra-frame, .board-video");
  const target = iframe || card;

  // Background ақ болу үшін
  target.style.background = "#fff";

  if (target.requestFullscreen) target.requestFullscreen();
  else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
  else if (target.msRequestFullscreen) target.msRequestFullscreen();
}

function sendAnswerReaction(name, reaction) {
  if (!currentRoom) return;

  const fbRef = ref(db, `rooms/${currentRoom}/answerFeedback`);

  push(fbRef, {
    name,
    reaction,
    time: Date.now()
  });
}

window.sendAnswerReaction = sendAnswerReaction;
    
  
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

  const savedRoom = localStorage.getItem("teacherRoomId");
if (savedRoom) {
  currentRoom = savedRoom;

  const roomIdEl = $("roomId");
  if (roomIdEl) roomIdEl.textContent = currentRoom;

  console.log("🔁 Қалпына келтірілген бөлме:", currentRoom);
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
  // 🔐 AUTH CHECK (ТЕК СЕНДІКІ)
  // ================================
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Егер кірмеген → login.html-ге қайтарады
      location.href = "login.html";
      return;
    }

    if (user.email !== "naz-erke_k@mail.ru") {
      alert("Бұл панельге рұқсатыңыз жоқ!");
      location.href = "login.html";
      return;
    }

    console.log("Мұғалім авторизациядан өтті:", user.email);

    // енді ғана logout жұмыс істейді
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
  editor.style.display = "block";
  content.innerHTML = "";
  content.focus();
};

// Батырмалардан келген команда (B, I, U, т.б.)
window.execTextCmd = function (cmd, value = null) {
  document.execCommand(cmd, false, value);
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


function sendFeedback(photoKey, studentName, reaction) {
  if (!currentRoom) return;

  const fbRef = ref(db, `rooms/${currentRoom}/feedback/${photoKey}`);

  set(fbRef, {
    name: studentName,
    reaction,
    time: Date.now()
  })
    .then(() => {
      alert(`${studentName} үшін реакция жіберілді: ${reaction}`);
    })
    .catch((err) => {
      console.error("Фото реакция қатесі:", err);
      alert("Фотоға реакция жіберілмеді");
    });
}

window.sendFeedback = sendFeedback;

// =====================================================
// 📊 ANALYTICS MODULE — SmartBoardAI PRO
// =====================================================

// Аналитика деректері (memory)
const analyticsData = {
  students: {},   // {name, avatar, time}
  answers:  {},   // {name, text, time}
  photos:   {},   // {name, url, time}
  emotions: {},   // {emoji: count}
};

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
              ${s.name || "—"}
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
    alert("Аналитика деректері жоқ. Алдымен бөлме ашыңыз.");
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
      : "—";
    rows.push([
      s.name || "—",
      s.avatar || "🙂",
      joinTime,
      ans ? "Иә" : "Жоқ",
      ans ? (ans.text || "").replace(/,/g, ";") : "—",
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
// DOMContentLoaded кейін wrap — сол кезде window.createRoom нақты бар
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
  const savedRoom = localStorage.getItem("teacherRoomId");
  if (savedRoom) setTimeout(() => startAnalytics(savedRoom), 1200);
});

// =====================================================
// 🎮 AI INTERACTIVE GENERATOR — SmartBoardAI PRO
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

// Escape пернесі — модалды жабу
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAIGenerator();
});

// =====================================================
// 🔒 PRO SYSTEM — SmartBoardAI PRO
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
let currentPlan = "pro";   // Барлық мүмкіндіктер ашық
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
  return true; // Барлық мүмкіндіктер ашық
};

// ── UI-ге план қолдану ────────────────────────────────
function applyPlanUI() {
  // PRO badge topbar-да
  updatePlanBadge();

  if (currentPlan === "pro") {
    // PRO: бәрі ашық — lock иконкаларды жасыру
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
            ["🤖", "AI Center — 8 педагогикалық режим"],
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

// PRO wrappers — барлығы ашық (lock жоқ)

// generateAI — барлық режимдер ашық (PRO check жоқ)

// selectAIMode — PRO белгісі (DOMContentLoaded-та)
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
  // onAuthStateChanged бар болса — plan detect
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
  const stored = localStorage.getItem("hubResource");
  if (stored) {
    try {
      const res = JSON.parse(stored);
      // 10 секунд ішінде болса — қосу
      if (Date.now() - res.time < 10000) {
        setTimeout(() => {
          addBlock("trainer", res.url);
          if (window.showStudentStatus) {
            window.showStudentStatus(`✅ "${res.title}" тақтаға қосылды!`, "ok");
          }
        }, 1500);
      }
      localStorage.removeItem("hubResource");
    } catch(e) { localStorage.removeItem("hubResource"); }
  }
});

// =====================================================
// ✏️ DRAW MODE — SmartBoardAI PRO (Gynzy стилі)
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
    // Пішін — snapshot сақтаймыз
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
    // Пішін — preview үшін snapshot-тан қалпына келтір
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
// 🔦📝🙈 FLOATING TOOLS — SmartBoardAI PRO
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

  // Позиция — экранның ортасына жақын, бірақ кездейсоқ
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
function makeDraggable(el) {
  const handle = el.querySelector(".sticky-header");
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
// 📋 BOARD BACKGROUND — SmartBoardAI PRO
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
// 🧰 MINI TOOLS — SmartBoardAI PRO
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

  // Бұрын бар болса — тек focus
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
          ">−</button>
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
             onmouseout="this.style.background='#fef2f2'">−</button>

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
// 📐 MATH TOOLS — SmartBoardAI PRO
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
            ["C","#fef2f2","#dc2626"],["±","#f0fdf4","#16a34a"],["%","#f0fdf4","#16a34a"],["÷","#eef2ff","#4f46e5"],
            ["7","#f9fafb","#111827"],["8","#f9fafb","#111827"],["9","#f9fafb","#111827"],["×","#eef2ff","#4f46e5"],
            ["4","#f9fafb","#111827"],["5","#f9fafb","#111827"],["6","#f9fafb","#111827"],["−","#eef2ff","#4f46e5"],
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
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-");
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
  if (window._calcNew && ["+","−","×","÷"].includes(key)) {
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

  // Canvas — блок бар
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
          ">−</button>
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
          margin-bottom:10px;
        ">📡 Дауыс беруді бастау</button>

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
        ">✅ Дұрыс жауапты көрсету</button>
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
// openSpinWheel alias
window.openSpinWheel = function() {
  if (typeof openSpinWheelWidget === 'function') openSpinWheelWidget();
  else {
    // Spin Wheel виджетін ашу
    const existWrap = document.getElementById('spinWheelContainer');
    if (!existWrap) {
      // Create minimal spinner
      const el = document.createElement('div');
      el.id = 'spinWheelContainer';
      el.style.cssText = 'position:fixed;top:80px;right:20px;z-index:500;background:white;border-radius:18px;box-shadow:0 10px 36px rgba(15,23,42,0.18);padding:20px;width:300px;';
      el.innerHTML = '<button onclick="document.getElementById(\"spinWheelContainer\").remove()" style="float:right;border:none;background:#fef2f2;color:#dc2626;border-radius:6px;padding:3px 8px;cursor:pointer;">✕</button><h3 style="margin:0 0 12px;">🎡 Spin the Wheel</h3><canvas id="swCanvas" width="260" height="260" style="border-radius:50%;cursor:pointer;" onclick="doSpinWheel()"></canvas><div id="swResult" style="text-align:center;font-weight:800;font-size:18px;color:#7c3aed;min-height:28px;margin-top:10px;"></div><button onclick="doSpinWheel()" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:white;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px;">🎡 Айналдыру!</button><details style="margin-top:8px;"><summary style="cursor:pointer;font-size:11px;color:#6b7280;">✏️ Тізім</summary><textarea id="swItems" style="width:100%;height:70px;margin-top:6px;padding:8px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;resize:none;font-family:inherit;" oninput="drawSpinWheel()">Оқушы 1
Оқушы 2
Оқушы 3
Оқушы 4
Оқушы 5</textarea></details>';
      document.body.appendChild(el);
      window._swAngle = 0; window._swSpinning = false;
      drawSpinWheel();
    }
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
