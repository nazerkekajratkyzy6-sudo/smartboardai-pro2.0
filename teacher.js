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
  onValue,
  auth,
  onAuthStateChanged,
  signOut
} from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let currentLang = "kk";
let editingBlockId = null;

// Multi-page state
let pages = [{ id: "page_1", blocks: [] }];
let currentPageIndex = 0;

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
      // Rich-text → HTML толық рендерленеді
      contentHtml = `<div class="board-text">${b.content}</div>`;
    } else if (b.type === "ai") {
      contentHtml = `<div class="board-text">${safe(b.content)}</div>`;
    } else if (b.type === "formula") {
  contentHtml = `
    <div class="math-block">
      \\(${b.content}\\)
    </div>
  `;
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
});
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
      const url = `/trainers/${category}/${id}/index.html`;
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

// =====================================================
// LIVEROOM + QR + Firebase streams
// =====================================================
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
// =========================
// FULLSCREEN BLOCK
// =========================

function openFullscreenBlock(id) {
    const el = document.getElementById("blk_" + id);
    if (!el) return;

    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

document.addEventListener("fullscreenchange", () => {
    // Қаласақ, fullscreen-нен шыққанда стилдерді түзетуге болады
});


// =====================================================
// INIT
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  setupLanguage();
  setupModalEvents();
  renderPages();
  renderBoard();

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





