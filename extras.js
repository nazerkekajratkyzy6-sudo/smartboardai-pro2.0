// =====================================================
// extras.js - SmartBoardAI PRO
// Жаңа мүмкіндіктер - оригинал кодты бұзбайды
// =====================================================

// Firebase teacher.js арқылы жүктеледі

// ── Helpers ──────────────────────────────────────────
const _$ = (id) => document.getElementById(id);

// Draggable widget жасаушы
function createWidget({ id, title, icon, color, width = 240, html, onMount }) {
  const existing = $(id);
  if (existing) { existing.style.zIndex = 600; return existing; }

  const w = document.createElement("div");
  w.id = id;
  w.style.cssText = `
    position:fixed; left:160px; top:120px;
    width:${width}px; background:#fff;
    border-radius:18px;
    box-shadow:0 10px 36px rgba(15,23,42,0.18);
    border:1px solid #e2e6f0; z-index:500;
    overflow:hidden; animation:modal-in .2s ease;
    user-select:none;
  `;
  w.innerHTML = `
    <div class="wh" style="
      background:${color || "linear-gradient(135deg,#4f46e5,#818cf8)"};
      padding:9px 12px; cursor:move;
      display:flex; align-items:center; justify-content:space-between;
    ">
      <span style="color:white;font-size:13px;font-weight:700;">${icon} ${title}</span>
      <button onclick="document.getElementById('${id}').remove()" style="
        background:rgba(255,255,255,0.2);color:white;border:none;
        border-radius:6px;width:22px;height:22px;font-size:13px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
      ">✕</button>
    </div>
    <div style="padding:14px;">${html}</div>`;

  document.body.appendChild(w);

  // Drag
  const header = w.querySelector(".wh");
  let ox=0, oy=0;
  header.addEventListener("mousedown", (e) => {
    ox = e.clientX - w.offsetLeft;
    oy = e.clientY - w.offsetTop;
    const mm = (e2) => { w.style.left=(e2.clientX-ox)+"px"; w.style.top=(e2.clientY-oy)+"px"; };
    const mu = () => { document.removeEventListener("mousemove",mm); document.removeEventListener("mouseup",mu); };
    document.addEventListener("mousemove", mm);
    document.addEventListener("mouseup", mu);
  });

  if (onMount) setTimeout(() => onMount(w), 60);
  return w;
}

// =====================================================
// ЖАҢА БАТЫРМАЛАРДЫ TOPBAR-ГА ҚОС — ӨШІРІЛДІ
// teacher.html-дың өзінде осы батырмалардың (Жазба,
// Прожектор, Жасыру, Құралдар, Фон, Сурет) толық,
// дайын нұсқасы бар. Бұл блок сол баппен бірге екінші
// қайталама қатарды topbar-ға қосып, экранда қос-қабат
// батырма көрсетіп тұрды — сол үшін өшірілді.
// =====================================================
/*
document.addEventListener("DOMContentLoaded", () => {
  const topbarRight = document.querySelector(".topbar-right");
  if (!topbarRight) return;

  // Extras toolbar
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;align-items:center;gap:6px;position:relative;";
  toolbar.innerHTML = `
    <!-- Draw Mode -->
    <button id="extDrawBtn" title="Сурет салу" style="
      background:rgba(255,255,255,0.15);color:white;
      border:1.5px solid rgba(255,255,255,0.25);
      padding:5px 11px;border-radius:999px;
      font-size:12px;font-weight:700;cursor:pointer;
    ">✏️ Сурет</button>

    <!-- Sticky Note -->
    <button id="extStickyBtn" title="Жабысқақ жазба" style="
      background:rgba(255,255,255,0.15);color:white;
      border:1.5px solid rgba(255,255,255,0.25);
      padding:5px 11px;border-radius:999px;
      font-size:12px;font-weight:700;cursor:pointer;
    ">📝 Жазба</button>

    <!-- Tools dropdown -->
    <div style="position:relative;">
      <button id="extToolsBtn" style="
        background:rgba(255,255,255,0.15);color:white;
        border:1.5px solid rgba(255,255,255,0.25);
        padding:5px 11px;border-radius:999px;
        font-size:12px;font-weight:700;cursor:pointer;
      ">🧰 Құралдар ▾</button>

      <div id="extToolsDrop" style="
        display:none;position:absolute;top:40px;right:0;
        background:white;border-radius:14px;
        box-shadow:0 12px 40px rgba(15,23,42,0.18);
        border:1px solid #e2e6f0;z-index:600;
        width:200px;overflow:hidden;
      ">
        ${[
          ["🎡","spinWheel","Spin the Wheel"],
          ["🎯","namePicker","Оқушы таңдау"],
          ["🏆","scoreboard","Scoreboard"],
          ["⏱","timerW","Таймер"],
          ["🎲","dice","Кубик"],
          ["🚦","traffic","Дыбыс деңгейі"],
          ["🔊","soundMeter","Шу өлшегіш"],
          ["📅","dateW","Бүгінгі күн"],
          ["🕐","clockW","Аналогты сағат"],
          ["📏","ruler","Сызғыш"],
          ["📐","protractor","Транспортир"],
          ["🧮","calc","Калькулятор"],
          ["🔢","numline","Сан сызығы"],
          ["½","fraction","Бөлшек"],
          ["🌙","darkmode","Қараңғы тема"],
        ].map(([ic,fn,lbl]) => `
          <button onclick="extTool('${fn}')" style="
            width:100%;padding:9px 14px;border:none;background:transparent;
            text-align:left;font-size:13px;font-weight:600;color:#334155;
            cursor:pointer;display:flex;align-items:center;gap:10px;
            transition:.15s;font-family:inherit;
          " onmouseover="this.style.background='#f0f2f8'"
             onmouseout="this.style.background='transparent'">
            <span style="font-size:18px;">${ic}</span>${lbl}
          </button>
        `).join("")}
      </div>
    </div>

    <!-- Spotlight -->
    <button id="extSpotBtn" title="Прожектор" style="
      background:rgba(255,255,255,0.15);color:white;
      border:1.5px solid rgba(255,255,255,0.25);
      padding:5px 11px;border-radius:999px;
      font-size:12px;font-weight:700;cursor:pointer;
    ">🔦</button>

    <!-- Cover -->
    <button id="extCoverBtn" title="Жасыру" style="
      background:rgba(255,255,255,0.15);color:white;
      border:1.5px solid rgba(255,255,255,0.25);
      padding:5px 11px;border-radius:999px;
      font-size:12px;font-weight:700;cursor:pointer;
    ">🙈</button>

    <!-- Board BG -->
    <button id="extBgBtn" title="Тақта фоны" style="
      background:rgba(255,255,255,0.15);color:white;
      border:1.5px solid rgba(255,255,255,0.25);
      padding:5px 11px;border-radius:999px;
      font-size:12px;font-weight:700;cursor:pointer;
    ">📋 Фон</button>
  `;

  // Logout алдына кіргізу
  const logoutBtn = _$("logout");
  if (logoutBtn) topbarRight.insertBefore(toolbar, logoutBtn);
  else topbarRight.appendChild(toolbar);

  // Events
  _$("extDrawBtn").addEventListener("click", toggleDrawMode);
  _$("extStickyBtn").addEventListener("click", addStickyNote);
  _$("extSpotBtn").addEventListener("click", toggleSpotlight);
  _$("extCoverBtn").addEventListener("click", toggleCover);
  _$("extBgBtn").addEventListener("click", toggleBgPicker);

  // Tools dropdown
  _$("extToolsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const drop = _$("extToolsDrop");
    drop.style.display = drop.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", () => {
    const drop = _$("extToolsDrop");
    if (drop) drop.style.display = "none";
  });
});
*/

window.extTool = function(fn) {
  const drop = _$("extToolsDrop");
  if (drop) drop.style.display = "none";
  const map = {
    spinWheel: window.spinWheel || spinWheel,
    namePicker: window.namePicker || namePicker,
    scoreboard: window.scoreboard || scoreboard,
    timerW: window.timerWidget || timerWidget,
    dice: window.openDice || openDice,
    traffic: window.openTrafficLight || openTrafficLight,
    soundMeter: window.openSoundMeter || openSoundMeter,
    dateW: window.openDateWidget || openDateWidget,
    clockW: window.openClock || openClock,
    ruler: window.openRuler || openRuler,
    protractor: window.openProtractor || openProtractor,
    calc: window.openCalculator || openCalculator,
    numline: window.openNumberLine || openNumberLine,
    fraction: window.openFraction || openFraction,
    darkmode: window.toggleDarkMode || toggleDarkMode,
  };
  if (map[fn]) map[fn]();
};

// =====================================================
// ✏️ DRAW MODE
// =====================================================
let drawMode=false, drawing=false, drawTool="pen";
let drawColor="#1e1b4b", strokeW=3, drawHistory=[];
let snapX=0, snapY=0, shapeSnap=null, drawCtx=null;

function toggleDrawMode() {
  drawMode = !drawMode;
  const btn = _$("extDrawBtn");

  let cvs = _$("drawCanvas");
  if (!cvs) {
    cvs = document.createElement("canvas");
    cvs.id = "drawCanvas";
    cvs.style.cssText = "display:none;position:fixed;inset:56px 300px 0 260px;z-index:100;pointer-events:auto;";
    document.body.appendChild(cvs);
  }

  let tb = _$("drawToolbar");
  if (!tb) {
    tb = document.createElement("div");
    tb.id = "drawToolbar";
    tb.style.cssText = `
      display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      z-index:200;background:white;border-radius:16px;
      box-shadow:0 8px 28px rgba(15,23,42,0.18);border:1px solid #e2e6f0;
      padding:8px 12px;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;
    `;
    tb.innerHTML = `
      ${[["pen","✏️"],["marker","🖊️"],["eraser","🧹"],["line","╱"],["rect","⬜"],["circle","⭕"],["arrow","➡️"]].map(([t,ic])=>`
        <button class="dt" data-t="${t}" onclick="setDT('${t}')" style="
          width:34px;height:34px;border-radius:8px;
          border:2px solid ${t==='pen'?'#c7d2fe':'#e5e7eb'};
          background:${t==='pen'?'#eef2ff':'#f9fafb'};
          font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;
        ">${ic}</button>
      `).join("")}
      <div style="width:1px;height:24px;background:#e2e6f0;"></div>
      ${[2,5,10].map(w=>`
        <button onclick="setDW(${w})" data-w="${w}" class="dw" style="
          width:26px;height:26px;border-radius:50%;
          border:2px solid ${w===3?'#c7d2fe':'#e5e7eb'};
          background:${w===3?'#eef2ff':'#f9fafb'};
          cursor:pointer;display:flex;align-items:center;justify-content:center;
        "><span style="width:${w+1}px;height:${w+1}px;border-radius:50%;background:#334155;display:block;"></span></button>
      `).join("")}
      <div style="width:1px;height:24px;background:#e2e6f0;"></div>
      ${["#1e1b4b","#ef4444","#f59e0b","#10b981","#4f46e5","#06b6d4","#ffffff"].map(c=>`
        <button onclick="setDC('${c}')" style="
          width:22px;height:22px;border-radius:6px;background:${c};
          border:2px solid ${c==='#ffffff'?'#e5e7eb':'transparent'};cursor:pointer;
        "></button>
      `).join("")}
      <input type="color" value="#1e1b4b" onchange="setDC(this.value)"
        style="width:22px;height:22px;border-radius:6px;border:2px solid #e5e7eb;cursor:pointer;padding:1px;"/>
      <div style="width:1px;height:24px;background:#e2e6f0;"></div>
      <button onclick="undoDraw()" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #e5e7eb;background:#f9fafb;font-size:16px;cursor:pointer;">↩️</button>
      <button onclick="clearDraw()" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #fee2e2;background:#fef2f2;font-size:16px;cursor:pointer;">🗑️</button>
      <button onclick="toggleDrawMode()" style="width:32px;height:32px;border-radius:8px;border:1.5px solid #fecaca;background:#fef2f2;color:#dc2626;font-size:14px;font-weight:700;cursor:pointer;">✕</button>
    `;
    document.body.appendChild(tb);
  }

  if (drawMode) {
    const board = _$("board");
    if (board) {
      const r = board.getBoundingClientRect();
      cvs.width  = r.width;
      cvs.height = r.height;
      cvs.style.left   = r.left + "px";
      cvs.style.top    = r.top  + "px";
      cvs.style.width  = r.width  + "px";
      cvs.style.height = r.height + "px";
    }
    cvs.style.display = "block";
    tb.style.display  = "flex";
    drawCtx = cvs.getContext("2d");
    drawCtx.lineCap = "round"; drawCtx.lineJoin = "round";
    bindDrawEvents(cvs);
    if (btn) { btn.textContent="✏️ Қосулы"; btn.style.background="rgba(255,255,255,0.3)"; }
  } else {
    cvs.style.display = "none";
    tb.style.display  = "none";
    if (btn) { btn.textContent="✏️ Сурет"; btn.style.background="rgba(255,255,255,0.15)"; }
  }
}

window.setDT = function(t) {
  drawTool = t;
  document.querySelectorAll(".dt").forEach(b=>{
    b.style.borderColor = b.dataset.t===t ? "#c7d2fe" : "#e5e7eb";
    b.style.background  = b.dataset.t===t ? "#eef2ff" : "#f9fafb";
  });
  const cvs = _$("drawCanvas");
  if (cvs) cvs.style.cursor = t==="eraser" ? "cell" : "crosshair";
};
window.setDW = function(w) {
  strokeW = w;
  document.querySelectorAll(".dw").forEach(b=>{
    b.style.borderColor = parseInt(b.dataset.w)===w ? "#c7d2fe" : "#e5e7eb";
    b.style.background  = parseInt(b.dataset.w)===w ? "#eef2ff" : "#f9fafb";
  });
};
window.setDC = function(c) { drawColor = c; };

function bindDrawEvents(cvs) {
  cvs.onmousedown  = (e) => startD(e.offsetX, e.offsetY);
  cvs.onmousemove  = (e) => moveD(e.offsetX, e.offsetY);
  cvs.onmouseup    = endD;
  cvs.onmouseleave = endD;
  cvs.ontouchstart = (e) => { e.preventDefault(); const r=cvs.getBoundingClientRect(),t=e.touches[0]; startD(t.clientX-r.left,t.clientY-r.top); };
  cvs.ontouchmove  = (e) => { e.preventDefault(); const r=cvs.getBoundingClientRect(),t=e.touches[0]; moveD(t.clientX-r.left,t.clientY-r.top); };
  cvs.ontouchend   = endD;
}

function startD(x,y) {
  if (!drawCtx||!drawMode) return;
  drawing=true; snapX=x; snapY=y;
  const cvs=_$("drawCanvas");
  drawHistory.push(drawCtx.getImageData(0,0,cvs.width,cvs.height));
  if (drawHistory.length>30) drawHistory.shift();
  if (drawTool==="pen"||drawTool==="marker"||drawTool==="eraser") {
    drawCtx.beginPath(); drawCtx.moveTo(x,y);
  }
}
function moveD(x,y) {
  if (!drawing||!drawCtx||!drawMode) return;
  const ctx=drawCtx;
  if (drawTool==="pen") {
    ctx.strokeStyle=drawColor; ctx.lineWidth=strokeW; ctx.globalAlpha=1;
    ctx.lineTo(x,y); ctx.stroke();
  } else if (drawTool==="marker") {
    ctx.strokeStyle=drawColor; ctx.lineWidth=strokeW*3; ctx.globalAlpha=0.35;
    ctx.lineTo(x,y); ctx.stroke(); ctx.globalAlpha=1;
  } else if (drawTool==="eraser") {
    ctx.globalCompositeOperation="destination-out";
    ctx.lineWidth=strokeW*6; ctx.lineTo(x,y); ctx.stroke();
    ctx.globalCompositeOperation="source-over";
  } else {
    if (shapeSnap) ctx.putImageData(shapeSnap,0,0);
    else shapeSnap=drawHistory[drawHistory.length-1];
    if (shapeSnap) ctx.putImageData(shapeSnap,0,0);
    ctx.strokeStyle=drawColor; ctx.lineWidth=strokeW;
    ctx.beginPath();
    if (drawTool==="line") { ctx.moveTo(snapX,snapY); ctx.lineTo(x,y); ctx.stroke(); }
    else if (drawTool==="rect") { ctx.strokeRect(snapX,snapY,x-snapX,y-snapY); }
    else if (drawTool==="circle") {
      const rx=(x-snapX)/2,ry=(y-snapY)/2;
      ctx.ellipse(snapX+rx,snapY+ry,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2); ctx.stroke();
    } else if (drawTool==="arrow") {
      ctx.moveTo(snapX,snapY); ctx.lineTo(x,y); ctx.stroke();
      const a=Math.atan2(y-snapY,x-snapX),l=16;
      ctx.beginPath();
      ctx.moveTo(x,y); ctx.lineTo(x-l*Math.cos(a-Math.PI/6),y-l*Math.sin(a-Math.PI/6));
      ctx.moveTo(x,y); ctx.lineTo(x-l*Math.cos(a+Math.PI/6),y-l*Math.sin(a+Math.PI/6));
      ctx.stroke();
    }
  }
}
function endD() {
  drawing=false; shapeSnap=null;
  if (drawCtx) { drawCtx.globalAlpha=1; drawCtx.globalCompositeOperation="source-over"; drawCtx.beginPath(); }
}
window.undoDraw = function() {
  if (!drawCtx||!drawHistory.length) return;
  const cvs=_$("drawCanvas");
  drawCtx.putImageData(drawHistory.pop(),0,0);
};
window.clearDraw = function() {
  if (!drawCtx) return;
  const cvs=_$("drawCanvas");
  drawHistory.push(drawCtx.getImageData(0,0,cvs.width,cvs.height));
  drawCtx.clearRect(0,0,cvs.width,cvs.height);
};

// =====================================================
// 📝 STICKY NOTE
// =====================================================
let stickyN=0;
function addStickyNote() {
  stickyN++;
  const COLS=[
    {bg:"#fef08a",bd:"#facc15",tx:"#713f12"},
    {bg:"#bbf7d0",bd:"#4ade80",tx:"#14532d"},
    {bg:"#bfdbfe",bd:"#60a5fa",tx:"#1e3a8a"},
    {bg:"#fca5a5",bd:"#f87171",tx:"#7f1d1d"},
    {bg:"#e9d5ff",bd:"#c084fc",tx:"#581c87"},
  ];
  const c=COLS[(stickyN-1)%COLS.length];
  const id=`sticky_${stickyN}`;
  const el=document.createElement("div");
  el.id=id;
  el.style.cssText=`position:fixed;left:${220+stickyN*15}px;top:${140+stickyN*15}px;
    width:200px;min-height:160px;background:${c.bg};
    border:1.5px solid ${c.bd};border-radius:4px 16px 16px 16px;
    box-shadow:3px 4px 14px rgba(0,0,0,0.15);z-index:500;
    display:flex;flex-direction:column;font-family:inherit;animation:modal-in .2s ease;`;
  el.innerHTML=`
    <div style="background:${c.bd};padding:6px 8px;border-radius:2px 14px 0 0;
      display:flex;align-items:center;justify-content:space-between;cursor:move;">
      <span style="font-size:11px;font-weight:700;color:${c.tx};">📝 Жазба</span>
      <button onclick="document.getElementById('${id}').remove()" style="
        background:transparent;border:none;cursor:pointer;
        color:${c.tx};font-size:14px;font-weight:700;">✕</button>
    </div>
    <textarea placeholder="Жазыңыз..." style="
      flex:1;padding:10px;border:none;outline:none;background:transparent;
      resize:none;font-size:14px;line-height:1.5;color:${c.tx};
      font-family:inherit;min-height:120px;"></textarea>`;
  document.body.appendChild(el);

  // Drag
  const hdr=el.querySelector("div");
  hdr.addEventListener("mousedown",(e)=>{
    const ox=e.clientX-el.offsetLeft,oy=e.clientY-el.offsetTop;
    const mm=(e2)=>{el.style.left=(e2.clientX-ox)+"px";el.style.top=(e2.clientY-oy)+"px";};
    const mu=()=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);};
    document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu);
  });
  setTimeout(()=>el.querySelector("textarea")?.focus(),100);
}

// =====================================================
// 🔦 SPOTLIGHT
// =====================================================
let spotOn=false;
function toggleSpotlight() {
  spotOn=!spotOn;
  let ov=_$("spotOverlay");
  if (!ov) {
    ov=document.createElement("div");
    ov.id="spotOverlay";
    ov.style.cssText="display:none;position:fixed;inset:0;z-index:300;cursor:none;";
    ov.innerHTML=`
      <svg style="position:absolute;inset:0;width:100%;height:100%;">
        <defs><mask id="sm"><rect width="100%" height="100%" fill="white"/>
        <circle id="sc" cx="50%" cy="50%" r="120" fill="black"/></mask></defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.82)" mask="url(#sm)"/>
      </svg>
      <div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
        background:rgba(255,255,255,0.95);border-radius:999px;
        padding:8px 16px;display:flex;align-items:center;gap:10px;
        box-shadow:0 4px 20px rgba(0,0,0,0.25);z-index:301;pointer-events:auto;">
        <span>🔦</span>
        <input type="range" min="50" max="300" value="120"
          oninput="document.getElementById('sc').setAttribute('r',this.value)"
          style="width:100px;accent-color:#4f46e5;"/>
        <button onclick="toggleSpotlight()" style="
          background:#fef2f2;color:#dc2626;border:none;border-radius:7px;
          padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
      </div>`;
    ov.addEventListener("mousemove",(e)=>{
      const c=document.getElementById("sc");
      if(c){c.setAttribute("cx",e.clientX);c.setAttribute("cy",e.clientY);}
    });
    document.body.appendChild(ov);
  }
  ov.style.display=spotOn?"block":"none";
  const btn=_$("extSpotBtn");
  if(btn){btn.style.background=spotOn?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.15)";}
}

// =====================================================
// 🙈 COVER
// =====================================================
let coverOn=false,coverPct=50,coverDrag=false;
function toggleCover() {
  coverOn=!coverOn;
  let ov=_$("coverOverlay");
  if (!ov) {
    ov=document.createElement("div");
    ov.id="coverOverlay";
    ov.style.cssText="display:none;position:fixed;inset:0;z-index:290;";
    ov.innerHTML=`
      <div id="coverTop" style="position:absolute;top:0;left:0;right:0;background:#1e1b4b;height:50%;"></div>
      <div id="coverHandle" style="position:absolute;left:0;right:0;height:34px;
        background:linear-gradient(135deg,#4f46e5,#818cf8);
        display:flex;align-items:center;justify-content:space-between;
        padding:0 16px;cursor:row-resize;z-index:5;user-select:none;">
        <span style="color:white;font-size:12px;font-weight:700;">🙈 Сүйреп ашыңыз</span>
        <div style="display:flex;gap:6px;">
          <button onclick="coverRevealAll()" style="
            background:rgba(255,255,255,0.2);color:white;border:none;
            border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;">
            Барлығын ашу</button>
          <button onclick="toggleCover()" style="
            background:rgba(255,255,255,0.15);color:white;border:none;
            border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;">✕</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const handle=ov.querySelector("#coverHandle");
    handle.addEventListener("mousedown",()=>{
      const mm=(e)=>{coverPct=Math.max(0,Math.min(95,(e.clientY/window.innerHeight)*100));updateCover();};
      const mu=()=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);};
      document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu);
    });
  }
  ov.style.display=coverOn?"block":"none";
  updateCover();
  const btn=_$("extCoverBtn");
  if(btn){btn.style.background=coverOn?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.15)";}
}
function updateCover() {
  const top=_$("coverTop"),handle=_$("coverHandle");
  if(top) top.style.height=coverPct+"vh";
  if(handle) handle.style.top=coverPct+"vh";
}
window.coverRevealAll=function(){coverPct=0;updateCover();};

// =====================================================
// 📋 BOARD BACKGROUND
// =====================================================
const BG={
  none:     {background:"#ffffff"},
  lines:    {backgroundColor:"#ffffff",backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,#93c5fd 27px,#93c5fd 28px)"},
  squares:  {backgroundColor:"#ffffff",backgroundImage:"linear-gradient(#bfdbfe 1px,transparent 1px),linear-gradient(90deg,#bfdbfe 1px,transparent 1px)",backgroundSize:"28px 28px"},
  dots:     {backgroundColor:"#ffffff",backgroundImage:"radial-gradient(circle,#93c5fd 1.5px,transparent 1.5px)",backgroundSize:"24px 24px"},
  mm:       {backgroundColor:"#ffffff",backgroundImage:"linear-gradient(#93c5fd 1px,transparent 1px),linear-gradient(90deg,#93c5fd 1px,transparent 1px),linear-gradient(rgba(147,197,253,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(147,197,253,.4) 1px,transparent 1px)",backgroundSize:"100px 100px,100px 100px,20px 20px,20px 20px"},
  coord:    {backgroundColor:"#ffffff",backgroundImage:"linear-gradient(#4f46e5 1.5px,transparent 1.5px),linear-gradient(90deg,#4f46e5 1.5px,transparent 1.5px),linear-gradient(rgba(147,197,253,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(147,197,253,.5) 1px,transparent 1px)",backgroundSize:"60px 60px,60px 60px,12px 12px,12px 12px"},
  notebook: {backgroundColor:"#fff9f0",backgroundImage:"repeating-linear-gradient(transparent,transparent 29px,#bfdbfe 29px,#bfdbfe 30px)"},
  dark:     {backgroundColor:"#1e1b4b",backgroundImage:"linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",backgroundSize:"32px 32px"},
  green:    {backgroundColor:"#166534",backgroundImage:"linear-gradient(rgba(255,255,255,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.15) 1px,transparent 1px)",backgroundSize:"32px 32px"},
};

let bgPickerOpen=false;
function toggleBgPicker() {
  bgPickerOpen=!bgPickerOpen;
  let pk=_$("bgPicker");
  if (!pk) {
    pk=document.createElement("div");
    pk.id="bgPicker";
    pk.style.cssText="position:fixed;top:66px;right:80px;background:white;border-radius:16px;box-shadow:0 12px 40px rgba(15,23,42,0.18);border:1px solid #e2e6f0;z-index:500;width:340px;overflow:hidden;";
    pk.innerHTML=`
      <div style="background:linear-gradient(135deg,#4f46e5,#818cf8);padding:11px 14px;display:flex;align-items:center;justify-content:space-between;">
        <span style="color:white;font-weight:700;font-size:14px;">📋 Тақта фоны</span>
        <button onclick="toggleBgPicker()" style="background:rgba(255,255,255,0.2);color:white;border:none;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;cursor:pointer;">✕</button>
      </div>
      <div style="padding:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        ${Object.entries(BG).map(([k,v])=>`
          <button onclick="setBG('${k}')" style="
            border-radius:10px;border:2px solid #e5e7eb;background:#f9fafb;
            padding:8px 4px;cursor:pointer;
            display:flex;flex-direction:column;align-items:center;gap:4px;
            transition:.15s;
          " onmouseover="this.style.borderColor='#c7d2fe'" onmouseout="this.style.borderColor='#e5e7eb'">
            <div style="width:60px;height:40px;border-radius:6px;border:1px solid #e5e7eb;
              overflow:hidden;${Object.entries(v).map(([p,val])=>`${p.replace(/([A-Z])/g,'-$1').toLowerCase()}:${val}`).join(';')}">
            </div>
            <span style="font-size:10px;font-weight:700;color:#334155;">${k==='none'?'Бос':k==='lines'?'Жолдар':k==='squares'?'Клетка':k==='dots'?'Нүктелер':k==='mm'?'Миллиметр':k==='coord'?'Координата':k==='notebook'?'Дәптер':k==='dark'?'Қараңғы':'Жасыл'}</span>
          </button>
        `).join("")}
      </div>
      <div style="padding:0 12px 12px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;">Өз түсің</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${["#ffffff","#fef9c3","#dcfce7","#dbeafe","#fae8ff","#fff1f2","#0f172a","#166534"].map(c=>`
            <button onclick="setBGColor('${c}')" style="width:32px;height:32px;border-radius:8px;background:${c};border:2px solid ${c==='#ffffff'?'#e5e7eb':'transparent'};cursor:pointer;"></button>
          `).join("")}
          <input type="color" onchange="setBGColor(this.value)" style="width:32px;height:32px;border-radius:8px;border:2px solid #e5e7eb;cursor:pointer;padding:1px;"/>
        </div>
      </div>`;
    document.body.appendChild(pk);
    document.addEventListener("click",(e)=>{
      const btn=_$("extBgBtn");
      if(!_$("bgPicker")?.contains(e.target)&&!btn?.contains(e.target)){
        _$("bgPicker").style.display="none"; bgPickerOpen=false;
      }
    });
  }
  pk.style.display=bgPickerOpen?"block":"none";
}

window.setBG=function(type) {
  const board=_$("board"); if(!board) return;
  board.style.background=""; board.style.backgroundImage="";
  board.style.backgroundColor=""; board.style.backgroundSize=""; board.style.backgroundPosition="";
  const p=BG[type]||{}; Object.entries(p).forEach(([k,v])=>board.style[k]=v);
};
window.setBGColor=function(c){ const b=_$("board"); if(b){b.style.background=c;b.style.backgroundImage="none";}};

// =====================================================
// 🎲 DICE
// =====================================================
function openDice() {
  createWidget({ id:"wDice",title:"Кубик",icon:"🎲",
    color:"linear-gradient(135deg,#7c3aed,#a78bfa)",width:200,
    html:`<div style="text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">
        <button onclick="diceAdj(-1)" style="width:26px;height:26px;border-radius:7px;background:#f3f4f6;border:1px solid #e5e7eb;font-size:16px;font-weight:700;cursor:pointer;">-</button>
        <span id="diceN" style="font-weight:800;font-size:16px;color:#4f46e5;">1</span>
        <button onclick="diceAdj(1)" style="width:26px;height:26px;border-radius:7px;background:#f3f4f6;border:1px solid #e5e7eb;font-size:16px;font-weight:700;cursor:pointer;">+</button>
      </div>
      <div id="diceR" style="font-size:52px;min-height:60px;display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;margin-bottom:8px;">⚀</div>
      <div id="diceS" style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:10px;">Мән: 1</div>
      <button onclick="rollDice()" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;font-size:14px;font-weight:800;cursor:pointer;">🎲 Лақтыру!</button>
    </div>`,
    onMount:()=>{ window._dN=1; }
  });
}
window.diceAdj=function(d){window._dN=Math.max(1,Math.min(6,(window._dN||1)+d));const e=_$("diceN");if(e)e.textContent=window._dN;};
window.rollDice=function(){
  const F=["⚀","⚁","⚂","⚃","⚄","⚅"],n=window._dN||1,r=_$("diceR"),s=_$("diceS");
  let f=0,vals=[];
  const t=setInterval(()=>{
    vals=Array.from({length:n},()=>Math.floor(Math.random()*6));
    if(r){r.style.opacity=".4";r.textContent=vals.map(v=>F[v]).join(" ");}
    f++;
    if(f>8){clearInterval(t);if(r){r.style.opacity="1";r.style.transform="scale(1.1)";setTimeout(()=>r.style.transform="scale(1)",180);}
      if(s)s.textContent=(n>1?"Жиыны: ":"Мән: ")+(vals.reduce((a,v)=>a+v+1,0));}
  },60);
};

// =====================================================
// 🚦 TRAFFIC LIGHT
// =====================================================
function openTrafficLight() {
  createWidget({id:"wTraffic",title:"Дыбыс деңгейі",icon:"🚦",
    color:"linear-gradient(135deg,#374151,#1f2937)",width:180,
    html:`<div style="text-align:center;">
      <div style="background:#1f2937;border-radius:16px;padding:14px 20px;margin-bottom:12px;display:inline-flex;flex-direction:column;gap:12px;">
        <div id="tl-r" onclick="setTL('red')" style="width:54px;height:54px;border-radius:50%;background:#374151;cursor:pointer;transition:.25s;"></div>
        <div id="tl-y" onclick="setTL('yellow')" style="width:54px;height:54px;border-radius:50%;background:#374151;cursor:pointer;transition:.25s;"></div>
        <div id="tl-g" onclick="setTL('green')" style="width:54px;height:54px;border-radius:50%;background:#374151;cursor:pointer;transition:.25s;"></div>
      </div>
      <div id="tlL" style="font-size:12px;font-weight:700;color:#374151;">Деңгей таңдаңыз</div>
    </div>`,
  });
}
window.setTL=function(c){
  const G={red:"#ef4444",yellow:"#f59e0b",green:"#22c55e"};
  const L={red:"🔴 Тыныш!",yellow:"🟡 Жай...",green:"🟢 Еркін!"};
  ["r","y","g"].forEach((k,i)=>{
    const el=$(["tl-r","tl-y","tl-g"][i]);
    const mc=["red","yellow","green"][i];
    if(el){el.style.background=mc===c?G[c]:"#374151";el.style.boxShadow=mc===c?`0 0 20px ${G[c]}`:"none";}
  });
  const lbl=_$("tlL"); if(lbl){lbl.textContent=L[c];lbl.style.color=G[c];}
};

// =====================================================
// 🔊 SOUND METER
// =====================================================
let smStream=null,smAnim=null;
function openSoundMeter() {
  createWidget({id:"wSound",title:"Шу өлшегіш",icon:"🔊",
    color:"linear-gradient(135deg,#0369a1,#06b6d4)",width:210,
    html:`<div style="text-align:center;">
      <div style="background:#f0f2f8;border-radius:10px;padding:10px;margin-bottom:8px;position:relative;overflow:hidden;">
        <div id="smBar" style="height:28px;border-radius:6px;background:linear-gradient(90deg,#22c55e,#f59e0b,#ef4444);width:3%;transition:width .08s;"></div>
        <span id="smPct" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);font-size:12px;font-weight:800;color:#374151;">0%</span>
      </div>
      <div id="smEmoji" style="font-size:34px;margin-bottom:6px;">😶</div>
      <div id="smLbl" style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:10px;">Микрофон қосыңыз</div>
      <div style="display:flex;gap:8px;">
        <button onclick="startSM()" style="flex:1;padding:8px;border:none;border-radius:9px;background:linear-gradient(135deg,#0369a1,#06b6d4);color:white;font-size:12px;font-weight:700;cursor:pointer;">🎤 Қосу</button>
        <button onclick="stopSM()" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:9px;background:#f9fafb;color:#374151;font-size:12px;font-weight:700;cursor:pointer;">⏹</button>
      </div>
    </div>`,
  });
}
window.startSM=async function(){
  try {
    smStream=await navigator.mediaDevices.getUserMedia({audio:true});
    const ac=new (window.AudioContext||window.webkitAudioContext)();
    const an=ac.createAnalyser(),src=ac.createMediaStreamSource(smStream);
    src.connect(an); an.fftSize=256;
    const da=new Uint8Array(an.frequencyBinCount);
    const EM=[{max:10,e:"😶",l:"Тыныш",c:"#22c55e"},{max:30,e:"🤫",l:"Жай",c:"#84cc16"},{max:55,e:"😊",l:"Қалыпты",c:"#f59e0b"},{max:75,e:"😲",l:"Шулы!",c:"#f97316"},{max:100,e:"😱",l:"Тым шулы!",c:"#ef4444"}];
    smAnim=setInterval(()=>{
      an.getByteFrequencyData(da);
      const avg=da.reduce((a,b)=>a+b,0)/da.length,pct=Math.min(100,Math.round(avg*2.5));
      const b=_$("smBar"),p=_$("smPct"),em=_$("smEmoji"),lb=_$("smLbl");
      if(b)b.style.width=Math.max(3,pct)+"%";
      if(p)p.textContent=pct+"%";
      const lv=EM.find(e=>pct<=e.max)||EM[EM.length-1];
      if(em)em.textContent=lv.e; if(lb){lb.textContent=lv.l;lb.style.color=lv.c;}
    },100);
  } catch(e){const l=_$("smLbl");if(l)l.textContent="Рұқсат жоқ";}
};
window.stopSM=function(){
  if(smAnim){clearInterval(smAnim);smAnim=null;}
  if(smStream){smStream.getTracks().forEach(t=>t.stop());smStream=null;}
  const b=_$("smBar"),p=_$("smPct"),em=_$("smEmoji"),lb=_$("smLbl");
  if(b)b.style.width="3%"; if(p)p.textContent="0%";
  if(em)em.textContent="😶"; if(lb){lb.textContent="Тоқтатылды";lb.style.color="#94a3b8";}
};

// =====================================================
// 📅 DATE WIDGET
// =====================================================
function openDateWidget() {
  const now=new Date();
  const M=["Қаңтар","Ақпан","Наурыз","Сәуір","Мамыр","Маусым","Шілде","Тамыз","Қыркүйек","Қазан","Қараша","Желтоқсан"];
  const D=["Жексенбі","Дүйсенбі","Сейсенбі","Сәрсенбі","Бейсенбі","Жұма","Сенбі"];
  createWidget({id:"wDate",title:"Бүгінгі күн",icon:"📅",
    color:"linear-gradient(135deg,#0f172a,#1e3a8a)",width:220,
    html:`<div style="text-align:center;padding:4px 0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">${D[now.getDay()]}</div>
      <div style="font-size:52px;font-weight:800;color:#0f172a;line-height:1;margin-bottom:4px;">${now.getDate()}</div>
      <div style="font-size:18px;font-weight:700;color:#4f46e5;margin-bottom:2px;">${M[now.getMonth()]}</div>
      <div style="font-size:14px;font-weight:600;color:#64748b;margin-bottom:10px;">${now.getFullYear()}</div>
      <div id="lTime" style="font-size:24px;font-weight:800;color:#0f172a;background:#f0f2f8;border-radius:10px;padding:6px 14px;font-family:monospace;"></div>
    </div>`,
    onMount:()=>{
      const upd=()=>{const t=new Date(),el=_$("lTime");if(el)el.textContent=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0");};
      upd(); setInterval(upd,1000);
    }
  });
}

// =====================================================
// 🕐 CLOCK
// =====================================================
function openClock() {
  createWidget({id:"wClock",title:"Аналогты сағат",icon:"🕐",
    color:"linear-gradient(135deg,#374151,#1f2937)",width:200,
    html:`<div style="text-align:center;"><canvas id="clockCvs" width="160" height="160" style="border-radius:50%;box-shadow:0 4px 16px rgba(0,0,0,0.12);"></canvas></div>`,
    onMount:()=>{
      const cvs=_$("clockCvs"); if(!cvs)return;
      const ctx=cvs.getContext("2d"),W=160,H=160,cx=80,cy=80,R=74;
      const draw=()=>{
        const now=new Date(),sec=now.getSeconds(),min=now.getMinutes(),hr=now.getHours()%12;
        ctx.clearRect(0,0,W,H);
        ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();
        ctx.strokeStyle="#e2e6f0";ctx.lineWidth=4;ctx.stroke();
        for(let i=0;i<60;i++){const a=i/60*Math.PI*2-Math.PI/2,l=i%5===0?10:5;
          ctx.beginPath();ctx.moveTo(cx+(R-2)*Math.cos(a),cy+(R-2)*Math.sin(a));
          ctx.lineTo(cx+(R-2-l)*Math.cos(a),cy+(R-2-l)*Math.sin(a));
          ctx.strokeStyle=i%5===0?"#374151":"#d1d5db";ctx.lineWidth=i%5===0?2:1;ctx.stroke();}
        ctx.fillStyle="#374151";ctx.font="bold 11px Inter,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
        for(let i=1;i<=12;i++){const a=i/12*Math.PI*2-Math.PI/2;ctx.fillText(i,cx+(R-18)*Math.cos(a),cy+(R-18)*Math.sin(a));}
        const dh=(angle,len,w,color)=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+len*Math.cos(angle),cy+len*Math.sin(angle));ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap="round";ctx.stroke();};
        dh((hr/12+min/(60*12))*Math.PI*2-Math.PI/2,R*.5,5,"#1f2937");
        dh((min/60+sec/(60*60))*Math.PI*2-Math.PI/2,R*.72,3.5,"#374151");
        dh(sec/60*Math.PI*2-Math.PI/2,R*.78,1.5,"#ef4444");
        ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fillStyle="#ef4444";ctx.fill();
      };
      draw(); setInterval(draw,1000);
    }
  });
}

// =====================================================
// 📏 RULER
// =====================================================
function openRuler() {
  const id="wRuler";
  const ex=$(id); if(ex){ex.remove();return;}
  const el=document.createElement("div");
  el.id=id; el.style.cssText="position:fixed;left:200px;top:180px;z-index:500;cursor:move;user-select:none;";
  el.innerHTML=`
    <div style="position:relative;">
      <canvas id="rulerCvs" width="500" height="68" style="display:block;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.2);cursor:move;"></canvas>
      <div style="position:absolute;top:3px;right:6px;display:flex;gap:4px;">
        <button onclick="rulerRotate()" style="background:rgba(255,255,255,0.5);border:none;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;cursor:pointer;">↻</button>
        <button onclick="document.getElementById('wRuler').remove()" style="background:rgba(255,100,100,0.5);border:none;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;cursor:pointer;">✕</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  let angle=0;
  window.rulerRotate=function(){angle=(angle+15)%360;el.style.transform=`rotate(${angle}deg)`;};

  const cvs=_$("rulerCvs"),ctx=cvs.getContext("2d"),W=500,H=68;
  ctx.fillStyle="#fef9c3"; ctx.roundRect(0,0,W,H,8); ctx.fill();
  ctx.fillStyle="#fbbf24"; ctx.fillRect(0,0,W,6); ctx.fillRect(0,H-6,W,6);
  for(let i=0;i<=25;i++){
    const x=10+i*19;
    ctx.fillStyle="#92400e"; ctx.fillRect(x,6,1.5,i%5===0?28:16);
    if(i<25)for(let m=1;m<=9;m++){const mx=x+m*1.9;ctx.fillRect(mx,6,0.7,m===5?12:7);}
    if(i%5===0&&i>0){ctx.font="bold 10px Inter,sans-serif";ctx.textAlign="center";ctx.fillText(i,x,H-13);}
  }
  ctx.font="9px Inter,sans-serif";ctx.textAlign="left";ctx.fillText("cm",13,H-13);

  // Drag
  const mm=(e)=>{el.style.left=(e.clientX-rulerOx)+"px";el.style.top=(e.clientY-rulerOy)+"px";};
  const mu=()=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);};
  let rulerOx=0,rulerOy=0;
  cvs.addEventListener("mousedown",(e)=>{rulerOx=e.clientX-el.offsetLeft;rulerOy=e.clientY-el.offsetTop;document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu);});
}

// =====================================================
// 📐 PROTRACTOR
// =====================================================
function openProtractor() {
  const id="wProtractor";
  const ex=$(id); if(ex){ex.remove();return;}
  const el=document.createElement("div");
  el.id=id; el.style.cssText="position:fixed;left:250px;top:160px;z-index:500;user-select:none;";
  el.innerHTML=`<div style="position:relative;">
    <canvas id="protCvs" width="260" height="145" style="display:block;cursor:crosshair;"></canvas>
    <div style="position:absolute;top:4px;right:4px;display:flex;gap:4px;">
      <div id="protAngle" style="background:rgba(255,255,255,0.9);border-radius:6px;padding:2px 8px;font-size:12px;font-weight:800;color:#4f46e5;">0°</div>
      <button onclick="document.getElementById('wProtractor').remove()" style="background:rgba(255,100,100,0.4);border:none;border-radius:5px;padding:2px 7px;font-size:10px;font-weight:700;cursor:pointer;">✕</button>
    </div>
  </div>`;
  document.body.appendChild(el);

  const cvs=_$("protCvs"),ctx=cvs.getContext("2d"),W=260,H=145,cx=W/2,cy=H-8,R=120;
  ctx.beginPath();ctx.arc(cx,cy,R,Math.PI,0);ctx.lineTo(cx,cy);ctx.closePath();
  ctx.fillStyle="rgba(254,243,199,0.95)";ctx.fill();ctx.strokeStyle="#f59e0b";ctx.lineWidth=2;ctx.stroke();
  for(let a=0;a<=180;a++){
    const rad=Math.PI-a*Math.PI/180,maj=a%10===0,med=a%5===0,tl=maj?14:med?9:5;
    ctx.beginPath();ctx.moveTo(cx+R*Math.cos(rad),cy+R*Math.sin(rad));ctx.lineTo(cx+(R-tl)*Math.cos(rad),cy+(R-tl)*Math.sin(rad));
    ctx.strokeStyle="#92400e";ctx.lineWidth=maj?1.5:.8;ctx.stroke();
    if(maj){ctx.fillStyle="#92400e";ctx.font=`bold ${a%30===0?11:9}px Inter,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(a,cx+(R-22)*Math.cos(rad),cy+(R-22)*Math.sin(rad));}
  }
  ctx.beginPath();ctx.moveTo(cx-R,cy);ctx.lineTo(cx+R,cy);ctx.strokeStyle="#92400e";ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle="#4f46e5";ctx.fill();

  cvs.addEventListener("mousemove",(e)=>{
    const r=cvs.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    if(my>cy)return;
    let a=Math.round(Math.atan2(cy-my,mx-cx)*180/Math.PI);
    a=Math.max(0,Math.min(180,a));
    const el2=_$("protAngle"); if(el2)el2.textContent=a+"°";
  });

  // Drag
  let ox=0,oy=0;
  cvs.addEventListener("mousedown",(e)=>{
    ox=e.clientX-el.offsetLeft;oy=e.clientY-el.offsetTop;
    const mm=(e2)=>{el.style.left=(e2.clientX-ox)+"px";el.style.top=(e2.clientY-oy)+"px";};
    const mu=()=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);};
    document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu);
  });
}

// =====================================================
// 🧮 CALCULATOR
// =====================================================
function openCalculator() {
  createWidget({id:"wCalc",title:"Калькулятор",icon:"🧮",
    color:"linear-gradient(135deg,#374151,#1f2937)",width:220,
    html:`<div>
      <div id="calcD" style="background:#1f2937;color:#34d399;font-size:24px;font-weight:800;text-align:right;padding:10px 12px;border-radius:10px;margin-bottom:4px;font-family:monospace;min-height:44px;word-break:break-all;">0</div>
      <div id="calcE" style="font-size:10px;color:#64748b;text-align:right;margin-bottom:8px;font-family:monospace;min-height:13px;"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;">
        ${[["C","#fef2f2","#dc2626"],["±","#f0fdf4","#16a34a"],["%","#f0fdf4","#16a34a"],["/","#eef2ff","#4f46e5"],
           ["7","#f9fafb","#111827"],["8","#f9fafb","#111827"],["9","#f9fafb","#111827"],["*","#eef2ff","#4f46e5"],
           ["4","#f9fafb","#111827"],["5","#f9fafb","#111827"],["6","#f9fafb","#111827"],["-","#eef2ff","#4f46e5"],
           ["1","#f9fafb","#111827"],["2","#f9fafb","#111827"],["3","#f9fafb","#111827"],["+","#eef2ff","#4f46e5"],
           ["0","#f9fafb","#111827"],[".","#f9fafb","#111827"],["⌫","#fef3c7","#92400e"],["=","#4f46e5","white"],
        ].map(([k,bg,c])=>`<button onclick="calcKey('${k}')" style="padding:11px 4px;border:none;border-radius:8px;background:${bg};color:${c};font-size:15px;font-weight:700;cursor:pointer;transition:.1s;font-family:inherit;">${k}</button>`).join("")}
      </div>
    </div>`,
    onMount:()=>{window._cExpr="";window._cNew=true;}
  });
}
window.calcKey=function(k){
  const d=_$("calcD"),ex=_$("calcE");if(!d)return;
  if(k==="C"){window._cExpr="";window._cNew=true;d.textContent="0";if(ex)ex.textContent="";return;}
  if(k==="="){
    try{
      const expr=window._cExpr||"0";
      const safe=expr.replace(/[^0-9+\-*/.()%\s]/g,"");
      const r=Function('"use strict";return('+safe+')')();
      if(ex)ex.textContent=expr+" =";
      d.textContent=Math.round(r*1e10)/1e10;
      window._cExpr=String(d.textContent);
      window._cNew=true;
    }catch{d.textContent="Қате";window._cExpr="";window._cNew=true;}
    return;
  }
  if(k==="⌫"||k==="DEL"){window._cExpr=(window._cExpr||"").slice(0,-1)||"0";d.textContent=window._cExpr;return;}
  if(k==="+/-"){const v=parseFloat(window._cExpr||d.textContent||0);window._cExpr=String(-v);d.textContent=window._cExpr;return;}
  if(k==="%"){const v=parseFloat(window._cExpr||d.textContent||0);window._cExpr=String(v/100);d.textContent=window._cExpr;return;}
  if(window._cNew&&["+","-","*","/"].includes(k)){
    window._cExpr=(window._cExpr||d.textContent||"0")+" "+k+" ";
    window._cNew=false;
  }else if(window._cNew){
    window._cExpr=k;window._cNew=false;
  }else{
    window._cExpr=(window._cExpr||"")+k;
  }
  d.textContent=window._cExpr;
  if(ex)ex.textContent="";
}
window.drawNL=function(){
  const cvs=_$("nlCvs");if(!cvs)return;
  const ctx=cvs.getContext("2d"),W=cvs.width,H=cvs.height,pad=20,y=H/2;
  const mn=parseFloat(_$("nlMn")?.value)||-10,mx=parseFloat(_$("nlMx")?.value)||10,st=parseFloat(_$("nlSt")?.value)||1;
  const toX=(v)=>pad+((v-mn)/(mx-mn))*(W-pad*2);
  ctx.clearRect(0,0,W,H);
  ctx.beginPath();ctx.moveTo(pad-10,y);ctx.lineTo(W-pad+10,y);ctx.strokeStyle="#1e3a8a";ctx.lineWidth=2;ctx.stroke();
  for(let v=mn;v<=mx+.001;v+=st){
    const x=toX(v),maj=Number.isInteger(v);
    ctx.beginPath();ctx.moveTo(x,y-(maj?10:6));ctx.lineTo(x,y+(maj?10:6));
    ctx.strokeStyle=maj?"#1e3a8a":"#93c5fd";ctx.lineWidth=maj?1.5:.8;ctx.stroke();
    if(maj){ctx.fillStyle="#1e3a8a";ctx.font="bold 10px Inter,sans-serif";ctx.textAlign="center";ctx.fillText(v,x,y+22);}
  }
  const C=["#ef4444","#4f46e5","#10b981","#f59e0b","#8b5cf6"];
  (window._nlM||[]).forEach(({x:mv,c},i)=>{
    const px=toX(mv);
    ctx.beginPath();ctx.arc(px,y,6,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();
    ctx.strokeStyle="white";ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle="#1e3a8a";ctx.font="bold 9px Inter,sans-serif";ctx.textAlign="center";ctx.fillText(mv,px,y-14);
  });
  window._nlToX=toX;window._nlMn=mn;window._nlMx=mx;
};
window.nlClick=function(e){
  const cvs=_$("nlCvs");if(!cvs)return;
  const r=cvs.getBoundingClientRect(),px=e.clientX-r.left;
  const mn=window._nlMn||-10,mx=window._nlMx||10;
  const val=Math.round(((px-20)/(cvs.width-40))*(mx-mn)+mn);
  if(val<mn||val>mx)return;
  window._nlM=window._nlM||[];
  const idx=window._nlM.findIndex(m=>m.x===val);
  const C=["#ef4444","#4f46e5","#10b981","#f59e0b","#8b5cf6"];
  if(idx>=0)window._nlM.splice(idx,1);
  else window._nlM.push({x:val,c:C[window._nlM.length%C.length]});
  drawNL();
};

// =====================================================
// ½ FRACTION BAR
// =====================================================
function openFraction() {
  createWidget({id:"wFrac",title:"Бөлшек",icon:"½",
    color:"linear-gradient(135deg,#dc2626,#f87171)",width:280,
    html:`<div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;justify-content:center;">
        <input id="fNum" type="number" value="1" min="0" style="width:56px;padding:8px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:18px;font-weight:800;text-align:center;font-family:inherit;" oninput="drawFrac()"/>
        <span style="font-size:22px;font-weight:800;color:#374151;">/</span>
        <input id="fDen" type="number" value="4" min="1" style="width:56px;padding:8px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:18px;font-weight:800;text-align:center;font-family:inherit;" oninput="drawFrac()"/>
        <div><div id="fDec" style="font-size:13px;font-weight:700;color:#4f46e5;"></div><div id="fPct" style="font-size:11px;color:#64748b;"></div></div>
      </div>
      <canvas id="fCvs" width="255" height="50" style="display:block;border-radius:8px;border:1px solid #e2e6f0;margin-bottom:6px;"></canvas>
      <div style="background:#f3f4f6;border-radius:999px;height:8px;overflow:hidden;">
        <div id="fBar" style="height:100%;width:25%;background:linear-gradient(90deg,#ef4444,#f87171);border-radius:999px;transition:width .3s;"></div>
      </div>
    </div>`,
    onMount:()=>drawFrac()
  });
}
window.drawFrac=function(){
  const n=parseInt(_$("fNum")?.value)||0,den=parseInt(_$("fDen")?.value)||1;
  const pct=den>0?(n/den)*100:0,dec=den>0?Math.round((n/den)*1000)/1000:0;
  const d=_$("fDec"),p=_$("fPct"),b=_$("fBar");
  if(d)d.textContent="= "+dec; if(p)p.textContent=Math.round(pct)+"%";
  if(b)b.style.width=Math.min(100,Math.max(0,pct))+"%";
  const cvs=_$("fCvs");if(!cvs||den<=0)return;
  const ctx=cvs.getContext("2d"),W=cvs.width,H=cvs.height,tot=Math.min(den,20),bw=W/tot;
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<tot;i++){
    ctx.fillStyle=i<Math.min(n,den)?"#ef4444":"#f3f4f6";
    ctx.fillRect(i*bw+1,1,bw-2,H-2);
    ctx.strokeStyle="white";ctx.lineWidth=2;ctx.strokeRect(i*bw,0,bw,H);
    if(tot<=12){ctx.fillStyle=i<n?"white":"#94a3b8";ctx.font="bold 11px Inter,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(i+1,i*bw+bw/2,H/2);}
  }
};

// =====================================================
// 🌙 DARK MODE
// =====================================================
let darkOn=false;
function toggleDarkMode() {
  darkOn=!darkOn;
  const r=document.documentElement;
  if(darkOn){
    r.style.setProperty("--bg","#0f172a"); r.style.setProperty("--white","#1e293b");
    r.style.setProperty("--border","#334155"); r.style.setProperty("--text-1","#f1f5f9");
    r.style.setProperty("--text-2","#cbd5e1"); document.body.style.background="#0f172a";
  } else {
    r.style.setProperty("--bg","#f0f2f8"); r.style.setProperty("--white","#ffffff");
    r.style.setProperty("--border","#e2e6f0"); r.style.setProperty("--text-1","#0f172a");
    r.style.setProperty("--text-2","#334155"); document.body.style.background="";
  }
}

// =====================================================
// 🎡 SPIN THE WHEEL
// =====================================================
function spinWheel() {
  createWidget({id:"wSpin",title:"Spin the Wheel",icon:"🎡",
    color:"linear-gradient(135deg,#7c3aed,#c026d3)",width:300,
    html:`<div style="text-align:center;">
      <canvas id="wCvs" width="260" height="260" style="display:block;margin:0 auto 10px;cursor:pointer;border-radius:50%;" onclick="doSpin()"></canvas>
      <div id="wRes" style="font-size:18px;font-weight:800;color:#7c3aed;min-height:26px;margin-bottom:10px;"></div>
      <button onclick="doSpin()" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:white;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:8px;">🎡 Айналдыру!</button>
      <details style="text-align:left;"><summary style="font-size:11px;color:#64748b;cursor:pointer;margin-bottom:5px;">✏️ Тізімді өзгерту</summary>
        <textarea id="wItems" style="width:100%;height:80px;padding:8px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;resize:none;font-family:inherit;" oninput="drawSpin()">Оқушы 1
Оқушы 2
Оқушы 3
Оқушы 4
Оқушы 5</textarea>
      </details>
    </div>`,
    onMount:()=>{window._wA=0;window._wS=false;drawSpin();}
  });
}
window.drawSpin=function(){
  const cvs=_$("wCvs");if(!cvs)return;
  const ctx=cvs.getContext("2d"),W=260,cx=130,cy=130,R=122;
  const items=(_$("wItems")?.value||"").split("\n").map(s=>s.trim()).filter(Boolean);
  window._wItems=items;if(!items.length)return;
  const n=items.length,arc=Math.PI*2/n;
  const C=["#ef4444","#f97316","#f59e0b","#22c55e","#06b6d4","#4f46e5","#8b5cf6","#ec4899","#10b981","#3b82f6","#a855f7","#f43f5e"];
  ctx.clearRect(0,0,W,W);
  for(let i=0;i<n;i++){
    const s=(window._wA||0)+i*arc-Math.PI/2,e=s+arc;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,s,e);ctx.closePath();
    ctx.fillStyle=C[i%C.length];ctx.fill();ctx.strokeStyle="white";ctx.lineWidth=2;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(s+arc/2);ctx.textAlign="right";ctx.fillStyle="white";
    ctx.font=`bold ${Math.max(9,Math.min(13,110/n))}px Inter,sans-serif`;
    ctx.fillText(items[i].length>10?items[i].slice(0,10)+"…":items[i],R-10,4);ctx.restore();
  }
  ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle="white";ctx.fill();
  ctx.beginPath();ctx.moveTo(cx,cy-R+2);ctx.lineTo(cx-9,cy-R-14);ctx.lineTo(cx+9,cy-R-14);ctx.closePath();ctx.fillStyle="#1f2937";ctx.fill();
};
window.doSpin=function(){
  if(window._wS)return;window._wS=true;
  const btn=document.querySelector("#wSpin button");if(btn)btn.disabled=true;
  const tot=Math.PI*2*(8+Math.random()*10),dur=4000,st=performance.now(),sa=window._wA||0;
  const anim=(now)=>{
    const p=Math.min((now-st)/dur,1),ease=1-Math.pow(1-p,4);
    window._wA=sa+tot*ease;drawSpin();
    if(p<1){requestAnimationFrame(anim);}else{
      window._wS=false;if(btn)btn.disabled=false;
      const items=window._wItems||[],n=items.length,arc=Math.PI*2/n;
      const na=((window._wA%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
      const idx=Math.floor(((Math.PI*2-na+Math.PI/2+arc/2)%(Math.PI*2))/arc)%n;
      const r=_$("wRes");if(r)r.textContent="🎉 "+items[idx]+"!";
    }
  };
  requestAnimationFrame(anim);
};

// =====================================================
// 🎯 NAME PICKER
// =====================================================
function namePicker() {
  createWidget({id:"wName",title:"Оқушы таңдау",icon:"🎯",
    color:"linear-gradient(135deg,#0369a1,#0ea5e9)",width:250,
    html:`<div style="text-align:center;">
      <div id="npR" style="font-size:26px;font-weight:800;color:#0369a1;background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:10px;min-height:56px;display:flex;align-items:center;justify-content:center;">?</div>
      <button onclick="doPick()" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:white;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:8px;">🎯 Таңдау!</button>
      <details style="text-align:left;"><summary style="font-size:11px;color:#64748b;cursor:pointer;margin-bottom:5px;">✏️ Тізім</summary>
        <textarea id="npList" style="width:100%;height:80px;padding:8px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:12px;resize:none;font-family:inherit;">Айгерім
Болат
Дана
Ержан
Фарида</textarea>
      </details>
      <div id="npH" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;"></div>
    </div>`,
    onMount:()=>{window._npP=[];}
  });
}
window.doPick=function(){
  const names=(_$("npList")?.value||"").split("\n").map(s=>s.trim()).filter(Boolean),r=_$("npR"),h=_$("npH");
  if(!names.length||!r)return;
  const rem=names.filter(n=>!(window._npP||[]).includes(n));
  const pool=rem.length?rem:names;if(!rem.length)window._npP=[];
  let f=0;r.style.fontSize="14px";
  const t=setInterval(()=>{r.textContent=pool[Math.floor(Math.random()*pool.length)];f++;
    if(f>12){clearInterval(t);const w=pool[Math.floor(Math.random()*pool.length)];r.textContent="🎉 "+w;r.style.fontSize="20px";r.style.color="#7c3aed";
      window._npP=(window._npP||[]);window._npP.push(w);
      if(h){const c=document.createElement("span");c.style.cssText="background:#eef2ff;color:#4f46e5;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;";c.textContent=w;h.appendChild(c);}
    }
  },60);
};

// =====================================================
// 🏆 SCOREBOARD
// =====================================================
function scoreboard() {
  createWidget({id:"wScore",title:"Scoreboard",icon:"🏆",
    color:"linear-gradient(135deg,#b45309,#f59e0b)",width:280,
    html:`<div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <input id="sbN" placeholder="Команда атауы" style="flex:1;padding:7px 9px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:13px;font-family:inherit;"/>
        <button onclick="sbAdd()" style="padding:7px 12px;border:none;border-radius:8px;background:#f59e0b;color:white;font-weight:700;font-size:13px;cursor:pointer;">+</button>
      </div>
      <div id="sbList" style="display:flex;flex-direction:column;gap:5px;max-height:260px;overflow-y:auto;">
        <div style="text-align:center;color:#94a3b8;font-size:12px;padding:14px;">Команда қосыңыз</div>
      </div>
      <button onclick="sbReset()" style="width:100%;margin-top:8px;padding:7px;border:1px solid #e2e6f0;border-radius:8px;background:#f9fafb;color:#64748b;font-size:12px;font-weight:700;cursor:pointer;">↺ Нөлге қайтару</button>
    </div>`,
    onMount:()=>{window._sbT=[];}
  });
}
window.sbAdd=function(){
  const n=_$("sbN")?.value.trim();if(!n)return;
  const C=["#ef4444","#4f46e5","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
  window._sbT=(window._sbT||[]);window._sbT.push({name:n,score:0,color:C[window._sbT.length%C.length]});
  _$("sbN").value="";sbRender();
};
window.sbChg=function(i,d){if(window._sbT?.[i]!==undefined){window._sbT[i].score+=d;sbRender();}};
window.sbDel=function(i){window._sbT?.splice(i,1);sbRender();};
window.sbReset=function(){(window._sbT||[]).forEach(t=>t.score=0);sbRender();};
function sbRender(){
  const el=_$("sbList");if(!el)return;
  const t=window._sbT||[];
  if(!t.length){el.innerHTML=`<div style="text-align:center;color:#94a3b8;font-size:12px;padding:14px;">Команда қосыңыз</div>`;return;}
  const s=[...t].sort((a,b)=>b.score-a.score);
  const M=["🥇","🥈","🥉"];
  el.innerHTML=s.map((tm,rank)=>{const oi=t.indexOf(tm);return`
    <div style="display:flex;align-items:center;gap:8px;background:${rank===0?"#fef3c7":"#f9fafb"};border:1.5px solid ${rank===0?"#fbbf24":"#e2e6f0"};border-radius:10px;padding:8px 10px;">
      <span style="font-size:16px;">${M[rank]||"🔵"}</span>
      <div style="flex:1;font-size:13px;font-weight:700;">${tm.name}</div>
      <div style="font-size:22px;font-weight:800;color:${tm.color};min-width:34px;text-align:center;">${tm.score}</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <button onclick="sbChg(${oi},1)" style="width:24px;height:20px;border:none;border-radius:5px;background:#f0fdf4;color:#16a34a;font-size:13px;font-weight:800;cursor:pointer;line-height:1;">+</button>
        <button onclick="sbChg(${oi},-1)" style="width:24px;height:20px;border:none;border-radius:5px;background:#fef2f2;color:#dc2626;font-size:13px;font-weight:800;cursor:pointer;line-height:1;">-</button>
      </div>
      <button onclick="sbDel(${oi})" style="width:20px;height:20px;border:none;background:transparent;color:#94a3b8;font-size:12px;cursor:pointer;">✕</button>
    </div>`;}).join("");
}

// =====================================================
// ⏱ TIMER WIDGET
// =====================================================
function timerWidget() {
  createWidget({id:"wTimer",title:"Таймер",icon:"⏱",
    color:"linear-gradient(135deg,#0f172a,#1e3a8a)",width:220,
    html:`<div style="text-align:center;">
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;">
        <input id="tmM" type="number" value="5" min="0" max="99" style="width:54px;padding:7px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:22px;font-weight:800;text-align:center;font-family:monospace;"/>
        <span style="font-size:22px;font-weight:800;">:</span>
        <input id="tmS" type="number" value="0" min="0" max="59" style="width:54px;padding:7px;border:1.5px solid #e2e6f0;border-radius:8px;font-size:22px;font-weight:800;text-align:center;font-family:monospace;"/>
      </div>
      <div id="tmD" style="font-size:50px;font-weight:800;color:#0f172a;font-family:monospace;letter-spacing:.05em;background:#f0f2f8;border-radius:14px;padding:10px;margin-bottom:10px;transition:background .3s;">05:00</div>
      <div style="background:#e2e6f0;border-radius:999px;height:8px;overflow:hidden;margin-bottom:10px;">
        <div id="tmBar" style="height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#86efac);border-radius:999px;transition:width .5s,background .5s;"></div>
      </div>
      <div style="display:flex;gap:6px;">
        <button id="tmBtn" onclick="tmToggle()" style="flex:1;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#059669,#10b981);color:white;font-size:13px;font-weight:700;cursor:pointer;">▶ Бастау</button>
        <button onclick="tmReset()" style="padding:10px 13px;border:1px solid #e2e6f0;border-radius:10px;background:#f9fafb;color:#374151;font-size:13px;cursor:pointer;">↺</button>
      </div>
    </div>`,
    onMount:()=>{window._tmR=false;window._tmI=null;window._tmSt=false;window._tmL=5*60;window._tmTo=5*60;}
  });
}
window.tmToggle=function(){
  const btn=_$("tmBtn");
  if(window._tmR){clearInterval(window._tmI);window._tmR=false;if(btn){btn.textContent="▶ Жалғастыру";btn.style.background="linear-gradient(135deg,#059669,#10b981)";}}
  else{
    if(window._tmL<=0){tmReset();return;}
    if(!window._tmSt){const m=parseInt(_$("tmM")?.value||5),s=parseInt(_$("tmS")?.value||0);window._tmTo=m*60+s;window._tmL=window._tmTo;window._tmSt=true;}
    window._tmR=true;if(btn){btn.textContent="⏸ Тоқтату";btn.style.background="linear-gradient(135deg,#dc2626,#ef4444)";}
    window._tmI=setInterval(()=>{window._tmL--;tmUpd();if(window._tmL<=0){clearInterval(window._tmI);window._tmR=false;const d=_$("tmD");if(d){d.style.background="#fef2f2";d.style.color="#dc2626";}if(btn){btn.textContent="⏰ Аяқталды!";btn.style.background="#fef2f2";btn.style.color="#dc2626";}}},1000);
  }
};
function tmUpd(){
  const l=window._tmL||0,to=window._tmTo||1,d=_$("tmD"),b=_$("tmBar");
  if(d)d.textContent=String(Math.floor(l/60)).padStart(2,"0")+":"+String(l%60).padStart(2,"0");
  const p=(l/to)*100;
  if(b){b.style.width=p+"%";b.style.background=p>50?"linear-gradient(90deg,#22c55e,#86efac)":p>20?"linear-gradient(90deg,#f59e0b,#fbbf24)":"linear-gradient(90deg,#ef4444,#f87171)";}
}
window.tmReset=function(){
  clearInterval(window._tmI);window._tmR=false;window._tmSt=false;
  const m=parseInt(_$("tmM")?.value||5),s=parseInt(_$("tmS")?.value||0);
  window._tmTo=m*60+s;window._tmL=window._tmTo;tmUpd();
  const btn=_$("tmBtn"),d=_$("tmD");
  if(btn){btn.textContent="▶ Бастау";btn.style.background="linear-gradient(135deg,#059669,#10b981)";btn.style.color="white";}
  if(d){d.style.background="#f0f2f8";d.style.color="#0f172a";}
};

console.log("✅ extras.js жүктелді - барлық мүмкіндіктер дайын");

// ── Window exports (module scope fix) ──────────────
window.toggleDrawMode = toggleDrawMode;
window.toggleBgPicker = toggleBgPicker;
window.openDice = openDice;
window.openTrafficLight = openTrafficLight;
window.openSoundMeter = openSoundMeter;
window.openDateWidget = openDateWidget;
window.openClock = openClock;
window.openRuler = openRuler;
window.openProtractor = openProtractor;
window.openCalculator = openCalculator;
window.openNumberLine = openNumberLine;
window.openFraction = openFraction;
window.toggleDarkMode = toggleDarkMode;
window.spinWheel = spinWheel;
window.namePicker = namePicker;
window.scoreboard = scoreboard;
window.timerWidget = timerWidget;
window.updateCover = updateCover;
window.sbRender = sbRender;
window.tmUpd = tmUpd;
