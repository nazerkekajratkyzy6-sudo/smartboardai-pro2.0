// SmartBoardAI PRO 3.0 — TeacherBoard.js
// PIN + Admin email + i18n + QR + Multi-Page + AI + Firebase

console.log("TeacherBoard.js loaded ✔");

import {
  auth,
  db,
  ref,
  set,
  push,
  onValue,
  onAuthStateChanged,
  signOut
} from "./firebaseConfig.js";

/* ============================================================
   0. PIN SECURITY (7142)
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const PIN = "7142"; // статикалық PIN
  const overlay = document.getElementById("pinOverlay");
  const input = document.getElementById("pinInput");
  const btn = document.getElementById("pinSubmit");
  const errorBox = document.getElementById("pinError");

  if (!overlay || !input || !btn) return;

  const passed = localStorage.getItem("sbai_pin_ok");
  if (passed === "true") {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "flex";

  function checkPin() {
    const val = input.value.trim();
    if (val === PIN) {
      localStorage.setItem("sbai_pin_ok", "true");
      overlay.style.display = "none";
    } else {
      if (errorBox) errorBox.textContent = "❌ PIN дұрыс емес";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", checkPin);
  input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") checkPin();
  });
});

/* ============================================================
   1. ADMIN (EMAIL) PROTECTION
============================================================ */
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "./auth/login.html";
    return;
  }

  const allowed = "naz-erke_k@mail.ru"; // ← МҰНДА ӨЗ EMAIL ЖАЗ
  if (user.email !== allowed) {
    document.body.innerHTML =
      "<h2 style='padding:40px;text-align:center;'>❌ Бұл тақта тек әкімшіге арналған.</h2>";
    signOut(auth);
    return;
  }

  currentUser = user;
  initBoard();
});

/* ============================================================
   2. UTIL
============================================================ */
const $ = (id) => document.getElementById(id);
const lp$ = (id) => document.getElementById(id);

/* ============================================================
   3. MULTI-PAGE ARCHITECTURE
============================================================ */

let pages = [];
let activePageId = null;

function createPage(name) {
  const id = "page-" + Math.random().toString(36).substr(2, 6);
  return {
    id,
    name,
    blocks: []
  };
}

function getActivePage() {
  return pages.find((p) => p.id === activePageId) || null;
}

function initPages() {
  if (pages.length === 0) {
    const first = createPage("Бет 1");
    pages.push(first);
    activePageId = first.id;
  }
  renderPagesSidebar();
}

function renderPagesSidebar() {
  const list = $("pagesList");
  if (!list) return;

  list.innerHTML = "";
  pages.forEach((p) => {
    const item = document.createElement("div");
    item.className = "page-item" + (p.id === activePageId ? " active" : "");
    item.textContent = p.name;
    item.onclick = () => switchPage(p.id);
    list.appendChild(item);
  });
}

function addNewPage() {
  const page = createPage("Бет " + (pages.length + 1));
  pages.push(page);
  activePageId = page.id;
  renderPagesSidebar();
  renderBoard();
}

function switchPage(id) {
  const exists = pages.some((p) => p.id === id);
  if (!exists) return;
  activePageId = id;
  renderPagesSidebar();
  renderBoard();
}

function getCurrentBlocks() {
  const page = getActivePage();
  return page ? page.blocks : [];
}

function setCurrentBlocks(newBlocks) {
  const page = getActivePage();
  if (!page) return;
  page.blocks = newBlocks;
}

/* ============================================================
   4. BOARD (BLOCKS)
============================================================ */

function addCard(block) {
  const state = getCurrentBlocks().slice();
  const id = "id-" + Math.random().toString(36).substr(2, 9);
  state.push({ id, ...block });
  setCurrentBlocks(state);
  renderBoard();
}

function deleteCard(id) {
  const state = getCurrentBlocks().filter((b) => b.id !== id);
  setCurrentBlocks(state);
  renderBoard();
}

function renderBoard() {
  const el = $("boardArea");
  if (!el) return;

  el.innerHTML = "";

  const blocks = getCurrentBlocks();

  blocks.forEach((b) => {
    const card = document.createElement("div");
    card.className = "board-card";

    const header = document.createElement("div");
    header.className = "board-card-header";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = b.type;

    const del = document.createElement("button");
    del.textContent = "Өшіру";
    del.className = "toggle-btn";
    del.onclick = () => deleteCard(b.id);

    header.appendChild(badge);
    header.appendChild(del);

    const body = document.createElement("div");
    body.className = "board-card-body";
    body.innerHTML = (b.text || "").replace(/\n/g, "<br>");

    const btn = document.createElement("button");
    btn.textContent = "Ашу";
    btn.className = "toggle-btn";
    btn.onclick = () => {
      card.classList.toggle("expanded");
      btn.textContent = card.classList.contains("expanded") ? "Жабу" : "Ашу";
      if (window.MathJax) window.MathJax.typeset();
    };

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(btn);

    el.appendChild(card);
  });

  const addBlock = document.createElement("div");
  addBlock.innerHTML = `
    <textarea id="newBlockText" placeholder="Жаңа блок..." style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;"></textarea>
    <button id="addBlockBtn" class="toggle-btn" style="margin-top:4px;">➕ Қосу</button>
  `;
  el.appendChild(addBlock);

  const addBtn = $("addBlockBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      const txt = $("newBlockText").value.trim();
      if (!txt) return;
      addCard({ type: "text", text: txt });
      $("newBlockText").value = "";
    };
  }
}

/* ============================================================
   5. AI
============================================================ */
async function openAI(prompt, lang = "kk") {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, lang }),
  });

  if (!res.ok) throw new Error("AI error");

  const data = await res.json();
  return data.answer || data.text || data.content || "";
}

/* ============================================================
   6. ROOM / STUDENT ANSWERS / REFLECTION
============================================================ */
let currentRoomId = null;

function listenAnswers(roomId) {
  if (!db) return;

  // ANSWERS
  const answersRef = ref(db, "rooms/" + roomId + "/answers");
  onValue(answersRef, (snapshot) => {
    const box = $("answersBox");
    if (!box) return;
    const data = snapshot.val();

    if (!data) {
      box.innerHTML = "<div class='small'>Әзірше жауап жоқ...</div>";
      return;
    }

    let html = "";
    Object.values(data).forEach((v) => {
      html += `
        <div class="answer-item">
          <b>${v.name}</b><br>${v.text}
        </div>
      `;
    });

    box.innerHTML = html;
  });

  // STUDENTS
  const studentsRef = ref(db, "rooms/" + roomId + "/students");
  onValue(studentsRef, (snapshot) => {
    const box = $("studentsList");
    if (!box) return;
    const data = snapshot.val();

    if (!data) {
      box.innerHTML = "<div class='small'>Ешкім қосылмады</div>";
      return;
    }

    let html = "";
    Object.values(data).forEach((v) => {
      html += `<div class="student-item"><span>${v.name}</span></div>`;
    });
    box.innerHTML = html;
  });

  // EMOJI
  const emojiRef = ref(db, "rooms/" + roomId + "/reflection/emoji");
  onValue(emojiRef, (snapshot) => {
    const box = $("emojiStats");
    if (!box) return;
    const data = snapshot.val();
    if (!data) {
      box.textContent = "Әзірше эмоция жоқ...";
      return;
    }
    const counts = {};
    Object.values(data).forEach((v) => {
      counts[v.emoji] = (counts[v.emoji] || 0) + 1;
    });
    box.textContent = Object.entries(counts)
      .map(([emo, c]) => `${emo} — ${c}`)
      .join(" | ");
  });

  // WORD CLOUD
  const wordsRef = ref(db, "rooms/" + roomId + "/reflection/words");
  onValue(wordsRef, (snapshot) => {
    const box = $("wordCloud");
    if (!box) return;
    const data = snapshot.val();
    if (!data) {
      box.innerHTML = "<div class='small'>Пікір жоқ...</div>";
      return;
    }
    let html = "";
    Object.values(data).forEach((v) => {
      html += `<span class="cloud-word">${v.word}</span> `;
    });
    box.innerHTML = html;
  });
}

/* ============================================================
   7. LESSON PLANNER MODAL
============================================================ */
function openLessonPlanner() {
  lp$("lpOverlay").classList.remove("lp-hidden");
  lp$("lessonPlannerModal").classList.remove("lp-hidden");
}

function closeLessonPlanner() {
  lp$("lpOverlay").classList.add("lp-hidden");
  lp$("lessonPlannerModal").classList.add("lp-hidden");
}

/* ============================================================
   8. FULLSCREEN
============================================================ */
function setupFullscreen() {
  const fsBtn = $("fullscreenToggleBtn");
  if (!fsBtn) return;

  fsBtn.onclick = () => {
    document.body.classList.toggle("fullscreen");
    fsBtn.textContent = document.body.classList.contains("fullscreen")
      ? "⛶ Exit"
      : "⛶ Fullscreen";
  };
}

/* ============================================================
   9. QR LOGIN
============================================================ */
function setupQR() {
  const qrBtn = $("qrBtn");
  const qrOverlay = $("qrOverlay");
  const qrModal = $("qrModal");
  const qrCloseBtn = $("qrCloseBtn");
  const qrImage = $("qrImage");

  if (!qrBtn || !qrOverlay || !qrModal || !qrImage || typeof QRCode === "undefined") {
    return;
  }

  qrBtn.onclick = () => {
    const roomFromLabel = $("roomIdLabel")?.textContent.trim();
    const roomId = currentRoomId || roomFromLabel;

    if (!roomId || roomId === "–") {
      alert("Алдымен Room жасаңыз!");
      return;
    }

    const basePath = window.location.pathname.replace("teacherBoard.html", "student.html");
    const url = `${window.location.origin}${basePath}?room=${roomId}`;

    qrImage.innerHTML = "";
    QRCode.toCanvas(url, { width: 260 }, (err, canvas) => {
      if (err) {
        console.error(err);
        qrImage.textContent = "QR жасау қате.";
        return;
      }
      qrImage.appendChild(canvas);
    });

    qrOverlay.classList.remove("lp-hidden");
    qrModal.classList.remove("lp-hidden");
  };

  const close = () => {
    qrOverlay.classList.add("lp-hidden");
    qrModal.classList.add("lp-hidden");
  };

  qrCloseBtn.onclick = close;
  qrOverlay.onclick = close;
}

/* ============================================================
   10. INIT BOARD
============================================================ */
function initBoard() {
  console.log("Board initialized ✔");

  // Pages
  initPages();
  const addPgBtn = $("addPageBtn");
  if (addPgBtn) addPgBtn.onclick = addNewPage;

  // ROOM
  const roomBtn = $("createRoomBtn");
  if (roomBtn) {
    roomBtn.onclick = () => {
      currentRoomId = Math.random().toString(36).substr(2, 6).toUpperCase();
      $("roomIdLabel").textContent = currentRoomId;
      $("roomIdLabel2").textContent = currentRoomId;
      listenAnswers(currentRoomId);
    };
  }

  // TOOLS
  $("toolCard")?.addEventListener("click", () =>
    addCard({ type: "card", text: "Жаңа карточка" })
  );
  $("toolPhoto")?.addEventListener("click", () =>
    addCard({ type: "photo", text: "Фото (әзірленуде)" })
  );
  $("toolVideo")?.addEventListener("click", () =>
    addCard({ type: "video", text: "Видео (әзірленуде)" })
  );
  $("toolLink")?.addEventListener("click", () =>
    addCard({ type: "link", text: "Сілтеме (әзірленуде)" })
  );
  $("toolFormula")?.addEventListener("click", () =>
    addCard({ type: "formula", text: "E = mc^2" })
  );
  $("toolTrainer")?.addEventListener("click", () =>
    addCard({ type: "trainer", text: "Тренажер (әзірленуде)" })
  );
  $("toolQuiz")?.addEventListener("click", () =>
    addCard({ type: "quiz", text: "Викторина (әзірленуде)" })
  );

  // AI BUTTON
  $("aiGenerateBtn")?.addEventListener("click", async () => {
    const prompt = $("aiPrompt").value.trim();
    if (!prompt) return;

    const btn = $("aiGenerateBtn");
    btn.disabled = true;
    btn.textContent = "AI ойланып жатыр...";

    try {
      const answer = await openAI(prompt);
      const blocks = answer
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      blocks.forEach((b) => addCard({ type: "AI", text: b }));
      $("aiPrompt").value = "";
    } catch (e) {
      alert("AI қате берді");
    }

    btn.disabled = false;
    btn.textContent = "AI → Блок қосу";
  });

  // LESSON PLANNER
  $("lessonPlannerBtn")?.addEventListener("click", () => openLessonPlanner());
  $("lpCloseBtn")?.addEventListener("click", () => closeLessonPlanner());
  $("lpOverlay")?.addEventListener("click", () => closeLessonPlanner());

  $("lpGenerateBtn")?.addEventListener("click", async () => {
    const subject = lp$("lpSubject").value || "Математика";
    const grade = lp$("lpGrade").value || "7-сынып";
    const topic = lp$("lpTopic").value || "Тақырып";
    const lang = lp$("lpLang").value || "kk";
    const format = lp$("lpFormat").value || "short";
    const extra = lp$("lpExtra").value || "";

    const prompt = `
Сабақ жоспарын құр:
Пән: ${subject}
Сынып: ${grade}
Тақырып: ${topic}
Формат: ${format}
Талаптар: ${extra}
`.trim();

    const btn = $("lpGenerateBtn");
    btn.disabled = true;
    btn.textContent = "AI жоспар құруда...";

    try {
      const plan = await openAI(prompt, lang);
      lp$("lpResultText").value = plan;
      document.querySelector(".lp-result").classList.remove("lp-hidden");
      $("lpInsertToBoardBtn").classList.remove("lp-hidden");
    } catch (err) {
      alert("AI қате");
    }

    btn.disabled = false;
    btn.textContent = "🤖 Сабақ жоспарын құру";
  });

  $("lpInsertToBoardBtn")?.addEventListener("click", () => {
    const t = lp$("lpResultText").value.trim();
    if (!t) return;
    addCard({ type: "lesson-plan", text: t });
    closeLessonPlanner();
  });

  // TABS
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach((x) =>
        x.classList.remove("active")
      );
      document.querySelectorAll(".tab-content").forEach((x) =>
        x.classList.remove("active")
      );

      btn.classList.add("active");
      $("tab-" + btn.dataset.tab).classList.add("active");
    };
  });

  setupFullscreen();
  setupQR();
  renderBoard();
}
