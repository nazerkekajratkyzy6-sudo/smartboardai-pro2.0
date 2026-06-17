// =====================================================
// access_tracker.js — SmartBoardAI PRO
// Файлды жобаның түбіріне қойыңыз (teacher.html жанына)
// teacher.html ішіне қосыңыз:
// <script type="module" src="access_tracker.js"></script>
// =====================================================

import {
  auth, db, onAuthStateChanged, ref, set, get
} from "./firebaseConfig.js";

// ── Шексіз рұқсат тізімі (login.html-мен бірдей) ──
const UNLIMITED_EMAILS = [
  "naz-erke_k@mail.ru",
  // "жаңа_адам@mail.ru", ← жаңа адам қосу үшін
];

// ── Қолжетімділік аяқталды экраны ────────────────────
function showAccessEndedOverlay() {
  if (document.getElementById("accessEndedOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "accessEndedOverlay";
  overlay.style.cssText = `
    position:fixed;inset:0;
    background:rgba(15,23,42,0.92);
    backdrop-filter:blur(8px);
    z-index:99999;
    display:flex;align-items:center;justify-content:center;
    padding:24px;
  `;
  overlay.innerHTML = `
    <div style="
      background:white;border-radius:28px;
      padding:44px 36px;max-width:420px;width:100%;
      box-shadow:0 40px 80px rgba(0,0,0,0.5);
      text-align:center;
    ">
      <div style="font-size:64px;margin-bottom:16px;">⏰</div>
      <div style="
        display:inline-block;
        background:#fef3c7;color:#92400e;
        font-size:11px;font-weight:700;
        padding:4px 12px;border-radius:999px;
        margin-bottom:16px;border:1px solid #fde68a;
      ">Қолжетімділік аяқталды</div>
      <div style="font-size:22px;font-weight:800;color:#0f172a;margin-bottom:12px;">
        Сынақ сабағыңыз аяқталды
      </div>
      <div style="font-size:14px;color:#64748b;line-height:1.7;margin-bottom:28px;">
        SmartBoardAI PRO платформасын толық пайдалану үшін авторға хабарласыңыз.
        Толық нұсқада барлық функциялар шексіз қолжетімді болады.
      </div>
      <a href="mailto:naz-erke_k@mail.ru" style="
        display:inline-block;
        background:linear-gradient(135deg,#4f46e5,#7c3aed);
        color:white;padding:14px 32px;border-radius:14px;
        font-size:15px;font-weight:800;text-decoration:none;
        box-shadow:0 6px 20px rgba(79,70,229,0.4);
        margin-bottom:12px;
      ">✉️ naz-erke_k@mail.ru</a>
      <div style="font-size:12px;color:#94a3b8;margin-top:8px;">
        немесе WhatsApp: +7 ___________
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function markAccessUsed(uid) {
  try {
    await set(ref(db, `users/${uid}/accessUsed`), true);
  } catch(e) {
    console.error("accessUsed белгілеу қатесі:", e);
  }
}

let accessTimer = null;
const ACCESS_DURATION_MS = 30 * 60 * 1000; // 30 минут

function startAccessTimer(uid) {
  const startKey = "sb_access_start";
  const existing = localStorage.getItem(startKey);

  if (!existing) {
    localStorage.setItem(startKey, Date.now().toString());
  }

  function checkTime() {
    const start   = parseInt(localStorage.getItem(startKey) || "0");
    const elapsed = Date.now() - start;
    const left    = ACCESS_DURATION_MS - elapsed;

    if (left <= 0) {
      clearInterval(accessTimer);
      markAccessUsed(uid);
      showAccessEndedOverlay();
      return;
    }

    if (left <= 5 * 60 * 1000 && left > (5 * 60 * 1000 - 15000)) {
      if (window.showToast) {
        window.showToast("⏰ Сынақ уақытыңыз 5 минутта аяқталады!", "warn");
      }
    }
  }

  accessTimer = setInterval(checkTime, 10000);
  checkTime();
}

const _origCloseRoom = window.closeRoom;
if (typeof _origCloseRoom === "function") {
  window.closeRoom = async function() {
    const user = auth?.currentUser;
    if (user && !UNLIMITED_EMAILS.includes(user.email)) {
      await markAccessUsed(user.uid);
    }
    _origCloseRoom();
  };
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  if (UNLIMITED_EMAILS.includes(user.email)) return;

  try {
    const snap = await get(ref(db, `users/${user.uid}/accessUsed`));
    if (snap.val() === true) {
      showAccessEndedOverlay();
      return;
    }
  } catch {}

  startAccessTimer(user.uid);
});
