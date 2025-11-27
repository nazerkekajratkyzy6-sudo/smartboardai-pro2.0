// SmartBoardAI PRO 3.0 – Teacher Board Logic (Phase 1 – UI + Local State)
// Автор: Nazerke Kairatkyzy ❤️

// Қысқа селектор
const $ = (id) => document.getElementById(id);

/* =========================
   BOARD STATE
========================= */

let pages = [];      // [{id, title, blocks: [...] }]
let currentPageId = null;

// Block мысалы:
// { id, type: 'text'|'ai'|'formula'|'image'|'video'|'link'|'trainer'|'quiz'|'drawing', content }

/* =========================
   INIT
========================= */

window.addEventListener("DOMContentLoaded", () => {
  initBoardState();
  initTopbar();
  initTools();
  initRightbarTabs();
  initAIDrawer();
  initModals();
  initSaveLoad();
});

/* =========================
   INITIAL PAGE
========================= */

function initBoardState() {
  // Бірінші бетті қосамыз
  const firstPage = createPage("Бет 1");
  currentPageId = firstPage.id;
  renderTabs();
  renderCurrentPage();
}

/* =========================
   PAGES
========================= */

function createPage(title) {
  const page = {
    id: "page-" + Math.random().toString(36).substring(2, 9),
    title: title || `Бет ${pages.length + 1}`,
    blocks: []
  };
  pages.push(page);
  return page;
}

function getCurrentPage() {
  return pages.find((p) => p.id === currentPageId);
}

function setCurrentPage(pageId) {
  currentPageId = pageId;
  renderTabs();
  renderCurrentPage();
}

function renderTabs() {
  const tabsContainer = $("pageTabs");
  tabsContainer.innerHTML = "";

  pages.forEach((p, index) => {
    const btn = document.createElement("button");
    btn.className = "page-tab" + (p.id === currentPageId ? " active" : "");
    btn.textContent = p.title || `Бет ${index + 1}`;
    btn.dataset.page = p.id;
    btn.onclick = () => {
      setCurrentPage(p.id);
    };
    tabsContainer.appendChild(btn);
  });

  const current = getCurrentPage();
  if (current) {
    $("currentPageTitle").textContent = current.title;
  }
}

/* =========================
   BLOCKS
========================= */

function addBlockToCurrentPage(type, content) {
  const page = getCurrentPage();
  if (!page) return;

  const block = {
    id: "block-" + Math.random().toString(36).substring(2, 9),
    type,
    content: content || ""
  };
  page.blocks.push(block);
  renderCurrentPage();
}

function deleteBlock(pageId, blockId) {
  const page = pages.find((p) => p.id === pageId);
  if (!page) return;
  page.blocks = page.blocks.filter((b) => b.id !== blockId);
  renderCurrentPage();
}

function renderCurrentPage() {
  const boardArea = $("boardArea");
  const emptyState = $("boardEmptyState");

  const page = getCurrentPage();
  if (!page) return;

  // Егер блок жоқ болса – бос күй
  if (!page.blocks.length) {
    boardArea.innerHTML = "";
    if (emptyState) {
      boardArea.appendChild(emptyState);
      emptyState.style.display = "block";
    }
    return;
  }

  // Блоктар бар болса – рендер
  boardArea.innerHTML = "";
  if (emptyState) emptyState.style.display = "none";

  page.blocks.forEach((block) => {
    const card = document.createElement("div");
    card.className = "board-card";

    let label = "Блок";
    if (block.type === "text") label = "Мәтін";
    if (block.type === "ai") label = "AI блок";
    if (block.type === "formula") label = "Формула";
    if (block.type === "image") label = "Фото";
    if (block.type === "video") label = "Видео";
    if (block.type === "link") label = "Сілтеме";
    if (block.type === "trainer") label = "Тренажер";
    if (block.type === "quiz") label = "Quiz";
    if (block.type === "drawing") label = "Сурет салу";

    // Контентті HTML ретінде көрсету
    let bodyHTML = block.content || "";

    card.innerHTML = `
      <div class="board-card-header">
        <span class="block-label">${label}</span>
        <button class="icon-btn small" data-del="${block.id}">✕</button>
      </div>
      <div class="board-card-body">
        ${bodyHTML}
      </div>
    `;

    const delBtn = card.querySelector("[data-del]");
    delBtn.onclick = () => deleteBlock(page.id, block.id);

    boardArea.appendChild(card);
  });

  // KaTeX формуланы қайта өңдеу
  if (window.renderMathInElement) {
    window.renderMathInElement(boardArea, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false }
      ]
    });
  }
}

/* =========================
   TOPBAR EVENTS
========================= */

function initTopbar() {
  // Жаңа бет
  $("newPageBtn").onclick = () => {
    const page = createPage();
    setCurrentPage(page.id);
  };

  // Fullscreen (қарапайым toggle, CSS full-screen класс кейін керек болса қосамыз)
  const fsBtn = $("fullscreenToggleBtn");
  if (fsBtn) {
    fsBtn.onclick = () => {
      document.body.classList.toggle("fullscreen");
    };
  }

  // Room ID – әзірге жергілікті генерация (Firebase-ті кейін қосамыз)
  $("createRoomBtn").onclick = () => {
    const roomId = generateRoomId();
    $("roomIdLabel").textContent = roomId;
    const el2 = $("roomIdLabel2");
    if (el2) el2.textContent = roomId;
    alert("Жаңа Room ID жасалды: " + roomId);
    // Кейін мұнда Firebase room жасаймыз
  };

  $("showQrBtn").onclick = () => {
    openQrModal();
  };
}

function generateRoomId() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += i < 3
      ? letters[Math.floor(Math.random() * letters.length)]
      : numbers[Math.floor(Math.random() * numbers.length)];
  }
  return id;
}

/* =========================
   TOOLS (сол жақ панель)
========================= */

function initTools() {
  // Мәтін блогы
  $("toolText").onclick = () => {
    const txt = prompt("Мәтінді енгізіңіз:", "Мысалы: Жаңа тақырыптың кіріспе мәтіні...");
    if (!txt) return;
    const html = `<p>${escapeHtml(txt).replace(/\n/g, "<br>")}</p>`;
    addBlockToCurrentPage("text", html);
  };

  // AI блогын кейін нақты AI-мен байланыстырмыз, әзірге бос шаблон
  $("toolAIBlock").onclick = () => {
    const html = `<p><i>AI блогы (әзірге UX шаблон). AI панелінен мәтін қосуға болады.</i></p>`;
    addBlockToCurrentPage("ai", html);
  };

  // Формула
  $("toolFormula").onclick = () => {
    const formula = prompt("Формуланы KaTeX форматында жазыңыз", "E = mc^2");
    if (!formula) return;
    const html = `<p>$$${formula}$$</p>`;
    addBlockToCurrentPage("formula", html);
  };

  // Фото
  $("toolImage").onclick = () => {
    const url = prompt("Сурет сілтемесін енгізіңіз (URL):", "https://");
    if (!url || !url.startsWith("http")) return;
    const html = `<img src="${url}" alt="Фотосурет" style="max-width:100%; border-radius:8px;">`;
    addBlockToCurrentPage("image", html);
  };

  // Видео (YouTube iframe)
  $("toolVideo").onclick = () => {
    const url = prompt("YouTube сілтемесін енгізіңіз:", "https://www.youtube.com/watch?v=...");
    if (!url || !url.includes("youtube.com")) return;
    const embed = url.replace("watch?v=", "embed/");
    const html = `
      <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;">
        <iframe src="${embed}" frameborder="0" allowfullscreen
          style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px;">
        </iframe>
      </div>`;
    addBlockToCurrentPage("video", html);
  };

  // Сілтеме
  $("toolLink").onclick = () => {
    const url = prompt("Сілтемені енгізіңіз:", "https://");
    if (!url || !url.startsWith("http")) return;
    const text = prompt("Сілтеменің атауы:", "Ресурсқа өту");
    const html = `<a href="${url}" target="_blank" style="color:#2563eb;">🔗 ${escapeHtml(text || url)}</a>`;
    addBlockToCurrentPage("link", html);
  };

  // Тренажер (iframe)
  $("toolTrainer").onclick = () => {
    const url = prompt("HTML тренажер URL (https://...):", "https://");
    if (!url || !url.startsWith("http")) return;
    const html = `
      <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <iframe src="${url}" style="width:100%;height:320px;border:none;"></iframe>
      </div>`;
    addBlockToCurrentPage("trainer", html);
  };

  // Quiz – жай placeholder
  $("toolQuiz").onclick = () => {
    const question = prompt("Сұрақ мәтіні:", "Мысалы: Функция деген не?");
    if (!question) return;
    const html = `
      <div>
        <p><b>❓ Сұрақ:</b> ${escapeHtml(question)}</p>
        <p class="small muted">Бұл quiz интерфейсі кейін толықтырылады.</p>
      </div>`;
    addBlockToCurrentPage("quiz", html);
  };

  // Drawing – placeholder
  $("toolDrawing").onclick = () => {
    const html = `
      <div style="border-radius:12px;border:1px dashed #cbd5e1;padding:16px;text-align:center;">
        ✏ Сурет салу аймағы (drawing canvas кейін қосылады).
      </div>`;
    addBlockToCurrentPage("drawing", html);
  };

  // Clear board – тек ағымдағы беттегі блоктарды тазалайды
  $("clearBoardBtn").onclick = () => {
    const page = getCurrentPage();
    if (!page) return;
    if (!confirm("Осы беттегі барлық блокты өшіреміз бе?")) return;
    page.blocks = [];
    renderCurrentPage();
  };
}

/* =========================
   RIGHTBAR TABS
========================= */

function initRightbarTabs() {
  const tabs = document.querySelectorAll(".right-tab");
  const panels = document.querySelectorAll(".right-panel");

  tabs.forEach((tab) => {
    tab.onclick = () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      panels.forEach((p) => {
        if (p.id === "panel-" + target) {
          p.classList.add("active");
        } else {
          p.classList.remove("active");
        }
      });
    };
  });
}

/* =========================
   AI DRAWER (пока фейк жауап)
========================= */

function initAIDrawer() {
  const drawer = $("aiDrawer");
  const backdrop = $("backdrop");
  const openBtn = $("openAIButton");
  const closeBtn = $("aiCloseBtn");
  const modeButtons = document.querySelectorAll(".ai-mode-btn");
  const generateBtn = $("aiGenerateBtn");
  const output = $("aiOutput");
  const promptArea = $("aiPrompt");
  const addToBoardBtn = $("aiAddToBoardBtn");

  if (!drawer) return;

  function openDrawer() {
    drawer.classList.add("open");
    backdrop.classList.remove("hidden");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    backdrop.classList.add("hidden");
  }

  openBtn.onclick = openDrawer;
  closeBtn.onclick = closeDrawer;
  backdrop.onclick = () => {
    // Егер басқа модалдар ашылмаған болса ғана жабамыз
    if (!document.querySelector(".modal:not(.hidden)")) {
      closeDrawer();
    }
  };

  // Mode button-дар
  modeButtons.forEach((btn) => {
    btn.onclick = () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });

  // Генерация (әзірге фейк жауап – кейін OpenAI/ai.js-пен қосамыз)
  generateBtn.onclick = () => {
    const text = promptArea.value.trim();
    if (!text) {
      alert("Алдымен тапсырма/тақырыпты жазыңыз.");
      return;
    }

    // Қарапайым “имитация”
    const mode = document.querySelector(".ai-mode-btn.active")?.dataset.mode || "lesson";

    let fake;
    if (mode === "lesson") {
      fake = `
        <b>Сабақ жоспары (демо):</b><br>
        1) Қызығушылықты ояту<br>
        2) Жаңа тақырыпты түсіндіру<br>
        3) Тапсырма орындау<br>
        4) Рефлексия<br>
      `;
    } else if (mode === "content") {
      fake = `
        <b>Түсіндіру (демо):</b><br>
        ${escapeHtml(text)} тақырыбы бойынша негізгі ұғымдар мен мысалдар осында болады.
      `;
    } else {
      fake = `
        <b>Шығармашылық тапсырма (демо):</b><br>
        Оқушылардан ${escapeHtml(text)} тақырыбына шағын жоба немесе комикс дайындауды сұраңыз.
      `;
    }

    output.innerHTML = `<div>${fake}</div>
      <p class="small muted" style="margin-top:8px;">
        Бұл әзірге демонстрациялық жауап. Кейін OpenAI API арқылы нақты AI-ға қосамыз.
      </p>`;
  };

  // AI-дан тақтаға блок ретінде қосу
  addToBoardBtn.onclick = () => {
    const html = output.innerHTML.trim();
    if (!html) {
      alert("Алдымен AI-дан жауап алыңыз.");
      return;
    }
    addBlockToCurrentPage("ai", html);
    alert("AI жауабы тақтаға блок ретінде қосылды.");
  };
}

/* =========================
   MODALS: QR + PIN
========================= */

function initModals() {
  const backdrop = $("backdrop");

  const qrModal = $("qrModal");
  const qrCloseBtn = $("qrCloseBtn");
  const showQrBtn = $("showQrBtn");

  const pinModal = $("pinModal");
  const pinSaveBtn = $("pinSaveBtn");

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
    backdrop.classList.remove("hidden");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
    // Егер AI drawer де жабық болса ғана backdrop жабамыз
    const aiDrawer = $("aiDrawer");
    if (!aiDrawer.classList.contains("open")) {
      backdrop.classList.add("hidden");
    }
  }

  // QR
  if (showQrBtn && qrModal) {
    showQrBtn.onclick = () => {
      const roomId = $("roomIdLabel").textContent || "–";
      const qrBox = $("qrContainer");
      if (qrBox) {
        if (roomId === "–") {
          qrBox.innerHTML = `<p class="small muted">Алдымен Room жасаңыз.</p>`;
        } else {
          // Қарапайым текст – кейін нақты QR кітапханамен ауыстырамыз
          qrBox.innerHTML = `
            <p class="small">QR орны (кейін нақты QR-кодпен ауыстырамыз).</p>
            <p><b>Room ID:</b> ${roomId}</p>
          `;
        }
      }
      openModal(qrModal);
    };
  }

  if (qrCloseBtn && qrModal) {
    qrCloseBtn.onclick = () => closeModal(qrModal);
  }

  // PIN
  if (pinModal && pinSaveBtn) {
    pinSaveBtn.onclick = () => {
      const pinInput = $("teacherPinInput");
      const val = pinInput.value.trim();
      if (!/^\d{4,6}$/.test(val)) {
        alert("PIN 4–6 цифр болуы керек.");
        return;
      }
      localStorage.setItem("smartboard_teacher_pin", val);
      alert("PIN сақталды. Бұл тек осы құрылғыда қолданылады (демо режим).");
      closeModal(pinModal);
    };
  }
}

/* =========================
   SAVE / LOAD (LOCAL)
========================= */

function initSaveLoad() {
  const saveBtn = $("saveLessonBtn");
  const loadBtn = $("loadLessonBtn");

  if (saveBtn) {
    saveBtn.onclick = () => {
      const data = {
        pages,
        currentPageId
      };
      const json = JSON.stringify(data);
      // Қарапайым download
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "smartboard-lesson.json";
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  if (loadBtn) {
    loadBtn.onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (data.pages && Array.isArray(data.pages)) {
              pages = data.pages;
              currentPageId = data.currentPageId || (pages[0] && pages[0].id);
              renderTabs();
              renderCurrentPage();
              alert("Сабақ сәтті жүктелді.");
            } else {
              alert("Жарамсыз файл.");
            }
          } catch (err) {
            alert("Файлды оқу кезінде қате болды.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
  }
}

/* =========================
   HELPERS
========================= */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
