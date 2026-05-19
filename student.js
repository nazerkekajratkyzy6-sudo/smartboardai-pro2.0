// student.js — SmartBoardAI PRO v2.0

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
  localStorage.getItem("studentId") ||
  ("std_" + Math.random().toString(36).slice(2, 9));
localStorage.setItem("studentId", studentId);

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
  const name   = $("studentName")?.value.trim() || window._studentName || "";
  const avatar = window._studentAvatar || "🙂";
  if (!roomId || !name) return;
  localStorage.setItem("studentName", name);
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
  const name   = $("studentName")?.value.trim() || window._studentName || "";
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
  const name   = $("studentName")?.value.trim() || window._studentName || "";
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
  const name   = $("studentName")?.value.trim() || window._studentName || "";
  const avatar = window._studentAvatar || "🙂";
  if (!roomId || !name) return;
  push(ref(db, `rooms/${roomId}/emotions`), { name, avatar, emoji, time: Date.now() });
  showStatus("💛 Эмоция жіберілді!", "ok");
}

// ── Send word ────────────────────────────────────────
function sendWord(wordVal) {
  const roomId = getRoomId();
  const name   = $("studentName")?.value.trim() || window._studentName || "";
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
  const ni = $("studentName");
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
