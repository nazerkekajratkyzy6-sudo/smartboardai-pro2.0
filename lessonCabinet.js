// =====================================================
// TEACHER CABINET — lessonCabinet.js
// SmartBoardAI PRO
//
// Функциялар:
//   - saveLesson()       — сабақты Firebase-та сақтау
//   - loadLesson(id)     — сабақты жүктеу
//   - listLessons()      — барлық сабақтар тізімі
//   - deleteLesson(id)   — жою
//   - duplicateLesson(id)— көшіру
//   - openCabinet()      — Cabinet модалін ашу
//   - closeCabinet()     — жабу
//   - autoSave()         — автосақтау (30 сек)
//
// Firebase path:
//   users/{teacherId}/lessons/{lessonId}
// =====================================================

import {
  db,
  auth,
  ref,
  set,
  push,
  get,
  onAuthStateChanged
} from "./firebaseConfig.js";

// ─── Сыртқы state (teacher.js-тен алынады) ───────
// window.getTeacherState() → { pages, currentPageIndex }
// window.setTeacherState(state) → мемлекетті орнату
// ─────────────────────────────────────────────────

let currentTeacherId = null;
let autoSaveInterval = null;
let currentLessonId  = null;   // қазіргі ашық сабақ

// ─── Auth-тан userId аламыз ───────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentTeacherId = user.uid;
    startAutoSave();
  }
});

// =====================================================
// САБАҚТЫ САҚТАУ
// =====================================================
async function saveLesson(title = null, subject = "", grade = "") {
  if (!currentTeacherId) {
    showCabinetMsg("⚠️ Авторизациядан өтіңіз!", "error");
    return null;
  }

  // Мемлекетті teacher.js-тен аламыз
  const state = window.getTeacherState ? window.getTeacherState() : null;
  if (!state) {
    showCabinetMsg("⚠️ Доска деректері табылмады!", "error");
    return null;
  }

  const now = Date.now();
  const lessonTitle = title || `Сабақ ${new Date(now).toLocaleDateString("kk-KZ")}`;

  const lessonData = {
    title:     lessonTitle,
    subject:   subject,
    grade:     grade,
    createdAt: currentLessonId ? (await getLessonCreatedAt()) : now,
    updatedAt: now,
    pages:     state.pages,
    currentPageIndex: state.currentPageIndex,
    version:   "2.0",
  };

  try {
    if (currentLessonId) {
      // Бар сабақты жаңарту
      const lessonRef = ref(db, `users/${currentTeacherId}/lessons/${currentLessonId}`);
      await set(lessonRef, lessonData);
      showCabinetMsg("✅ Сабақ сақталды!", "success");
      return currentLessonId;
    } else {
      // Жаңа сабақ жасау
      const lessonsRef = ref(db, `users/${currentTeacherId}/lessons`);
      const newRef = push(lessonsRef);
      await set(newRef, lessonData);
      currentLessonId = newRef.key;
      showCabinetMsg("✅ Жаңа сабақ сақталды!", "success");
      return currentLessonId;
    }
  } catch (err) {
    console.error("Сабақ сақтау қатесі:", err);
    showCabinetMsg("❌ Сақтау қатесі!", "error");
    return null;
  }
}

// =====================================================
// САБАҚТЫ ЖҮКТЕУ
// =====================================================
async function loadLesson(lessonId) {
  if (!currentTeacherId) return;

  try {
    const snap = await get(ref(db, `users/${currentTeacherId}/lessons/${lessonId}`));
    if (!snap.exists()) {
      showCabinetMsg("⚠️ Сабақ табылмады!", "error");
      return;
    }

    const data = snap.val();

    // teacher.js state-ті жаңарту
    if (window.setTeacherState) {
      window.setTeacherState({
        pages:            data.pages || [{ id: "page_1", blocks: [] }],
        currentPageIndex: data.currentPageIndex || 0,
      });
    }

    currentLessonId = lessonId;
    showCabinetMsg(`📂 "${data.title}" жүктелді!`, "success");
    closeCabinet();
  } catch (err) {
    console.error("Жүктеу қатесі:", err);
    showCabinetMsg("❌ Жүктеу қатесі!", "error");
  }
}

// =====================================================
// САБАҚТАР ТІЗІМІН АЛУ
// =====================================================
async function listLessons() {
  if (!currentTeacherId) return [];

  try {
    const snap = await get(ref(db, `users/${currentTeacherId}/lessons`));
    if (!snap.exists()) return [];

    const raw = snap.val();
    return Object.entries(raw)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error("Тізім қатесі:", err);
    return [];
  }
}

// =====================================================
// САБАҚТЫ ЖОЮ
// =====================================================
async function deleteLesson(lessonId) {
  if (!currentTeacherId) return;
  if (!confirm("Сабақты жоясыз ба?")) return;

  try {
    await set(ref(db, `users/${currentTeacherId}/lessons/${lessonId}`), null);
    if (currentLessonId === lessonId) currentLessonId = null;
    showCabinetMsg("🗑 Сабақ жойылды", "info");
    await renderLessonList();
  } catch (err) {
    console.error("Жою қатесі:", err);
  }
}

// =====================================================
// САБАҚТЫ КӨШІРУ
// =====================================================
async function duplicateLesson(lessonId) {
  if (!currentTeacherId) return;

  try {
    const snap = await get(ref(db, `users/${currentTeacherId}/lessons/${lessonId}`));
    if (!snap.exists()) return;

    const data = snap.val();
    const now  = Date.now();
    const copy = {
      ...data,
      title:     `${data.title} (көшірме)`,
      createdAt: now,
      updatedAt: now,
    };

    const lessonsRef = ref(db, `users/${currentTeacherId}/lessons`);
    const newRef = push(lessonsRef);
    await set(newRef, copy);
    showCabinetMsg("📋 Сабақ көшірілді!", "success");
    await renderLessonList();
  } catch (err) {
    console.error("Көшіру қатесі:", err);
  }
}

// =====================================================
// ЖАҢА БОС САБАҚ
// =====================================================
function newLesson() {
  if (!confirm("Қазіргі сабақ тазаланады. Жалғастырасыз ба?")) return;

  if (window.setTeacherState) {
    window.setTeacherState({
      pages: [{ id: "page_1", blocks: [] }],
      currentPageIndex: 0,
    });
  }
  currentLessonId = null;
  showCabinetMsg("🆕 Жаңа сабақ бастауға дайын!", "info");
  closeCabinet();
}

// =====================================================
// АВТОСАҚТАУ (30 секунд)
// =====================================================
function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(async () => {
    if (currentLessonId) {
      await saveLesson();
    }
  }, 30000);
}

// =====================================================
// createdAt алу (жаңарту кезінде)
// =====================================================
async function getLessonCreatedAt() {
  if (!currentLessonId || !currentTeacherId) return Date.now();
  try {
    const snap = await get(ref(db, `users/${currentTeacherId}/lessons/${currentLessonId}/createdAt`));
    return snap.exists() ? snap.val() : Date.now();
  } catch { return Date.now(); }
}

// =====================================================
// CABINET MODAL — ашу
// =====================================================
async function openCabinet() {
  let modal = document.getElementById("cabinetModal");
  if (!modal) {
    modal = buildCabinetModal();
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
  await renderLessonList();
}

// =====================================================
// CABINET MODAL — жабу
// =====================================================
function closeCabinet() {
  const modal = document.getElementById("cabinetModal");
  if (modal) modal.style.display = "none";
}

// =====================================================
// CABINET MODAL — HTML жасау
// =====================================================
function buildCabinetModal() {
  const modal = document.createElement("div");
  modal.id = "cabinetModal";
  modal.style.cssText = `
    position:fixed; inset:0;
    background:rgba(15,23,42,0.5);
    backdrop-filter:blur(4px);
    display:none; align-items:center;
    justify-content:center; z-index:200;
  `;

  modal.innerHTML = `
    <div style="
      background:#fff; border-radius:20px;
      width:min(720px,95vw); max-height:85vh;
      display:flex; flex-direction:column;
      box-shadow:0 20px 60px rgba(0,0,0,0.18);
      overflow:hidden;
    ">

      <!-- HEADER -->
      <div style="
        display:flex; align-items:center;
        justify-content:space-between;
        padding:18px 22px 14px;
        border-bottom:1px solid #e5e7eb;
        background:linear-gradient(135deg,#eef2ff,#f5f3ff);
      ">
        <div>
          <div style="font-size:18px;font-weight:800;color:#3730a3;">
            📚 Менің сабақтарым
          </div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">
            Teacher Cabinet — SmartBoardAI PRO
          </div>
        </div>
        <button onclick="closeCabinet()" style="
          background:#fee2e2;color:#dc2626;
          border:none;border-radius:8px;
          padding:6px 12px;font-weight:700;
          cursor:pointer;font-size:13px;
        ">✕ Жабу</button>
      </div>

      <!-- ACTION BUTTONS -->
      <div style="
        display:flex;gap:8px;padding:14px 22px;
        border-bottom:1px solid #f3f4f6;
        flex-wrap:wrap;
      ">
        <button onclick="saveCurrentLesson()" style="
          background:linear-gradient(135deg,#4f46e5,#818cf8);
          color:white;border:none;border-radius:10px;
          padding:9px 16px;font-weight:700;
          font-size:13px;cursor:pointer;
          box-shadow:0 3px 10px rgba(79,70,229,0.3);
        ">💾 Ағымдағы сабақты сақтау</button>

        <button onclick="newLesson()" style="
          background:#f0fdf4;color:#15803d;
          border:1px solid #bbf7d0;border-radius:10px;
          padding:9px 16px;font-weight:700;
          font-size:13px;cursor:pointer;
        ">🆕 Жаңа сабақ</button>

        <div style="flex:1;"></div>

        <div style="position:relative;">
          <input id="cabinetSearch" type="text" placeholder="🔍 Іздеу..."
            oninput="filterLessons(this.value)"
            style="
              padding:8px 12px;border:1px solid #e5e7eb;
              border-radius:10px;font-size:13px;
              width:180px;outline:none;
            ">
        </div>
      </div>

      <!-- SAVE FORM (жасырын, сақтау батырмасы басылғанда ашылады) -->
      <div id="cabinetSaveForm" style="
        display:none;padding:14px 22px;
        background:#fafafa;border-bottom:1px solid #e5e7eb;
      ">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
          <div style="flex:2;min-width:180px;">
            <label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;">
              САБАҚ АТАУЫ
            </label>
            <input id="lessonTitleInput" type="text" placeholder="Мысалы: Квадрат теңдеу — 8-сынып"
              style="
                width:100%;padding:8px 12px;
                border:1px solid #d1d5db;border-radius:8px;
                font-size:13px;outline:none;
              ">
          </div>
          <div style="flex:1;min-width:120px;">
            <label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;">
              ПӘН
            </label>
            <input id="lessonSubjectInput" type="text" placeholder="Математика"
              style="
                width:100%;padding:8px 12px;
                border:1px solid #d1d5db;border-radius:8px;
                font-size:13px;outline:none;
              ">
          </div>
          <div style="flex:1;min-width:80px;">
            <label style="font-size:11px;font-weight:700;color:#6b7280;display:block;margin-bottom:4px;">
              СЫНЫП
            </label>
            <input id="lessonGradeInput" type="text" placeholder="8"
              style="
                width:100%;padding:8px 12px;
                border:1px solid #d1d5db;border-radius:8px;
                font-size:13px;outline:none;
              ">
          </div>
          <button onclick="confirmSaveLesson()" style="
            background:#4f46e5;color:white;
            border:none;border-radius:8px;
            padding:9px 16px;font-weight:700;
            font-size:13px;cursor:pointer;
          ">✅ Сақтау</button>
          <button onclick="document.getElementById('cabinetSaveForm').style.display='none'" style="
            background:#f3f4f6;color:#374151;
            border:1px solid #e5e7eb;border-radius:8px;
            padding:9px 12px;font-size:13px;cursor:pointer;
          ">Болдырмау</button>
        </div>
      </div>

      <!-- ХАБАРЛАМА -->
      <div id="cabinetMsg" style="
        display:none;padding:8px 22px;
        font-size:13px;font-weight:600;
      "></div>

      <!-- САБАҚТАР ТІЗІМІ -->
      <div id="lessonListWrap" style="
        flex:1;overflow-y:auto;padding:14px 22px;
      ">
        <div style="text-align:center;color:#9ca3af;padding:30px;">
          ⏳ Жүктелуде...
        </div>
      </div>

    </div>
  `;

  // Сыртты бассаңыз жабылады
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeCabinet();
  });

  return modal;
}

// =====================================================
// САБАҚТАР ТІЗІМІН RENDER
// =====================================================
let allLessons = [];

async function renderLessonList(filter = "") {
  const wrap = document.getElementById("lessonListWrap");
  if (!wrap) return;

  wrap.innerHTML = `<div style="text-align:center;color:#9ca3af;padding:20px;">⏳ Жүктелуде...</div>`;

  allLessons = await listLessons();

  const filtered = filter
    ? allLessons.filter(l =>
        l.title?.toLowerCase().includes(filter.toLowerCase()) ||
        l.subject?.toLowerCase().includes(filter.toLowerCase()) ||
        l.grade?.toLowerCase().includes(filter.toLowerCase())
      )
    : allLessons;

  if (!filtered.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:40px;margin-bottom:12px;">📭</div>
        <div style="color:#9ca3af;font-size:14px;">
          ${filter ? "Іздеу нәтижесі табылмады" : "Сақталған сабақтар жоқ.<br>Жаңа сабақты сақтаңыз!"}
        </div>
      </div>`;
    return;
  }

  wrap.innerHTML = filtered.map(lesson => {
    const date     = lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleDateString("kk-KZ") : "—";
    const time     = lesson.updatedAt ? new Date(lesson.updatedAt).toLocaleTimeString("kk-KZ", { hour:"2-digit", minute:"2-digit" }) : "";
    const pages    = lesson.pages?.length || 1;
    const blocks   = (lesson.pages || []).reduce((s, p) => s + (p.blocks?.length || 0), 0);
    const isCurrent = lesson.id === currentLessonId;

    return `
      <div style="
        background:${isCurrent ? "#eef2ff" : "#f9fafb"};
        border:1px solid ${isCurrent ? "#c7d2fe" : "#e5e7eb"};
        border-radius:14px;padding:14px 16px;
        margin-bottom:10px;
        transition:all 0.15s ease;
      "
      onmouseover="this.style.borderColor='#a5b4fc'"
      onmouseout="this.style.borderColor='${isCurrent ? "#c7d2fe" : "#e5e7eb"}'">

        <div style="display:flex;align-items:flex-start;gap:12px;">

          <!-- Иконка -->
          <div style="
            width:42px;height:42px;border-radius:12px;
            background:linear-gradient(135deg,#eef2ff,#e0e7ff);
            display:flex;align-items:center;
            justify-content:center;font-size:20px;
            flex-shrink:0;
          ">📖</div>

          <!-- Мәліметтер -->
          <div style="flex:1;min-width:0;">
            <div style="
              font-size:14px;font-weight:700;
              color:#111827;margin-bottom:3px;
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            ">
              ${lesson.title || "Атсыз сабақ"}
              ${isCurrent ? '<span style="background:#4f46e5;color:white;font-size:10px;padding:2px 7px;border-radius:999px;margin-left:6px;">Ашық</span>' : ""}
            </div>
            <div style="font-size:12px;color:#6b7280;display:flex;gap:10px;flex-wrap:wrap;">
              ${lesson.subject ? `<span>📚 ${lesson.subject}</span>` : ""}
              ${lesson.grade   ? `<span>🎓 ${lesson.grade}-сынып</span>` : ""}
              <span>📄 ${pages} бет</span>
              <span>🧩 ${blocks} блок</span>
              <span>🕐 ${date} ${time}</span>
            </div>
          </div>

          <!-- Батырмалар -->
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button onclick="loadLesson('${lesson.id}')" title="Ашу" style="
              background:#4f46e5;color:white;
              border:none;border-radius:8px;
              padding:7px 12px;font-size:12px;
              font-weight:700;cursor:pointer;
            ">📂 Ашу</button>

            <button onclick="duplicateLesson('${lesson.id}')" title="Көшіру" style="
              background:#f0fdf4;color:#15803d;
              border:1px solid #bbf7d0;border-radius:8px;
              padding:7px 10px;font-size:14px;cursor:pointer;
            ">📋</button>

            <button onclick="deleteLesson('${lesson.id}')" title="Жою" style="
              background:#fef2f2;color:#dc2626;
              border:1px solid #fecaca;border-radius:8px;
              padding:7px 10px;font-size:14px;cursor:pointer;
            ">🗑</button>
          </div>
        </div>

      </div>
    `;
  }).join("");
}

// Іздеу filter
window.filterLessons = function(val) {
  renderLessonList(val);
};

// =====================================================
// САҚТАУ БАТЫРМАСЫН БАСҚАНДА
// =====================================================
window.saveCurrentLesson = function() {
  const form = document.getElementById("cabinetSaveForm");
  if (!form) return;

  // Егер ашық сабақ бар болса — атын толтырамыз
  if (currentLessonId && allLessons.length) {
    const current = allLessons.find(l => l.id === currentLessonId);
    if (current) {
      const titleInput = document.getElementById("lessonTitleInput");
      const subInput   = document.getElementById("lessonSubjectInput");
      const gradeInput = document.getElementById("lessonGradeInput");
      if (titleInput) titleInput.value = current.title || "";
      if (subInput)   subInput.value   = current.subject || "";
      if (gradeInput) gradeInput.value = current.grade || "";
    }
  }

  form.style.display = form.style.display === "none" ? "block" : "none";
};

window.confirmSaveLesson = async function() {
  const title   = document.getElementById("lessonTitleInput")?.value.trim();
  const subject = document.getElementById("lessonSubjectInput")?.value.trim();
  const grade   = document.getElementById("lessonGradeInput")?.value.trim();

  if (!title) {
    showCabinetMsg("⚠️ Сабақ атауын жазыңыз!", "error");
    return;
  }

  await saveLesson(title, subject, grade);
  document.getElementById("cabinetSaveForm").style.display = "none";
  await renderLessonList();
};

// =====================================================
// ХАБАРЛАМА КӨРСЕТУ
// =====================================================
function showCabinetMsg(text, type = "info") {
  const colors = {
    success: { bg: "#f0fdf4", color: "#15803d" },
    error:   { bg: "#fef2f2", color: "#dc2626" },
    info:    { bg: "#eef2ff", color: "#3730a3" },
  };
  const c = colors[type] || colors.info;

  const msg = document.getElementById("cabinetMsg");
  if (msg) {
    msg.style.display  = "block";
    msg.style.background = c.bg;
    msg.style.color    = c.color;
    msg.textContent    = text;
    setTimeout(() => { if (msg) msg.style.display = "none"; }, 3000);
  }

  // Сондай-ақ teacher.html-дегі status bar-да да көрсету
  const statusBar = document.getElementById("cabinetStatus");
  if (statusBar) {
    statusBar.textContent = text;
    statusBar.style.color = c.color;
    setTimeout(() => { statusBar.textContent = ""; }, 4000);
  }
}

// =====================================================
// GLOBAL exports (window арқылы)
// =====================================================
window.openCabinet     = openCabinet;
window.closeCabinet    = closeCabinet;
window.loadLesson      = loadLesson;
window.deleteLesson    = deleteLesson;
window.duplicateLesson = duplicateLesson;
window.newLesson       = newLesson;
window.saveLesson      = saveLesson;
