// student.js — SmartBoardAI PRO Premium Student Panel

import { db, ref, set, push } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let studentName = "";
let roomId = "";
let avatar = "";

// -------- URL PARAMS --------
const params = new URLSearchParams(window.location.search);
studentName = params.get("name") || "";
roomId = params.get("room") || "";
avatar = params.get("avatar") || "🙂";

// If something missing → block actions
function checkJoin() {
  return studentName && roomId;
}

// -------- SEND ANSWER --------
$("sendAnswerBtn")?.addEventListener("click", async () => {
  if (!checkJoin()) {
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
    avatar,
    text,
    ts: Date.now(),
  });

  $("answerMsg").textContent = "Жауап жіберілді!";
  $("answerInput").value = "";
});

// -------- WORD REFLECTION --------
$("sendWordBtn")?.addEventListener("click", async () => {
  if (!checkJoin()) {
    $("wordMsg").textContent = "Алдымен бөлмеге қосылыңыз!";
    return;
  }

  const w = $("wordInput").value.trim();
  if (!w) {
    $("wordMsg").textContent = "Бос сөз!";
    return;
  }

  await push(ref(db, `rooms/${roomId}/reflection/words`), {
    word: w,
    name: studentName,
    avatar,
    ts: Date.now()
  });

  $("wordMsg").textContent = "Қосылды!";
  $("wordInput").value = "";
});

// -------- EMOJI REACTION --------
document.querySelectorAll(".emoji-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!checkJoin()) {
      $("joinStatus").textContent = "Алдымен бөлмеге қосылыңыз!";
      return;
    }

    const emoji = btn.dataset.emoji;

    await push(ref(db, `rooms/${roomId}/reflection/emoji`), {
      emoji,
      name: studentName,
      avatar,
      ts: Date.now()
    });

    $("joinStatus").textContent = "Эмоция жіберілді!";
  });
});
