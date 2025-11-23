// student.js — SmartBoardAI PRO 2.0 (Оқушы LIVE)

import {
  db,
  ref,
  set,
  push
} from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let studentName = "";
let roomId = "";

// -------------------- JOIN FUNCTION --------------------
async function joinRoom() {
  const nameInput = $("studentName");
  const roomInput = $("roomId");
  const statusEl = $("joinStatus");

  studentName = nameInput?.value.trim() || "";
  roomId = roomInput?.value.trim() || "";

  if (!studentName || !roomId) {
    if (statusEl) {
      statusEl.textContent = "Атыңызды және Room ID енгізіңіз.";
    }
    return false;
  }

  await set(ref(db, `rooms/${roomId}/students/${studentName}`), {
    name: studentName,
    joinedAt: Date.now()
  });

  if (statusEl) {
    statusEl.textContent = "Сіз бөлмеге қосылдыңыз!";
  }

  return true;
}

// -------------------- URL PARAMS (room + name) --------------------
const params = new URLSearchParams(window.location.search);
const autoName = params.get("name");
const autoRoom = params.get("room");

if (autoName && $("studentName")) {
  $("studentName").value = autoName;
}
if (autoRoom && $("roomId")) {
  $("roomId").value = autoRoom;
}

// Егер екеуі де бар болса → автомат қосылу
if (autoName && autoRoom) {
  joinRoom();
}

// -------------------- JOIN BUTTON --------------------
$("joinBtn")?.addEventListener("click", () => {
  joinRoom();
});

// -------------------- ANSWER SEND --------------------
$("sendAnswerBtn")?.addEventListener("click", async () => {
  if (!studentName || !roomId) {
    $("answerMsg").textContent = "Алдымен бөлмеге қосылыңыз!";
    return;
  }

  const text = $("answerInput").value.trim();
  if (!text) {
    $("answerMsg").textContent = "Жауап бос!";
    return;
  }

  await set(ref(db, `rooms/${roomId}/answers/${studentName}`), {
    name: studentName,
    text,
    ts: Date.now()
  });

  $("answerMsg").textContent = "Жауап жіберілді!";
  $("answerInput").value = "";
});

// -------------------- WORD CLOUD --------------------
$("sendWordBtn")?.addEventListener("click", async () => {
  if (!studentName || !roomId) {
    $("wordMsg").textContent = "Алдымен бөлмеге қосылыңыз!";
    return;
  }

  const w = $("wordInput").value.trim();
  if (!w) {
    $("wordMsg").textContent = "Сөз бос!";
    return;
  }

  await push(ref(db, `rooms/${roomId}/reflection/words`), {
    word: w,
    name: studentName,
    ts: Date.now()
  });

  $("wordMsg").textContent = "Қосылды!";
  $("wordInput").value = "";
});

// -------------------- EMOJI --------------------
document.querySelectorAll(".emoji-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!studentName || !roomId) {
      $("joinStatus").textContent = "Алдымен бөлмеге қосылыңыз!";
      return;
    }

    const emoji = btn.getAttribute("data-emoji");

    await push(ref(db, `rooms/${roomId}/reflection/emoji`), {
      emoji,
      name: studentName,
      ts: Date.now()
    });

    $("joinStatus").textContent = "Эмоция жіберілді!";
  });
});
