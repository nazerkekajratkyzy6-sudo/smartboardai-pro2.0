// =====================================================
// 📊 ТИІМДІЛІК МОДУЛІ — SmartBoardAI PRO
// effectiveness.js
//
// Файлды жобаның түбіріне қойыңыз (teacher.html жанына)
// teacher.html ішіне қосыңыз (firebaseConfig.js-тен КЕЙІН, teacher.js-тен КЕЙІН):
// <script type="module" src="effectiveness.js"></script>
//
// Бұл модуль "Тиімділік" батырмасын қосады.
// Ол екі дереккөзден деректі біріктіреді:
//   1) analyticsData — ағымдағы сабақ (нақты уақыт)
//   2) Firebase "progress/" — бұрынғы сабақтардың тарихы
// =====================================================

import { db, ref, onValue } from "./firebaseConfig.js";

// ── Chart.js жүктеу (бар болса қайта жүктемейді) ────
function effLoadChart(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
  s.onload = cb;
  document.head.appendChild(s);
}

// ── Модальді ашу ─────────────────────────────────────
window.openEffectivenessPanel = function () {
  if (document.getElementById("effModal")) {
    document.getElementById("effModal").style.display = "flex";
    effLoadData();
    return;
  }

  const modal = document.createElement("div");
  modal.id = "effModal";
  modal.style.cssText =
    "display:flex;position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);z-index:400;align-items:center;justify-content:center;";

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "background:#f0f2f8;border-radius:22px;width:min(1040px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(15,23,42,0.22);overflow:hidden;";

  wrap.innerHTML = `
    <div style="background:linear-gradient(135deg,#064e3b,#16a34a,#22c55e);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div>
        <div style="font-size:17px;font-weight:800;color:white;">📊 Тиімділік</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Сабақтың нәтижелілігі — нақты уақытта және тарихи деректер бойынша</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button onclick="exportEffectivenessCSV()" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;">📥 CSV</button>
        <button onclick="document.getElementById('effModal').style.display='none'" style="background:rgba(255,255,255,0.15);color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid #e2e6f0;background:white;flex-shrink:0;overflow-x:auto;">
      ${[
        ["current", "📍 Ағымдағы сабақ"],
        ["compare", "📈 Дейін / Кейін"],
        ["trend", "📅 Динамика"],
      ]
        .map(
          ([t, l], i) => `
        <button class="eff-tab" data-t="${t}" onclick="switchEffTab('${t}')" style="
          padding:11px 18px;border:none;background:transparent;cursor:pointer;
          font-size:13px;font-weight:${i === 0 ? "700" : "600"};font-family:inherit;
          color:${i === 0 ? "#16a34a" : "#64748b"};
          border-bottom:2px solid ${i === 0 ? "#16a34a" : "transparent"};
          white-space:nowrap;
        ">${l}</button>`
        )
        .join("")}
    </div>

    <div id="effContent" style="flex:1;overflow-y:auto;padding:18px 22px;">
      <div style="text-align:center;padding:40px;color:#94a3b8;">
        <div style="font-size:40px;margin-bottom:10px;">📊</div>
        <div style="font-size:14px;font-weight:600;">Жүктелуде...</div>
      </div>
    </div>
  `;

  modal.appendChild(wrap);
  document.body.appendChild(modal);

  effLoadChart(() => effLoadData());
};

// ── Tab ауыстыру ─────────────────────────────────────
window.switchEffTab = function (tab) {
  window._effTab = tab;
  document.querySelectorAll(".eff-tab").forEach((btn) => {
    const isA = btn.dataset.t === tab;
    btn.style.color = isA ? "#16a34a" : "#64748b";
    btn.style.borderBottomColor = isA ? "#16a34a" : "transparent";
    btn.style.fontWeight = isA ? "700" : "600";
  });
  effRender(tab);
};

// ── Деректерді жүктеу ────────────────────────────────
function effLoadData() {
  onValue(
    ref(db, "progress"),
    (snap) => {
      window._effHistory = snap.val() || {};
      effRender(window._effTab || "current");
    },
    { onlyOnce: true }
  );
}

// ── Негізгі рендер ───────────────────────────────────
function effRender(tab) {
  const el = document.getElementById("effContent");
  if (!el) return;

  const history = Object.values(window._effHistory || {}).sort(
    (a, b) => (b.time || 0) - (a.time || 0)
  );

  // analyticsData — teacher.js-тегі глобал объект
  const ad = window.analyticsData || { students: {}, answers: {}, photos: {}, emotions: {} };
  const students = Object.values(ad.students || {});
  const answers = Object.values(ad.answers || {});
  const photos = Object.values(ad.photos || {});
  const emotions = ad.emotions || {};

  if (tab === "current") effRenderCurrent(el, students, answers, photos, emotions, history);
  else if (tab === "compare") effRenderCompare(el, students, answers, history);
  else if (tab === "trend") effRenderTrend(el, history);
}

// ── 1. АҒЫМДАҒЫ САБАҚ ────────────────────────────────
function effRenderCurrent(el, students, answers, photos, emotions, history) {
  const answeredNames = new Set(answers.map((a) => a.name));
  const activityPct = students.length
    ? Math.round((answeredNames.size / students.length) * 100)
    : 0;

  const avgResponseSec = effAvgResponseTime(answers);
  const correctPct = effEstimateCorrectPct(answers);

  const prevLesson = history[0];
  const deltaActivity = prevLesson
    ? activityPct - (prevLesson.activityPct || 0)
    : null;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;">
      ${effKPI("👥", "Оқушылар", students.length, "#4f46e5", "#eef2ff", "#c7d2fe")}
      ${effKPI("✅", "Белсенділік", activityPct + "%", "#16a34a", "#f0fdf4", "#86efac",
        deltaActivity !== null ? effDeltaTag(deltaActivity) : "")}
      ${effKPI("⏱️", "Орт. жауап уақыты", avgResponseSec ? avgResponseSec + " сек" : "--", "#d97706", "#fef3c7", "#fde68a")}
      ${effKPI("🎯", "Шамаланған дұрыстық", correctPct !== null ? correctPct + "%" : "--", "#7c3aed", "#fdf4ff", "#e9d5ff")}
    </div>

    <!-- Дұрыс/қате % диаграммасы -->
    <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">📊 Жауаптар үлесі</div>
      <div style="display:flex;gap:18px;align-items:center;">
        <div style="width:140px;height:140px;flex-shrink:0;">
          <canvas id="effPieChart"></canvas>
        </div>
        <div style="flex:1;font-size:12px;color:#64748b;line-height:1.8;">
          <div>🟢 <b>Жауап берген:</b> ${answeredNames.size} оқушы</div>
          <div>⚪ <b>Жауап бермеген:</b> ${Math.max(students.length - answeredNames.size, 0)} оқушы</div>
          <div>📷 <b>Фото жіберген:</b> ${photos.length} оқушы</div>
          <div style="margin-top:6px;color:#94a3b8;font-size:11px;">* Дұрыс/қате үлесі мұғалімнің фото-тексеру нәтижесі негізінде шамаланады</div>
        </div>
      </div>
    </div>

    <!-- Эмоция статистикасы -->
    <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">😊 Сынып көңіл-күйі</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${Object.keys(emotions).length
          ? Object.entries(emotions)
              .sort((a, b) => b[1] - a[1])
              .map(
                ([emo, count]) => `
            <div style="background:#f8f9ff;border:1px solid #e2e6f0;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:5px;">
              <span style="font-size:16px;">${emo}</span><span style="color:#4f46e5;">${count}</span>
            </div>`
              )
              .join("")
          : '<div style="color:#94a3b8;font-size:12px;">Эмоция деректері жоқ</div>'}
      </div>
    </div>

    <!-- Оқушы кестесі -->
    <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">👥 Оқушылар бойынша егжей-тегжей</div>
      ${effStudentTable(students, answers, photos)}
    </div>
  `;

  // Pie chart
  requestAnimationFrame(() => {
    const canvas = document.getElementById("effPieChart");
    if (!canvas || !window.Chart) return;
    if (window._effPieInstance) window._effPieInstance.destroy();
    window._effPieInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Жауап берген", "Жауап бермеген"],
        datasets: [
          {
            data: [answeredNames.size, Math.max(students.length - answeredNames.size, 0)],
            backgroundColor: ["#16a34a", "#e5e7eb"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        cutout: "65%",
      },
    });
  });
}

// ── 2. ДЕЙІН / КЕЙІН САЛЫСТЫРУ ───────────────────────
function effRenderCompare(el, students, answers, history) {
  if (history.length < 1) {
    el.innerHTML = `
      <div style="text-align:center;padding:48px;color:#94a3b8;">
        <div style="font-size:44px;margin-bottom:12px;">📈</div>
        <div style="font-size:14px;font-weight:600;">Салыстыру үшін кем дегенде 1 сақталған сабақ керек</div>
        <div style="font-size:12px;margin-top:6px;">«Оқушы прогресі» панелінде «💾 Сабақты сақтау» батырмасын басыңыз</div>
      </div>`;
    return;
  }

  const prev = history[0];
  const ad = window.analyticsData || { students: {}, answers: {} };
  const curStudents = Object.values(ad.students || {});
  const curAnswers = Object.values(ad.answers || {});
  const curActivity = curStudents.length
    ? Math.round((new Set(curAnswers.map((a) => a.name)).size / curStudents.length) * 100)
    : 0;

  const rows = [
    ["👥 Оқушы саны", prev.studentCount || 0, curStudents.length],
    ["✅ Белсенділік (%)", prev.activityPct || 0, curActivity],
    ["✏️ Жауап саны", Object.keys(prev.students || {}).filter((k) => prev.students[k]?.answered).length, new Set(curAnswers.map((a) => a.name)).size],
  ];

  el.innerHTML = `
    <div style="background:white;border-radius:16px;padding:18px;border:1px solid #e2e6f0;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">📈 Соңғы сақталған сабақ vs Қазіргі сабақ</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:16px;">Алдыңғы: ${prev.topic || "Сабақ"} (${prev.date || "--"})</div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        ${rows
          .map(([label, before, after]) => {
            const diff = after - before;
            const diffColor = diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : "#94a3b8";
            const diffIcon = diff > 0 ? "▲" : diff < 0 ? "▼" : "■";
            const maxVal = Math.max(before, after, 1);
            return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#334155;margin-bottom:6px;">
                <span>${label}</span>
                <span style="color:${diffColor};">${diffIcon} ${Math.abs(diff)}</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <div style="flex:1;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;">Дейін: ${before}</div>
                  <div style="background:#e5e7eb;border-radius:999px;height:10px;overflow:hidden;">
                    <div style="background:#94a3b8;height:100%;width:${(before / maxVal) * 100}%;border-radius:999px;"></div>
                  </div>
                </div>
                <div style="flex:1;">
                  <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;">Кейін: ${after}</div>
                  <div style="background:#e5e7eb;border-radius:999px;height:10px;overflow:hidden;">
                    <div style="background:${diffColor};height:100%;width:${(after / maxVal) * 100}%;border-radius:999px;"></div>
                  </div>
                </div>
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </div>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:14px;padding:14px 16px;font-size:12px;color:#166534;">
      💡 <b>Түсіндірме:</b> бұл салыстыру SmartBoardAI PRO арқылы өткен соңғы екі сабақтың нәтижесін көрсетеді.
      Тұрақты оң динамика — платформаның тиімділігінің көрсеткіші.
    </div>
  `;
}

// ── 3. ДИНАМИКА (барлық сабақтар тарихы) ─────────────
function effRenderTrend(el, history) {
  if (history.length < 2) {
    el.innerHTML = `
      <div style="text-align:center;padding:48px;color:#94a3b8;">
        <div style="font-size:44px;margin-bottom:12px;">📅</div>
        <div style="font-size:14px;font-weight:600;">Динамика графигі үшін кем дегенде 2 сабақ керек</div>
        <div style="font-size:12px;margin-top:6px;">Қазір сақталған: ${history.length} сабақ</div>
      </div>`;
    return;
  }

  const sorted = [...history].sort((a, b) => (a.time || 0) - (b.time || 0));

  el.innerHTML = `
    <div style="background:white;border-radius:16px;padding:18px;border:1px solid #e2e6f0;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📈 Белсенділік динамикасы (барлық сабақтар)</div>
      <div style="height:240px;"><canvas id="effTrendChart"></canvas></div>
    </div>

    <div style="background:white;border-radius:16px;padding:16px;border:1px solid #e2e6f0;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">📅 Сабақтар тізімі</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f8f9ff;">
            ${["Күні", "Тақырып", "Оқушы", "Белсенділік"]
              .map(
                (h) =>
                  `<th style="padding:8px 10px;text-align:left;font-weight:700;color:#64748b;border-bottom:1px solid #e2e6f0;">${h}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${[...history]
            .map(
              (l) => `
            <tr>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${l.date || "--"}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;">${l.topic || "Сабақ"}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${l.studentCount || 0}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">
                <span style="background:${(l.activityPct||0)>=70?'#f0fdf4':(l.activityPct||0)>=40?'#fef3c7':'#fef2f2'};color:${(l.activityPct||0)>=70?'#16a34a':(l.activityPct||0)>=40?'#d97706':'#dc2626'};padding:2px 8px;border-radius:999px;font-weight:700;">${l.activityPct || 0}%</span>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  requestAnimationFrame(() => {
    const canvas = document.getElementById("effTrendChart");
    if (!canvas || !window.Chart) return;
    if (window._effTrendInstance) window._effTrendInstance.destroy();
    window._effTrendInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: sorted.map((l) => l.date || ""),
        datasets: [
          {
            label: "Белсенділік %",
            data: sorted.map((l) => l.activityPct || 0),
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.1)",
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#16a34a",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } },
      },
    });
  });
}

// ── Көмекші функциялар ───────────────────────────────
function effKPI(icon, label, val, color, bg, bd, extra = "") {
  return `
    <div style="background:${bg};border:1.5px solid ${bd};border-radius:16px;padding:14px 16px;position:relative;">
      <div style="font-size:22px;margin-bottom:4px;">${icon}</div>
      <div style="font-size:22px;font-weight:800;color:${color};">${val}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${label}</div>
      ${extra}
    </div>`;
}

function effDeltaTag(delta) {
  if (delta === 0) return "";
  const up = delta > 0;
  return `<div style="position:absolute;top:10px;right:10px;font-size:10px;font-weight:800;color:${up ? "#16a34a" : "#dc2626"};">${up ? "▲" : "▼"}${Math.abs(delta)}%</div>`;
}

function effAvgResponseTime(answers) {
  if (!answers.length) return null;
  const times = answers.map((a) => a.time).filter(Boolean).sort((a, b) => a - b);
  if (times.length < 2) return null;
  const diffs = [];
  for (let i = 1; i < times.length; i++) diffs.push((times[i] - times[i - 1]) / 1000);
  const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  return Math.round(avg);
}

function effEstimateCorrectPct(answers) {
  if (!answers.length) return null;
  // Мұғалім фото-тексеру нәтижесін пайдаланса осында байланыстырылады
  const graded = answers.filter((a) => typeof a.correct === "boolean");
  if (!graded.length) return null;
  const correctCount = graded.filter((a) => a.correct).length;
  return Math.round((correctCount / graded.length) * 100);
}

function effStudentTable(students, answers, photos) {
  if (!students.length) {
    return `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">Оқушылар жоқ</div>`;
  }
  return `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f8f9ff;">
          ${["Оқушы", "Жауап", "Фото", "Статус"]
            .map(
              (h) =>
                `<th style="padding:7px 10px;text-align:left;font-weight:700;color:#64748b;border-bottom:1px solid #e2e6f0;">${h}</th>`
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${students
          .map((s) => {
            const ans = answers.find((a) => a.name === s.name);
            const photo = photos.find((p) => p.name === s.name);
            return `
            <tr>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;">
                <span>${s.avatar || "🙂"}</span>${s.name || "--"}
              </td>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${ans ? "✅" : "—"}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${photo ? "📷" : "—"}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">
                <span style="background:${ans ? "#f0fdf4" : "#fef2f2"};color:${ans ? "#16a34a" : "#dc2626"};padding:2px 8px;border-radius:999px;font-weight:700;font-size:11px;">${ans ? "Белсенді" : "Күтуде"}</span>
              </td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

// ── CSV экспорт ──────────────────────────────────────
window.exportEffectivenessCSV = function () {
  const history = Object.values(window._effHistory || {}).sort((a, b) => (b.time || 0) - (a.time || 0));
  if (!history.length) {
    if (window.showToast) window.showToast("⚠️ Тарихи деректер жоқ", "warn");
    return;
  }
  const rows = [["Күні", "Тақырып", "Оқушы саны", "Белсенділік %"]];
  history.forEach((l) => {
    rows.push([l.date || "--", l.topic || "Сабақ", l.studentCount || 0, l.activityPct || 0]);
  });
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `тиімділік_есебі_${new Date().toLocaleDateString("kk-KZ").replace(/\./g, "-")}.csv`;
  a.click();
};
