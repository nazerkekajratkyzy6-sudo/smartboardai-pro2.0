// SmartBoardAI PRO 2.0 — FINAL teacherBoard.js
// Барлық функциялар біріктірілген толық нұсқа

console.log("TeacherBoard.js loaded ✔ FINAL");

import {
  auth,
  db,
  ref,
  set,
  push,
  get,
  onValue,
  onAuthStateChanged,
  signOut
} from "./firebaseConfig.js";

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
   2. SHORT UTILS
============================================================ */
const $ = (id) => document.getElementById(id);
const lp$ = (id) => document.getElementById(id);

/* ============================================================
   3. BOARD STATE
============================================================ */
let boardState = [];

function addCard(block) {
  const id = "id-" + Math.random().toString(36).substr(2, 9);
  boardState.push({ id, ...block });
  renderBoard();
}

function deleteCard(id) {
  boardState = boardState.filter((b) => b.id !== id);
  renderBoard();
}

/* ============================================================
   4. RENDER BOARD
============================================================ */
function renderBoard() {
  const el = $("boardArea");
  el.innerHTML = "";

  boardState.forEach((b) => {
    const card = document.createElement("div");
    card.className = "board-card";

    // Header
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

    // Body
    const body = document.createElement("div");
    body.className = "board-card-body";
    body.innerHTML = (b.text || "").replace(/\n/g, "<br>");

    // Toggle
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

  // Add new block
  const addBlock = document.createElement("div");
  addBlock.innerHTML = `
    <textarea id="newBlockText" placeholder="Жаңа блок..." style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;"></textarea>
    <button id="addBlockBtn" class="toggle-btn" style="margin-top:4px;">➕ Қосу</button>
  `;

  el.appendChild(addBlock);

  $("addBlockBtn").onclick = () => {
    const txt = $("newBlockText").value.trim();
    if (!txt) return;
    addCard({ type: "text", text: txt });
    $("newBlockText").value = "";
  };
}

/* ============================================================
   5. AI GENERATION
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
   6. ROOM / STUDENT ANSWERS
============================================================ */
let currentRoomId = null;

function listenAnswers(roomId) {
  const answersRef = ref(db, "rooms/" + roomId + "/answers");

  onValue(answersRef, (snapshot) => {
    const box = $("answersBox");
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
}

/* ============================================================
   7. LESSON PLANNER MODAL CONTROL
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
   8. FULLSCREEN MODE
============================================================ */
function setupFullscreen() {
  const fsBtn = $("fullscreenToggleBtn");

  fsBtn.onclick = () => {
    document.body.classList.toggle("fullscreen");
    fsBtn.textContent = document.body.classList.contains("fullscreen")
      ? "⛶ Exit"
      : "⛶ Fullscreen";
  };
}

/* ============================================================
   9. INIT BOARD
============================================================ */
function initBoard() {
  console.log("Board initialized ✔");

  /* ROOM */
  $("createRoomBtn").onclick = () => {
    currentRoomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    $("roomIdLabel").textContent = currentRoomId;
    $("roomIdLabel2").textContent = currentRoomId;
    listenAnswers(currentRoomId);
  };

  /* TOOLS */
  $("toolCard").onclick = () => addCard({ type: "card", text: "Жаңа карточка" });
  $("toolPhoto").onclick = () => addCard({ type: "photo", text: "Фото (әзірленуде)" });
  $("toolVideo").onclick = () => addCard({ type: "video", text: "Видео (әзірленуде)" });
  $("toolLink").onclick = () => addCard({ type: "link", text: "Сілтеме (әзірленуде)" });
  $("toolFormula").onclick = () => addCard({ type: "formula", text: "E = mc^2" });
  $("toolTrainer").onclick = () => addCard({ type: "trainer", text: "Тренажер (әзірленуде)" });
  $("toolQuiz").onclick = () => addCard({ type: "quiz", text: "Викторина (әзірленуде)" });

  /* AI BUTTON */
  $("aiGenerateBtn").onclick = async () => {
    const prompt = $("aiPrompt").value.trim();
    if (!prompt) return;

    $("aiGenerateBtn").disabled = true;
    $("aiGenerateBtn").textContent = "AI ойланып жатыр...";

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

    $("aiGenerateBtn").disabled = false;
    $("aiGenerateBtn").textContent = "AI → Блок қосу";
  };

  /* LESSON PLANNER BUTTONS */
  $("lessonPlannerBtn").onclick = () => openLessonPlanner();
  $("lpCloseBtn").onclick = () => closeLessonPlanner();
  $("lpOverlay").onclick = () => closeLessonPlanner();

  $("lpGenerateBtn").onclick = async () => {
    const subject = lp$("lpSubject").value || "Математика";
    const grade = lp$("lpGrade").value || "7-сынып";
    const topic = lp$("lpTopic").value || "Тақырып";
    const lang = lp$("lpLang").value || "kk";
    const format = lp$("lpFormat").value;
    const extra = lp$("lpExtra").value || "";

    const prompt = `
Сабақ жоспарын құр:
Пән: ${subject}
Сынып: ${grade}
Тақырып: ${topic}
Формат: ${format}
Талаптар: ${extra}
`.trim();

    $("lpGenerateBtn").disabled = true;
    $("lpGenerateBtn").textContent = "AI жоспар құруда...";

    try {
      const plan = await openAI(prompt, lang);
      lp$("lpResultText").value = plan;
      document.querySelector(".lp-result").classList.remove("lp-hidden");
      $("lpInsertToBoardBtn").classList.remove("lp-hidden");
    } catch (err) {
      alert("AI қате");
    }

    $("lpGenerateBtn").disabled = false;
    $("lpGenerateBtn").textContent = "🤖 Сабақ жоспарын құру";
  };

  $("lpInsertToBoardBtn").onclick = () => {
    const t = lp$("lpResultText").value.trim();
    if (!t) return;

    addCard({
      type: "lesson-plan",
      text: t,
    });

    closeLessonPlanner();
  };

  /* TABS */
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
  renderBoard();
}

