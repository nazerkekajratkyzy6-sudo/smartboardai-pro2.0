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

// -------------------- JOIN --------------------
$("joinBtn")?.addEventListener("click", async () => {
  studentName = $("studentName").value.trim();
  roomId = $("roomId").value.trim();

  if (!studentName || !roomId) {
    $("joinStatus").textContent = "Атыңызды және Room ID енгізіңіз.";
    return;
  }

  // Firebase-ке студентті жазу
  await set(ref(db, `rooms/${roomId}/students/${studentName}`), {
    name: studentName,
    joinedAt: Date.now()
  });

  $("joinStatus").textContent = "Сіз бөлмеге қосылдыңыз!";
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
    answer: text,
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
      ts: Date.now()
    });

    $("joinStatus").textContent = "Эмоция жіберілді!";
  });
});
