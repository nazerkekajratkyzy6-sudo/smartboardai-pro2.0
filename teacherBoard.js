console.log("🔥 teacherBoard.js жүктелді!");

import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  set,
  onValue
} from "./firebaseConfig.js";

// Көмекші DOM функция
const $ = (id) => document.getElementById(id);

// Негізгі элементтер
const statusBar    = $("statusBar");
const logoutBtn    = $("logoutBtn");
const createRoomBtn = $("createRoomBtn");
const copyRoomBtn   = $("copyRoomBtn");

const roomIdLabel  = $("roomIdLabel");
const roomIdLabel2 = $("roomIdLabel2");

const boardCanvas  = $("boardCanvas");
const lessonTitle  = $("lessonTitle");

const aiPrompt     = $("aiPrompt");
const aiGenerateBtn = $("aiGenerateBtn");

const answersBox   = $("answersBox");
const studentsList = $("studentsList");
const emojiStats   = $("emojiStats");

let currentRoomId = null;
let emojiCounts = {
  "🙂": 0,
  "😐": 0,
  "😕": 0,
  "😢": 0,
  "🤩": 0
};

// 🔹 Статус шығару
function setStatus(msg) {
  if (statusBar) statusBar.textContent = msg;
}

// 🔹 Room ID генераторы
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

// 🔹 Оқушы жауаптарын тыңдау
function listenAnswers(roomId) {
  const answersRef = ref(db, `rooms/${roomId}/answers`);

  onValue(answersRef, (snapshot) => {
    answersBox.innerHTML = "";

    if (!snapshot.exists()) {
      answersBox.innerHTML = `<i class="small">Әзірге жауап жоқ…</i>`;
      return;
    }

    const studentsSet = new Set();

    snapshot.forEach((child) => {
      const data = child.val();
      studentsSet.add(data.student);

      const div = document.createElement("div");
      div.className = "answer-item";
      div.innerHTML = `
        <b>${data.student}</b><br/>
        ${data.text}
        <br/>
        <small>${new Date(data.time).toLocaleTimeString()}</small>
      `;
      answersBox.appendChild(div);
    });

    // Оқушылар тізімі
    studentsList.innerHTML = "";
    studentsSet.forEach((name) => {
      const li = document.createElement("div");
      li.textContent = "👤 " + name;
      studentsList.appendChild(li);
    });
  });
}

// 🔹 Жаңа board-карточка жасау (AI генератордан, немесе қолмен)
function addBoardCard(text) {
  if (!boardCanvas) return;

  const card = document.createElement("div");
  card.className = "board-card";
  card.innerHTML = `
    <div class="board-card-body">
      ${text.replace(/\n/g, "<br/>")}
    </div>
  `;
  boardCanvas.appendChild(card);
}

// 🔹 AI шаблон чиптері (тек текст генерациялайды, OpenAI шақырмайды)
function initAIChips() {
  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const type = chip.dataset.ai;
      let tpl = "";

      switch (type) {
        case "quiz5":
          tpl = "5 сұрақтық тест құрастыр: \n1) Сұрақ...\nA)\nB)\nC)\nD)\nДұрыс жауап: ";
          break;
        case "quiz10":
          tpl = "10 сұрақтық викторина құрастыр, тақырып: ...";
          break;
        case "rebus":
          tpl = "«... » тақырыбына бастауыш сыныпқа арналған қарапайым ребус ойлап тап.";
          break;
        case "anagram":
          tpl = "«... » сөзінен анаграммалар құрастыр, 1 дұрыс, 3 қате нұсқа.";
          break;
        case "truthfalse":
          tpl = "Тақырып бойынша 5 тұжырым жаз, әрқайсысы 'шын' немесе 'жалған' белгісімен.";
          break;
        case "pisa":
          tpl = "PISA форматында өмірлік жағдайға байланысты есеп жаз, 4 жауап нұсқасымен.";
          break;
        case "reflection":
          tpl = "Сабақ соңына 5 рефлексия сұрағын жаз: не үйренді, не қиын болды, т.б.";
          break;
      }

      aiPrompt.value = tpl;
    });
  });
}

// 🔹 Эмоция батырмалары
function initEmojis() {
  const emojiButtons = document.querySelectorAll(".emoji-btn");
  emojiButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const e = btn.dataset.emoji;
      if (!emojiCounts[e]) emojiCounts[e] = 0;
      emojiCounts[e]++;

      const parts = Object.entries(emojiCounts)
        .filter(([_, cnt]) => cnt > 0)
        .map(([emo, cnt]) => `${emo} — ${cnt}`);

      emojiStats.textContent = parts.length
        ? parts.join(" · ")
        : "";
    });
  });
}

// 🔹 Бастапқы инициализация
function init() {
  setStatus("Дайын.");

  // Auth бақылау (қалауыңша)
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Қаласаң, логинге қайтаратын жер
      // window.location.href = "./auth/login.html";
      setStatus("Қонақ режимі (auth жоқ)");
    } else {
      setStatus("Кіру: " + (user.email || "мұғалім"));
    }
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "./index.html";
      } catch (e) {
        alert("Шығуда қате: " + e.message);
      }
    });
  }

  // Жаңа Room
  createRoomBtn.addEventListener("click", async () => {
    const id = generateRoomId();
    currentRoomId = id;

    await set(ref(db, "rooms/" + id), {
      createdAt: Date.now(),
      lessonTitle: lessonTitle.value || "",
      answers: {}
    });

    roomIdLabel.textContent = id;
    roomIdLabel2.textContent = id;

    setStatus("Жаңа Room жасалды: " + id);

    listenAnswers(id);
  });

  // Room көшіру
  copyRoomBtn.addEventListener("click", async () => {
    if (!currentRoomId) {
      alert("Алдымен Room жасаңыз.");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentRoomId);
      setStatus("Room ID көшірілді: " + currentRoomId);
    } catch (e) {
      alert("Көшіруде қате: " + e.message);
    }
  });

  // AI → карточкаға қосу (әзірге тек текстті тақтаға шығарады)
  aiGenerateBtn.addEventListener("click", () => {
    const text = aiPrompt.value.trim();
    if (!text) {
      alert("Алдымен мәтін жазыңыз.");
      return;
    }
    addBoardCard(text);
    aiPrompt.value = "";
  });

  initAIChips();
  initEmojis();
}

// Бет жүктелгенде іске қосамыз
window.addEventListener("DOMContentLoaded", init);
