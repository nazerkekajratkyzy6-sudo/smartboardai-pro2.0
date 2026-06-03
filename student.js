// student.js —  SmartBoardAI PRO v2.0

import { db, ref, push, onValue, set } from "./firebaseConfig.js";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const $ = (id) => document.getElementById(id);
const storage = getStorage();

// ── URL params ───────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const urlRoom = params.get("room");
const urlName = params.get("name");

// ── Student ID (localStorage) ────────────────────────
const studentId =
  localStorage.getItem("sb_studentId") ||
  ("std_" + Math.random().toString(36).slice(2, 9));
localStorage.setItem("sb_studentId", studentId);

// ── Helpers ──────────────────────────────────────────
function getRoomId() {
  return window._studentRoom || ($("roomInput")?.value || "").trim();
}

function showStatus(msg, type = "ok") {
  const el = $("status");
  if (el) {
    el.className = "status-msg " + type;
    el.textContent = msg;
    setTimeout(() => { el.textContent = "Онлайн"; el.className = "status-msg"; }, 3000);
  }
  if (window.showStudentStatus) window.showStudentStatus(msg, type);
}

// ── Presence ─────────────────────────────────────────
async function saveStudentPresence() {
  const roomId = getRoomId();
  const name   = $("sb_studentName")?.value.trim() || window._studentName || "";
  const avatar = window._studentAvatar || "🙂";
  if (!roomId || !name) return;
  localStorage.setItem("sb_studentName", name);
  await set(ref(db, `rooms/${roomId}/students/${studentId}`), {
    name, avatar, time: Date.now()
  });
}

// ── Teacher block listener ───────────────────────────
function listenTeacherBlock() {
  const roomId = getRoomId();
  if (!roomId) return;
  onValue(ref(db, `rooms/${roomId}/activeBlock`), (snap) => {
    const data = snap.val();
    if (!data) return;

    // New UI
    if (window.showStudentTask) window.showStudentTask(data);

    // Fallback (old HTML)
    const tb = $("teacherBlock");
    if (!tb) return;
    tb.style.display = "block";
    const emp = $("taskEmpty");
    if (emp) emp.style.display = "none";

    if (["text","ai","rich"].includes(data.type)) {
      tb.innerHTML = `<div>${data.content}</div>`;
    } else if (data.type === "formula") {
      tb.innerHTML = `<div>\\(${data.content}\\)</div>`;
    } else if (["trainer","video","geogebra","link"].includes(data.type)) {
      tb.innerHTML = `
        <div style="position:relative;">
          <button onclick="openFullscreenTask()" style="
            position:absolute;top:8px;right:8px;z-index:10;
            background:#4f46e5;color:white;border:none;
            border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px;">⛶ Толық экран</button>
          <iframe id="studentTaskFrame" src="${data.content}"
            style="width:100%;height:420px;border-radius:12px;border:1px solid #e2e8f0;"></iframe>
        </div>`;
    } else {
      tb.innerHTML = `<div>${data.content || ""}</div>`;
    }
    if (window.MathJax) MathJax.typesetPromise();
  });
}

// ── Feedback listener ────────────────────────────────
function listenFeedback() {
  const roomId = getRoomId();
  if (!roomId) return;
  onValue(ref(db, `rooms/${roomId}/studentFeedback/${studentId}`), (snap) => {
    const data = snap.val();
    if (!data) return;
    const reaction = data.reaction || "💬";
    const text     = data.text || "";
    const time     = data.time
      ? new Date(data.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"})
      : "";
    if (window.showFeedback) window.showFeedback(reaction, text, time);
  });
}

// ── Send answer ──────────────────────────────────────
async function sendAnswer() {
  const roomId = getRoomId();
  const name   = $("sb_studentName")?.value.trim() || window._studentName || "";
  const text   = $("studentAnswer")?.value.trim() || "";
  const avatar = window._studentAvatar || "🙂";
  if (!roomId) { showStatus("❗ Бөлме коды жоқ","error"); return; }
  if (!name)   { showStatus("❗ Атыңызды жазыңыз","error"); return; }
  if (!text)   { showStatus("❗ Жауабыңызды жазыңыз","error"); return; }
  try {
    await saveStudentPresence();
    await push(ref(db, `rooms/${roomId}/answers`), {
      name, avatar, text, studentId, time: Date.now()
    });
    const ai = $("studentAnswer");
    if (ai) ai.value = "";
    showStatus("✅ Жауап жіберілді!", "ok");
  } catch(e) { showStatus("❌ Қате: " + e.message, "error"); }
}

// ── Send photo ───────────────────────────────────────
async function sendStudentPhoto() {
  const roomId = getRoomId();
  const name   = $("sb_studentName")?.value.trim() || window._studentName || "";
  const avatar = window._studentAvatar || "🙂";
  const file   = $("studentPhotoInput")?.files?.[0];
  if (!roomId) { showStatus("❗ Бөлме коды жоқ","error"); return; }
  if (!name)   { showStatus("❗ Атыңызды жазыңыз","error"); return; }
  if (!file)   { showStatus("❗ Фото таңдаңыз","error"); return; }
  if (file.size > 6*1024*1024) { showStatus("❗ Фото 6MB-тан кіші болсын","error"); return; }
  try {
    showStatus("📤 Жіберіліп жатыр...","sending");
    const fr  = sRef(storage, `studentUploads/${roomId}/${Date.now()}_${file.name}`);
    await uploadBytes(fr, file);
    const url = await getDownloadURL(fr);
    await saveStudentPresence();
    await push(ref(db, `rooms/${roomId}/studentPhotos`), {
      name, avatar, url, studentId, time: Date.now()
    });
    const pi = $("studentPhotoInput");
    if (pi) pi.value = "";
    showStatus("✅ Фото жіберілді!", "ok");
  } catch(e) { showStatus("❌ Фото қатесі: " + e.message, "error"); }
}

// ── Send emoji ───────────────────────────────────────
function sendEmoji(emoji) {
  const roomId = getRoomId();
  const name   = $("sb_studentName")?.value.trim() || window._studentName || "";
  const avatar = window._studentAvatar || "🙂";
  if (!roomId || !name) return;
  push(ref(db, `rooms/${roomId}/emotions`), { name, avatar, emoji, time: Date.now() });
  showStatus("💛 Эмоция жіберілді!", "ok");
}

// ── Send word ────────────────────────────────────────
function sendWord(wordVal) {
  const roomId = getRoomId();
  const name   = $("sb_studentName")?.value.trim() || window._studentName || "";
  const avatar = window._studentAvatar || "🙂";
  const wi     = $("wordInput");
  const word   = wordVal || wi?.value.trim() || "";
  if (!roomId || !name || !word) return;
  push(ref(db, `rooms/${roomId}/wordcloud`), { name, avatar, word, time: Date.now() });
  if (wi) wi.value = "";
  showStatus("☁ Сөз жіберілді!", "ok");
}

// ── JOIN ROOM (new UI) ────────────────────────────────
window.joinRoom = function(roomId, name, avatar) {
  const ri = $("roomInput");
  const ni = $("sb_studentName");
  if (ri) ri.value = roomId;
  if (ni) ni.value = name;
  window._studentAvatar = avatar || "🙂";
  window._studentName   = name;
  window._studentRoom   = roomId;
  saveStudentPresence();
  listenTeacherBlock();
  listenFeedback();
  if (window.showStudentRoom) window.showStudentRoom(name, roomId, avatar);
  showStatus("✅ Сабаққа қосылдыңыз!", "ok");

  // ── Барлық listener-лар (ШАМ 21-34) ──────────────
  setTimeout(() => {
    if (typeof listenVote        === "function") listenVote();
    if (typeof listenVoteResults === "function") listenVoteResults();
    if (typeof listenKahoot      === "function") listenKahoot();
    if (typeof listenCollab      === "function") listenCollab();
    if (typeof listenHomework    === "function") listenHomework();
    if (typeof listenRace        === "function") listenRace();
  }, 500);
};

// ── Fullscreen ────────────────────────────────────────
window.openFullscreenTask = function() {
  const el = $("studentTaskFrame") || $("trainerFrame");
  if (!el) return;
  (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen).call(el);
};

// ── Window exports ────────────────────────────────────
window.sendEmoji = sendEmoji;
window.sendWord  = sendWord;

// ── INIT ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // QR auto-join
  if (urlRoom && urlName) {
    setTimeout(() => window.joinRoom(urlRoom, urlName, "🙂"), 300);
  } else if (urlRoom) {
    const ri = $("roomInput");
    if (ri) { ri.value = urlRoom; ri.readOnly = true; }
    const qd = $("qrDetected");
    if (qd) qd.style.display = "block";
  }

  // Buttons
  const sb  = $("sendBtn");     if (sb)  sb.addEventListener("click", sendAnswer);
  const spb = $("sendPhotoBtn"); if (spb) spb.addEventListener("click", sendStudentPhoto);
  const wcb = $("wcBtn");       if (wcb) wcb.addEventListener("click", () => sendWord());

  // Emoji grid
  const eg = $("emojiContainer");
  if (eg) eg.querySelectorAll(".emoji-btn").forEach(b => {
    b.addEventListener("click", () => { if (b.dataset.emoji) sendEmoji(b.dataset.emoji); });
  });

  // Lang
  const lz = $("stKZ"); if (lz) lz.addEventListener("click", () => applyLang("kz"));
  const lr = $("stRU"); if (lr) lr.addEventListener("click", () => applyLang("ru"));
  const le = $("stEN"); if (le) le.addEventListener("click", () => applyLang("en"));

  if (getRoomId()) { listenTeacherBlock(); listenFeedback(); }
});

// ── Lang ──────────────────────────────────────────────
const LANG = {
  kz: { send:"Жіберу",    ans:"Жауабыңызды жазыңыз..." },
  ru: { send:"Отправить", ans:"Напишите ответ..." },
  en: { send:"Send",      ans:"Type your answer..." },
};

function applyLang(lang) {
  const t  = LANG[lang] || LANG.kz;
  const sb = $("sendBtnText") || $("sendBtn");
  if (sb) sb.textContent = t.send;
  const ai = $("studentAnswer");
  if (ai) ai.placeholder = t.ans;
}

// =====================================================
// ШАМ 21: STUDENT VOTING —  нақты Firebase
// =====================================================

let _voteId = null;
let _voteAnswered = false;

function listenVote() {
  const roomId = getRoomId();
  if (!roomId) return;

  onValue(ref(db, `rooms/${roomId}/vote`), (snap) => {
    const data = snap.val();
    const voteTab = document.getElementById("voteTab");
    const voteBadge = document.getElementById("voteBadge");

    if (!data || !data.active) {
      if (voteTab) voteTab.style.display = "none";
      return;
    }

    // Жаңа vote —  табты көрсету + badge
    if (voteTab) voteTab.style.display = "flex";
    if (voteBadge) { voteBadge.style.display = "block"; }

    // Vote ID өзгерді ме?
    if (_voteId !== data.time) {
      _voteId = data.time;
      _voteAnswered = false;
    }

    // Автоматты Vote табына ауыстыру
    if (!_voteAnswered) {
      document.querySelectorAll(".st-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".st-panel").forEach(p => p.classList.remove("active"));
      voteTab.classList.add("active");
      document.getElementById("panel-vote").classList.add("active");
    }

    renderVoteUI(data);
  });
}

function renderVoteUI(data) {
  const content = document.getElementById("voteContent");
  if (!content) return;

  const opts = data.options || [];
  const letters = ["А", "Б", "В", "Г", "Д"];
  const colors  = ["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6"];

  content.innerHTML = `
    <div class="vote-question">${data.question || "Сұрақ"}</div>
    <div class="vote-opts" id="voteOpts">
      ${opts.map((opt, i) => `
        <button class="vote-opt-btn ${_voteAnswered ? 'disabled' : ''}"
          data-opt="${opt}"
          onclick="_sendVote('${opt}')"
          ${_voteAnswered ? "disabled" : ""}>
          <span class="vote-letter" style="background:${colors[i%colors.length]};">${letters[i]}</span>
          <span>${opt}</span>
        </button>
      `).join("")}
    </div>
    ${_voteAnswered ? `<div class="vote-sent-msg">✅ Жауабыңыз жіберілді! Нәтижені күтіңіз...</div>` : ""}
  `;
}

window._sendVote = async function(option) {
  if (_voteAnswered) return;
  const roomId = getRoomId();
  const name   = window._studentName || document.getElementById("sb_studentName")?.value.trim() || "Оқушы";
  if (!roomId) return;

  _voteAnswered = true;

  try {
    await set(ref(db, `rooms/${roomId}/voteAnswers/${studentId}`), {
      name, option, time: Date.now()
    });
    showStatus("✅ Дауысыңыз жіберілді!", "ok");

    // Батырмаларды disable
    document.querySelectorAll(".vote-opt-btn").forEach(btn => {
      btn.classList.add("disabled");
      btn.disabled = true;
      if (btn.dataset.opt === option) {
        btn.style.borderColor = "#4f46e5";
        btn.style.background  = "#eef2ff";
        btn.style.color       = "#4f46e5";
      }
    });

    // Sent message
    const vc = document.getElementById("voteContent");
    if (vc) {
      const msg = document.createElement("div");
      msg.className = "vote-sent-msg";
      msg.textContent = "✅ Жауабыңыз жіберілді! Нәтижені күтіңіз...";
      vc.appendChild(msg);
    }
  } catch(e) {
    showStatus("❌ Қате: " + e.message, "error");
    _voteAnswered = false;
  }
};

// Vote нәтижесін тыңдау (мұғалім ашқанда)
function listenVoteResults() {
  const roomId = getRoomId();
  if (!roomId) return;

  onValue(ref(db, `rooms/${roomId}/voteResults`), (snap) => {
    const data = snap.val();
    if (!data || !data.show) return;

    const content = document.getElementById("voteContent");
    if (!content) return;

    const opts   = Object.keys(data.counts || {});
    const total  = Object.values(data.counts || {}).reduce((a, b) => a + b, 0) || 1;
    const colors = ["#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6"];

    let html = `<div class="vote-question">${data.question || "Нәтиже"}</div>`;
    html += '<div class="vote-result-wrap">';
    opts.forEach((opt, i) => {
      const cnt = data.counts[opt] || 0;
      const pct = Math.round((cnt / total) * 100);
      html += `
        <div class="vote-result-bar-wrap">
          <div class="vote-result-label">
            <span>${opt}</span>
            <span>${cnt} дауыс (${pct}%)</span>
          </div>
          <div class="vote-result-bar-bg">
            <div class="vote-result-bar-fill"
              style="width:${pct}%;background:${colors[i%colors.length]};"></div>
          </div>
        </div>`;
    });
    html += '</div>';
    content.innerHTML = html;
  });
}

// =====================================================
// ШАМ 22: KAHOOT-STYLE ТЕСТ —  нақты Firebase
// =====================================================

let _kahootId   = null;
let _kahootDone = false;
let _timerInterval = null;

function listenKahoot() {
  const roomId = getRoomId();
  if (!roomId) return;

  onValue(ref(db, `rooms/${roomId}/kahoot`), (snap) => {
    const data = snap.val();
    const kahootTab   = document.getElementById("kahootTab");
    const kahootBadge = document.getElementById("kahootBadge");

    if (!data || !data.active) {
      if (kahootTab) kahootTab.style.display = "none";
      if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
      return;
    }

    // Жаңа сұрақ
    if (kahootTab) kahootTab.style.display = "flex";
    if (kahootBadge) kahootBadge.style.display = "block";

    if (_kahootId !== data.time) {
      _kahootId   = data.time;
      _kahootDone = false;
      if (_timerInterval) clearInterval(_timerInterval);
    }

    // Автоматты Kahoot табына ауыстыру
    if (!_kahootDone) {
      document.querySelectorAll(".st-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".st-panel").forEach(p => p.classList.remove("active"));
      kahootTab.classList.add("active");
      document.getElementById("panel-kahoot").classList.add("active");
    }

    renderKahootUI(data);
  });
}

function renderKahootUI(data) {
  const content = document.getElementById("kahootContent");
  if (!content) return;

  const opts = data.options || { A: "A", B: "B", C: "C", D: "D" };
  const timeLimit = data.timeLimit || 30;

  content.innerHTML = `
    <div class="kahoot-timer" id="kahootTimer">${timeLimit}</div>
    <div class="kahoot-question">${data.question || "Сұрақ"}</div>
    <div class="kahoot-opts" id="kahootOpts">
      ${Object.entries(opts).map(([key, val]) => `
        <button class="kahoot-opt ${_kahootDone ? 'disabled' : ''}"
          data-k="${key}"
          onclick="_sendKahoot('${key}')"
          ${_kahootDone ? "disabled" : ""}>
          <span>${key}</span>
          <span style="font-size:12px;font-weight:600;">${val}</span>
        </button>
      `).join("")}
    </div>
    <div id="kahootResult"></div>
  `;

  // Таймер
  if (!_kahootDone) {
    let timeLeft = timeLimit;
    const timerEl = document.getElementById("kahootTimer");
    if (_timerInterval) clearInterval(_timerInterval);

    _timerInterval = setInterval(() => {
      timeLeft--;
      if (timerEl) {
        timerEl.textContent = timeLeft;
        timerEl.style.color = timeLeft <= 10 ? "#ef4444" : "#4f46e5";
      }
      if (timeLeft <= 0) {
        clearInterval(_timerInterval);
        if (!_kahootDone) {
          _kahootDone = true;
          document.querySelectorAll(".kahoot-opt").forEach(b => {
            b.classList.add("disabled"); b.disabled = true;
          });
          const result = document.getElementById("kahootResult");
          if (result) {
            result.className = "kahoot-result wrong";
            result.textContent = "⏰ Уақыт өтті!";
          }
        }
      }
    }, 1000);
  }
}

window._sendKahoot = async function(answer) {
  if (_kahootDone) return;
  _kahootDone = true;
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }

  const roomId = getRoomId();
  const name   = window._studentName || document.getElementById("sb_studentName")?.value.trim() || "Оқушы";
  const timerEl = document.getElementById("kahootTimer");
  const timeLeft = timerEl ? parseInt(timerEl.textContent) : 0;

  // Батырмаларды disable
  document.querySelectorAll(".kahoot-opt").forEach(btn => {
    btn.classList.add("disabled");
    btn.disabled = true;
    if (btn.dataset.k === answer) {
      btn.style.outline = "4px solid #818cf8";
    }
  });

  const result = document.getElementById("kahootResult");
  if (result) {
    result.className = "kahoot-result";
    result.textContent = "⏳ Дұрыс жауапты күтіңіз...";
  }

  try {
    await set(ref(db, `rooms/${roomId}/kahootAnswers/${studentId}`), {
      name, answer, timeLeft, time: Date.now()
    });
    showStatus("✅ Жауап жіберілді!", "ok");
  } catch(e) {
    showStatus("❌ " + e.message, "error");
  }

  // Дұрыс жауапты тыңдау
  onValue(ref(db, `rooms/${roomId}/kahootAnswer`), (snap) => {
    const correct = snap.val();
    if (!correct) return;
    const result2 = document.getElementById("kahootResult");
    if (!result2) return;

    document.querySelectorAll(".kahoot-opt").forEach(btn => {
      if (btn.dataset.k === correct) btn.classList.add("correct");
      else if (btn.dataset.k === answer && answer !== correct) btn.classList.add("wrong");
    });

    const isCorrect = answer === correct;
    result2.className = "kahoot-result " + (isCorrect ? "correct" : "wrong");
    result2.textContent = isCorrect ? "🎉 Дұрыс! Браво!" : `❌ Дұрыс жауап: ${correct}`;
  }, { onlyOnce: true });
};

// ── listenAll —  INIT-та барлығын тыңдау
// [Hook жинақталды —  joinRoom ішінде]

// =====================================================
// ШАМ 23: COLLABORATIVE BOARD —  student side
// =====================================================

let _collabActive = false;
let _collabNoteId = null; // Оқушының note ID
let _collabAutoTimer = null;

function listenCollab() {
  const roomId = getRoomId();
  if (!roomId) return;

  // 1. Active тыңдау
  onValue(ref(db, `rooms/${roomId}/collab/active`), (snap) => {
    _collabActive = snap.val() === true;
    updateCollabUI();

    const collabTab = document.getElementById("collabTab");
    if (collabTab) {
      collabTab.style.display = _collabActive ? "flex" : "none";
    }

    // Автоматты таб ауыстыру
    if (_collabActive) {
      document.querySelectorAll(".st-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".st-panel").forEach(p => p.classList.remove("active"));
      if (collabTab) collabTab.classList.add("active");
      const panel = document.getElementById("panel-collab");
      if (panel) panel.classList.add("active");
    }
  });

  // 2. Барлық жазбаларды тыңдау
  onValue(ref(db, `rooms/${roomId}/collab/notes`), (snap) => {
    const notes = snap.val() || {};
    renderCollabNotes(notes);
  });
}

function updateCollabUI() {
  const active   = document.getElementById("collabStatusBanner");
  const closed   = document.getElementById("collabClosedBanner");
  const writeArea = document.getElementById("collabWriteArea");
  const textarea  = document.getElementById("collabText");

  if (active) active.style.display = _collabActive ? "block" : "none";
  if (closed) closed.style.display = _collabActive ? "none" : "block";
  if (writeArea) writeArea.style.opacity = _collabActive ? "1" : "0.4";
  if (textarea) textarea.disabled = !_collabActive;
}

function renderCollabNotes(notes) {
  const list = document.getElementById("collabNotesList");
  if (!list) return;

  const entries = Object.entries(notes).sort((a,b) => (b[1].time||0) - (a[1].time||0));

  if (!entries.length) {
    list.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:16px;font-size:13px;">Жазбалар жоқ</div>`;
    return;
  }

  list.innerHTML = entries.map(([id, note]) => {
    const isOwn = id === _collabNoteId;
    return `
      <div class="collab-note-card ${isOwn ? 'collab-own' : ''}">
        <div class="collab-note-header">
          <span style="font-size:16px;">${note.avatar||"🙂"}</span>
          <span>${note.name||"Оқушы"}</span>
          ${isOwn ? '<span style="background:#eef2ff;color:#4f46e5;font-size:9px;font-weight:800;padding:1px 6px;border-radius:999px;margin-left:auto;">Менің жазбам</span>' : ''}
          <span style="margin-left:${isOwn?'0':'auto'};font-size:10px;color:#94a3b8;">
            ${note.time ? new Date(note.time).toLocaleTimeString("kk-KZ",{hour:"2-digit",minute:"2-digit"}) : ""}
          </span>
        </div>
        <div class="collab-note-text">${note.text||""}</div>
      </div>`;
  }).join("");
}

// ── Жіберу ──────────────────────────────────────────
window.sendCollabNote = async function() {
  if (!_collabActive) { showStatus("🔴 Тақта жабық!", "error"); return; }
  const roomId = getRoomId();
  const name   = window._studentName || document.getElementById("sb_studentName")?.value.trim() || "Оқушы";
  const avatar = window._studentAvatar || "🙂";
  const text   = document.getElementById("collabText")?.value.trim() || "";
  if (!text) { showStatus("Жазба жазыңыз!", "error"); return; }
  if (!roomId) { showStatus("Бөлме жоқ!", "error"); return; }

  try {
    if (_collabNoteId) {
      // Бұрынғы жазбаны жаңарту
      await set(ref(db, `rooms/${roomId}/collab/notes/${_collabNoteId}`), {
        name, avatar, text, studentId, time: Date.now()
      });
    } else {
      // Жаңа жазба
      const pushRef = await new Promise((res, rej) => {
        const r = push(ref(db, `rooms/${roomId}/collab/notes`));
        set(r, { name, avatar, text, studentId, time: Date.now() }).then(() => res(r)).catch(rej);
      });
      _collabNoteId = pushRef.key;
    }
    showStatus("✅ Жазба жіберілді!", "ok");
  } catch(e) {
    showStatus("❌ " + e.message, "error");
  }
};

// ── Автосақтау (1 сек кідіріспен) ──────────────────
window.collabAutoSave = function() {
  if (!_collabActive) return;
  if (_collabAutoTimer) clearTimeout(_collabAutoTimer);
  _collabAutoTimer = setTimeout(() => {
    const text = document.getElementById("collabText")?.value.trim() || "";
    if (!text || !_collabNoteId) return;
    const roomId = getRoomId();
    const name   = window._studentName || "Оқушы";
    const avatar = window._studentAvatar || "🙂";
    if (!roomId) return;
    set(ref(db, `rooms/${roomId}/collab/notes/${_collabNoteId}`), {
      name, avatar, text, studentId, time: Date.now()
    });
  }, 1000);
};

// joinRoom-ға hook
// [Hook жинақталды —  joinRoom ішінде]

// =====================================================
// ШАМ 24: HOMEWORK MODULE —  student side
// =====================================================

let _hwStudentData = {};
let _hwDoneIds = new Set(
  JSON.parse(localStorage.getItem("sb_hw_done") || "[]")
);

function listenHomework() {
  const roomId = getRoomId();
  if (!roomId) return;

  onValue(ref(db, `rooms/${roomId}/homework`), (snap) => {
    const data = snap.val() || {};
    _hwStudentData = data;

    const entries = Object.entries(data);
    const undone  = entries.filter(([id]) => !_hwDoneIds.has(id)).length;

    // Badge жаңарту
    const badge = document.getElementById("hwBadge");
    if (badge) {
      badge.textContent = undone;
      badge.style.display = undone > 0 ? "block" : "none";
    }

    renderStudentHomework(data);
  });
}

function renderStudentHomework(data) {
  const list = document.getElementById("hwStudentList");
  if (!list) return;

  const entries = Object.entries(data).sort((a,b) => (b[1].time||0) - (a[1].time||0));

  if (!entries.length) {
    list.innerHTML = `
      <div class="task-empty">
        <div class="task-empty-icon">📭</div>
        <div>Мұғалім үй тапсырмасы жібергенде осында шығады</div>
      </div>`;
    return;
  }

  const PRIORITY = {
    normal:    { icon:"🟢", bg:"#f0fdf4", bd:"#86efac", tx:"#14532d", label:"Жай" },
    important: { icon:"🟡", bg:"#fef3c7", bd:"#fde68a", tx:"#92400e", label:"Маңызды" },
    urgent:    { icon:"🔴", bg:"#fef2f2", bd:"#fca5a5", tx:"#7f1d1d", label:"Шұғыл" },
  };

  list.innerHTML = entries.map(([id, hw]) => {
    const ps = PRIORITY[hw.priority] || PRIORITY.normal;
    const isDone = _hwDoneIds.has(id);
    const isOverdue = hw.deadline && new Date(hw.deadline) < new Date();
    const deadlineStr = hw.deadline
      ? new Date(hw.deadline).toLocaleDateString("kk-KZ", {
          weekday:"short", day:"numeric", month:"long"
        })
      : "";

    return `
      <div class="hw-student-card" style="border-color:${isDone ? '#86efac' : ps.bd};">
        <!-- Priority badge -->
        <div class="hw-priority-badge"
          style="background:${ps.bg};color:${ps.tx};border:1px solid ${ps.bd};">
          ${ps.icon} ${ps.label}
        </div>

        <!-- Subject -->
        <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:6px;">
          ${hw.subject || "Тапсырма"}
        </div>

        <!-- Deadline -->
        ${deadlineStr ? `
          <div class="hw-deadline">
            ${isOverdue ? "⚠️" : "📅"}
            <span style="color:${isOverdue ? '#dc2626' : '#64748b'};">
              ${isOverdue ? "Мерзімі өтті! " : "Орындау мерзімі: "}
              ${deadlineStr}
            </span>
          </div>` : ""}

        <!-- Text -->
        <div style="
          font-size:14px;line-height:1.65;color:#334155;
          background:#f8f9fc;border-radius:10px;
          padding:12px;margin:10px 0;
          white-space:pre-wrap;word-break:break-word;
        ">${hw.text || ""}</div>

        <!-- Done button -->
        <button class="hw-done-btn ${isDone ? 'completed' : ''}"
          onclick="${isDone ? '' : `markHomeworkDone('${id}')`}"
          ${isDone ? 'disabled' : ''}>
          ${isDone ? "✅ Орындалды!" : "✔ Орындадым"}
        </button>
      </div>`;
  }).join("");
}

// ── Орындалды белгілеу ──────────────────────────────
window.markHomeworkDone = async function(hwId) {
  const roomId = getRoomId();
  const name   = window._studentName || document.getElementById("sb_studentName")?.value.trim() || "Оқушы";
  const avatar = window._studentAvatar || "🙂";
  if (!roomId || !hwId) return;

  try {
    // Firebase-та белгілеу
    await set(ref(db, `rooms/${roomId}/homework/${hwId}/doneBy/${studentId}`), {
      name, avatar, time: Date.now()
    });

    // localStorage-та сақтау (оффлайн үшін)
    _hwDoneIds.add(hwId);
    localStorage.setItem("sb_hw_done", JSON.stringify([..._hwDoneIds]));

    showStatus("✅ Тапсырма орындалды деп белгіленді!", "ok");
    renderStudentHomework(_hwStudentData);

    // Badge жаңарту
    const undone = Object.keys(_hwStudentData).filter(id => !_hwDoneIds.has(id)).length;
    const badge  = document.getElementById("hwBadge");
    if (badge) { badge.textContent = undone; badge.style.display = undone > 0 ? "block" : "none"; }

  } catch(e) {
    showStatus("❌ " + e.message, "error");
  }
};

// joinRoom-ға hook
// [Hook жинақталды —  joinRoom ішінде]

// =====================================================
// ШАМ 34: ALPACA RACE —  student side
// =====================================================

function renderRacePanel(race) {
  const el = document.getElementById("raceContent");
  if (!el) return;

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#713f12,#a16207,#d97706);border-radius:16px;padding:16px;margin-bottom:12px;color:white;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">🦙</div>
      <div style="font-size:16px;font-weight:800;margin-bottom:4px;">Alpaca Race!</div>
      <div style="font-size:13px;opacity:.85;">${race.question||"Жауап беру үшін жаз!"}</div>
    </div>

    <div style="background:white;border:1.5px solid #fde68a;border-radius:14px;padding:14px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;">Жауабыңды жазып жібер!</div>
      <textarea id="raceAnswer" rows="3" style="
        width:100%;padding:10px;border:1.5px solid #fde68a;border-radius:10px;
        font-size:14px;font-family:inherit;resize:none;background:#fffbeb;box-sizing:border-box;
      " placeholder="Жауабыңды жаз..."></textarea>
      <button onclick="sendRaceAnswer()" style="
        width:100%;padding:12px;border:none;border-radius:11px;
        background:linear-gradient(135deg,#a16207,#d97706);
        color:white;font-size:14px;font-weight:800;cursor:pointer;
        font-family:inherit;margin-top:8px;
        box-shadow:0 4px 12px rgba(161,98,7,0.3);
      ">🦙 Жауап жіберу</button>
    </div>

    <div id="raceMyScore" style="text-align:center;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:10px;">
      <div style="font-size:24px;font-weight:800;color:#b45309;" id="raceScoreNum">0</div>
      <div style="font-size:11px;color:#92400e;">/ ${race.trackLen||5} жауап</div>
      <div style="background:#fde68a;border-radius:999px;height:8px;overflow:hidden;margin-top:8px;">
        <div id="raceProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#f59e0b,#d97706);border-radius:999px;transition:width .5s;"></div>
      </div>
    </div>
  `;

  // Менің жауаптарымды санау
  updateRaceMyScore(race.trackLen||5);
}

function updateRaceMyScore(trackLen) {
  const roomId = getRoomId();
  if (!roomId) return;

  onValue(ref(db, `rooms/${roomId}/answers`), (snap) => {
    const answers = snap.val() || {};
    const name = window._studentName || "";
    const myCount = Object.values(answers).filter(a => a.name === name).length;

    const num  = document.getElementById("raceScoreNum");
    const bar  = document.getElementById("raceProgressBar");
    const pct  = Math.min(100, Math.round((myCount / trackLen) * 100));

    if (num) num.textContent = myCount;
    if (bar) bar.style.width = pct + "%";
  }, { onlyOnce: true });
}

window.sendRaceAnswer = async function() {
  const roomId = getRoomId();
  const text   = document.getElementById("raceAnswer")?.value.trim();
  const name   = window._studentName || document.getElementById("sb_studentName")?.value.trim() || "Оқушы";
  const avatar = window._studentAvatar || "🙂";
  if (!text || !roomId) return;

  try {
    await set(ref(db, `rooms/${roomId}/answers/${Date.now()}_${studentId}`), {
      name, avatar, text, studentId, time: Date.now()
    });
    document.getElementById("raceAnswer").value = "";
    showStatus("🦙 +1 қадам!", "ok");
  } catch(e) {
    showStatus("❌ " + e.message, "error");
  }
};

// joinRoom hook
// [Hook жинақталды —  joinRoom ішінде]

// =====================================================
// ОҚУШЫ AI CHAT — Mini ChatGPT
// Оқушы сабаққа байланысты сұрақ береді
// =====================================================

let _aiChatHistory = [];

window.sendStudentAI = async function() {
  const input = document.getElementById("aiChatInput");
  const text  = input?.value.trim();
  if (!text) return;

  input.value = "";
  input.style.height = "auto";

  // Оқушы хабарламасын қосу
  addChatMsg(text, "user");
  _aiChatHistory.push({ role: "user", content: text });

  // Жүктелу анимациясы
  const loadId = "aiLoad_" + Date.now();
  addChatMsg("...", "ai", loadId);

  try {
    // Мұғалімнің сабақ контекстін алу (мұғалімнің Firebase-тан)
    const roomId    = getRoomId();
    const subjectCtx = roomId ? "" : "";

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        lang:   "kk",
        prompt: text,
        // Жүйелік контекст — оқушы режимі
        systemHint: `Сен SmartBoardAI платформасының оқушы көмекшісісің. 
Оқушыға ${subjectCtx ? subjectCtx + " пәнінен " : ""}қысқа, нақты, ынталандырушы түрде жауап бер.
Жауапты қазақ тілінде, оқушыға түсінікті тілмен жаз.
Мысалдар мен кеңестер қос. Максимум 150 сөз.`,
      })
    });

    const data = await res.json();

    // Жүктелу хабарламасын ауыстыру
    const loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.remove();

    if (data.error === "limit_reached") {
      addChatMsg("⚠️ Тегін AI лимиті біткен. Мұғалімнің PRO аккаунты арқылы пайдаланылады.", "ai");
      return;
    }

    const answer = data.answer || "Жауап алынбады";
    addChatMsg(answer, "ai");
    _aiChatHistory.push({ role: "assistant", content: answer });

    // Тарихты шектеу (10 хабарламадан аспасын)
    if (_aiChatHistory.length > 20) {
      _aiChatHistory = _aiChatHistory.slice(-20);
    }

  } catch(e) {
    const loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.remove();
    addChatMsg("❌ Қате: интернет байланысын тексеріңіз", "ai");
  }
};

// Хабарлама қосу
function addChatMsg(text, role, id) {
  const msgs = document.getElementById("aiChatMsgs");
  if (!msgs) return;

  const isUser = role === "user";
  const isLoad = text === "...";

  const div = document.createElement("div");
  if (id) div.id = id;
  div.style.cssText = `
    display:flex;flex-direction:column;
    align-items:${isUser ? "flex-end" : "flex-start"};
    animation:card-in .2s ease;
  `;

  if (isLoad) {
    div.innerHTML = `
      <div style="background:#f0f2f8;border-radius:14px 14px 14px 4px;padding:10px 14px;display:flex;gap:4px;align-items:center;">
        <span style="width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:dot-pulse 1s ease infinite;display:inline-block;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:dot-pulse 1s ease .2s infinite;display:inline-block;"></span>
        <span style="width:6px;height:6px;border-radius:50%;background:#94a3b8;animation:dot-pulse 1s ease .4s infinite;display:inline-block;"></span>
      </div>`;
    if (!document.getElementById("dotPulseStyle")) {
      const s = document.createElement("style");
      s.id = "dotPulseStyle";
      s.textContent = "@keyframes dot-pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}";
      document.head.appendChild(s);
    }
  } else {
    div.innerHTML = `
      ${!isUser ? '<div style="font-size:10px;font-weight:700;color:#4f46e5;margin-bottom:3px;">🤖 AI Көмекші</div>' : ""}
      <div style="
        background:${isUser ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "white"};
        color:${isUser ? "white" : "#0f172a"};
        padding:10px 14px;
        border-radius:${isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px"};
        font-size:13px;line-height:1.6;max-width:88%;
        border:${isUser ? "none" : "1px solid #e2e6f0"};
        box-shadow:0 2px 8px rgba(15,23,42,0.06);
        white-space:pre-wrap;word-break:break-word;
      ">${text}</div>`;
  }

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// Жылдам сұрақтар
window.aiQuickAsk = function(q) {
  const input = document.getElementById("aiChatInput");
  if (input) {
    input.value = q;
    sendStudentAI();
  }
};
