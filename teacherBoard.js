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
  currentUser = user;
  console.log("Logged in as:", user.email);
  const emailLabel = document.getElementById("teacherEmail");
  if (emailLabel) emailLabel.textContent = user.email;
});

/* ============================================================
   SHORTCUT $
============================================================ */
function $(id) {
  return document.getElementById(id);
}

/* ============================================================
   2. PIN MODAL
============================================================ */
const pinModal = $("pinModal");
const pinInput = $("pinInput");
const pinError = $("pinError");
const pinOverlay = $("pinOverlay");

const STATIC_PIN = "2746";

function openPinModal() {
  if (!pinModal) return;
  pinModal.classList.remove("hidden");
  pinOverlay.classList.remove("hidden");
  pinInput.value = "";
  pinError.textContent = "";
  pinInput.focus();
}

function closePinModal() {
  if (!pinModal) return;
  pinModal.classList.add("hidden");
  pinOverlay.classList.add("hidden");
}

$("openPinBtn")?.addEventListener("click", openPinModal);
pinOverlay?.addEventListener("click", closePinModal);
$("pinCloseBtn")?.addEventListener("click", closePinModal);

$("pinConfirmBtn")?.addEventListener("click", () => {
  if (pinInput.value.trim() === STATIC_PIN) {
    closePinModal();
  } else {
    pinError.textContent = "PIN қате. Қайта көріңіз.";
  }
});

/* ENTER пернесі */
pinInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    $("pinConfirmBtn").click();
  }
});

/* ============================================================
   3. LANGUAGE SWITCHER (KZ/RU/EN)
============================================================ */
const langSelect = $("langSelect");
if (langSelect) {
  langSelect.addEventListener("change", () => {
    const lang = langSelect.value;
    document.documentElement.setAttribute("data-lang", lang);
    localStorage.setItem("sbai_lang", lang);
    if (window.applyTranslations) {
      window.applyTranslations(lang);
    }
  });

  const savedLang = localStorage.getItem("sbai_lang") || "kk";
  langSelect.value = savedLang;
  document.documentElement.setAttribute("data-lang", savedLang);
}

/* ============================================================
   4. FULLSCREEN TOGGLE
============================================================ */
const fullscreenBtn = $("fullscreenToggleBtn");

if (fullscreenBtn) {
  fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen error:", err);
      });
      fullscreenBtn.textContent = "⛶ Exit Fullscreen";
    } else {
      document.exitFullscreen();
      fullscreenBtn.textContent = "⛶ Fullscreen";
    }
  };
}

/* ============================================================
   5. BOARD DATA STRUCTURE
============================================================ */
let cards = []; // [{id, type, text, ...}]

function renderBoard() {
  const board = $("boardArea");
  if (!board) return;

  board.innerHTML = "";
  cards.forEach((card) => {
    const div = document.createElement("div");
    div.className = "card-block";
    div.dataset.id = card.id;

    if (card.type === "card") {
      div.innerHTML = `<div class="card-inner">${card.text}</div>`;
    } else if (card.type === "photo") {
      div.innerHTML = `<div class="card-inner"><img src="${card.text}" class="photo-block" /></div>`;
    } else if (card.type === "video") {
      div.innerHTML = `<div class="card-inner"><iframe src="${card.text}" class="video-block"></iframe></div>`;
    } else if (card.type === "link") {
      div.innerHTML = `<div class="card-inner"><a href="${card.text}" target="_blank">${card.text}</a></div>`;
    } else if (card.type === "formula") {
      div.innerHTML = `<div class="card-inner formula-block">\\(${card.text}\\)</div>`;
    } else if (card.type === "trainer") {
      div.innerHTML = `<div class="card-inner"><iframe src="${card.text}" class="trainer-iframe"></iframe></div>`;
    }

    board.appendChild(div);
  });

  if (window.MathJax) {
    window.MathJax.typesetPromise();
  }
}

function addCard(card) {
  card.id = "card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  cards.push(card);
  renderBoard();
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

    if (!box) return;

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

function listenStudents(roomId) {
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
    Object.values(data).forEach((s) => {
      html += `
        <div class="student-item">
          <b>${s.avatar || "🙂"} ${s.name || ""}</b>
        </div>
      `;
    });

    box.innerHTML = html;
  });
}

function listenReflections(roomId) {
  // 1) Words (Word Cloud)
  const wordsRef = ref(db, "rooms/" + roomId + "/reflection/words");
  onValue(wordsRef, (snapshot) => {
    const cloud = $("wordCloud");
    if (!cloud) return;

    const data = snapshot.val();
    if (!data) {
      cloud.innerHTML = "<div class='small'>Пікір жоқ...</div>";
      return;
    }

    const freq = {};
    Object.values(data).forEach((item) => {
      const w = (item.word || "").trim();
      if (!w) return;
      freq[w] = (freq[w] || 0) + 1;
    });

    const entries = Object.entries(freq);
    if (!entries.length) {
      cloud.innerHTML = "<div class='small'>Пікір жоқ...</div>";
      return;
    }

    const max = Math.max(...entries.map(([, c]) => c));
    cloud.innerHTML = entries
      .map(([word, count]) => {
        const size = 12 + Math.round((count / max) * 18); // 12–30px
        return `<span style="font-size:${size}px; margin:4px; display:inline-block;">${word}</span>`;
      })
      .join(" ");
  });

  // 2) Emojis
  const emojiRef = ref(db, "rooms/" + roomId + "/reflection/emoji");
  onValue(emojiRef, (snapshot) => {
    const box = $("emojiStats");
    if (!box) return;

    const data = snapshot.val();
    if (!data) {
      box.textContent = "Әлі эмоция жоқ...";
      return;
    }

    const freq = {};
    Object.values(data).forEach((item) => {
      const e = item.emoji || "🙂";
      freq[e] = (freq[e] || 0) + 1;
    });

    const parts = Object.entries(freq).map(
      ([emoji, count]) => `${emoji} — ${count}`
    );
    box.textContent = parts.join(" · ");
  });
}

/* ============================================================
   7. LESSON PLANNER (AI)
============================================================ */
const lpOpenBtn = $("lessonPlannerBtn");
const lpOverlay = $("lpOverlay");
const lpModal = $("lessonPlannerModal");
const lpCloseBtn = $("lpCloseBtn");

const lpSubject = $("lpSubject");
const lpGrade = $("lpGrade");
const lpObjective = $("lpObjective");
const lpDuration = $("lpDuration");
const lpLang = $("lpLang");

const lpGenerateBtn = $("lpGenerateBtn");
const lpResultBlock = document.querySelector(".lp-result");
const lpResultText = $("lpResultText");

if (lpOpenBtn) {
  lpOpenBtn.onclick = () => {
    lpOverlay.classList.remove("lp-hidden");
    lpModal.classList.remove("lp-hidden");
  };
}

if (lpCloseBtn) {
  lpCloseBtn.onclick = () => {
    lpOverlay.classList.add("lp-hidden");
    lpModal.classList.add("lp-hidden");
  };
}

if (lpOverlay) {
  lpOverlay.onclick = () => {
    lpOverlay.classList.add("lp-hidden");
    lpModal.classList.add("lp-hidden");
  };
}

if (lpGenerateBtn) {
  lpGenerateBtn.onclick = async () => {
    const subj = lpSubject.value.trim();
    const gr = lpGrade.value.trim();
    const obj = lpObjective.value.trim();
    const dur = lpDuration.value.trim();
    const lang = lpLang.value;

    if (!subj || !gr || !obj || !dur) {
      alert("Барлық өрісті толтырыңыз.");
      return;
    }

    lpGenerateBtn.disabled = true;
    lpGenerateBtn.textContent = "Генерацияланып жатыр...";

    const prompt = `
Пән: ${subj}
Сынып: ${gr}
Оқу мақсаты: ${obj}
Ұзақтығы: ${dur} минут.

Толық сабақ жоспарын жаса:
- Сабақ мақсаты
- Қажетті ресурстар
- Сабақ кезеңдері (Қызығушылық ояту, Жаңа тақырып, Тапсырмалар, Рефлексия)
- Бағалау түрлері
Тілді: ${lang} етіп бер.
`.trim();

    try {
      const planText = await openAI(prompt, lang);
      lpResultBlock.classList.remove("lp-hidden");
      lpResultText.value = planText;
    } catch (e) {
      console.error(e);
      alert("AI қате қайтарды.");
    } finally {
      lpGenerateBtn.disabled = false;
      lpGenerateBtn.textContent = "Генерациялау";
    }
  };
}

/* ============================================================
   8. AI BACKEND CALL
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
    listenStudents(currentRoomId);
    listenReflections(currentRoomId);
  };

  /* TOOLS */
  $("toolCard").onclick = () => addCard({ type: "card", text: "Жаңа карточка" });
  $("toolPhoto").onclick = () =>
    addCard({ type: "photo", text: "https://via.placeholder.com/400x250" });
  $("toolVideo").onclick = () =>
    addCard({ type: "video", text: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  $("toolLink").onclick = () =>
    addCard({ type: "link", text: "https://www.google.com" });
  $("toolFormula").onclick = () =>
    addCard({ type: "formula", text: "a^2 + b^2 = c^2" });
  $("toolTrainer").onclick = () =>
    addCard({
      type: "trainer",
      text: "https://learningapps.org/create.php",
    });
}

/* ============================================================
   10. LOGOUT
============================================================ */
$("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "./auth/login.html";
});

/* ============================================================
   11. START
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initBoard();
});
