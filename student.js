// student.js — SmartBoardAI PRO Super Premium Student Panel
// AUTO MODE (URL: ?name=&room=&avatar=) + FORM MODE (өз қолымен кіру)

import { db, ref, set, push } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let studentName = "";
let roomId = "";
let avatar = "";

// ---------- 1. URL-ПАРАМЕТРЛЕР (AUTO MODE) ----------
const params = new URLSearchParams(window.location.search);
const autoName = params.get("name");
const autoRoom = params.get("room");
const autoAvatar = params.get("avatar");

// Егер URL арқылы келсе → автомат толтырамыз
if (autoName && autoRoom) {
  studentName = autoName;
  roomId = autoRoom;
  avatar = autoAvatar || "😀";

  if ($("studentName")) $("studentName").value = studentName;
  if ($("roomId")) $("roomId").value = roomId;

  // Аватар тізімінен сәйкесін таңдау
  document.querySelectorAll(".avatar").forEach((el) => {
    if (el.dataset.avatar === avatar) {
      el.classList.add("selected");
    }
  });

  // Автоматты тіркеу (мұғалім панеліндегі оқушылар тізіміне түсу)
  autoRegisterStudent();
}

// ---------- 2. АВТО-ТІРКЕУ (AUTO MODE ҮШІН) ----------
async function autoRegisterStudent() {
  if (!studentName || !roomId) return;

  await set(ref(db, `rooms/${roomId}/students/${studentName}`), {
    name: studentName,
    avatar: avatar || "😀",
    joinedAt: Date.now(),
  });

  if ($("joinStatus")) {
    $("joinStatus").textContent = "URL арқылы бөлмеге қосылдыңыз ✅";
    $("joinStatus").style.color = "#059669";
  }
}

// ---------- 3. АВАТАР ТАҢДАУ (FORM MODE ҮШІН) ----------
document.querySelectorAll(".avatar").forEach((el) => {
  el.addEventListener("click", () => {
    document
      .querySelectorAll(".avatar")
      .forEach((a) => a.classList.remove("selected"));
    el.classList.add("selected");
    avatar = el.dataset.avatar;
  });
});

// ---------- 4. FORM MODE — БӨЛМЕГЕ ҚОСЫЛУ ----------
$("joinBtn")?.addEventListener("click", async () => {
  const nameInput = $("studentName")?.value.trim();
  const roomInput = $("roomId")?.value.trim();

  studentName = nameInput;
  roomId = roomInput;

  if (!studentName || !roomId || !avatar) {
    if ($("joinStatus")) {
      $("joinStatus").textContent = "Атыңызды, Room ID-ны және аватарды таңдаңыз!";
      $("joinStatus").style.color = "#b91c1c";
    }
    return;
  }

  await set(ref(db, `rooms/${roomId}/students/${studentName}`), {
    name: studentName,
    avatar: avatar,
    joinedAt: Date.now(),
  });

  if ($("joinStatus")) {
    $("joinStatus").textContent = "Сіз бөлмеге қосылдыңыз ✅";
    $("joinStatus").style.color = "#059669";
  }
});

// ---------- 5. JOIN ТЕКСЕРУ ХЕЛПЕРІ ----------
function ensureJoined() {
  if (studentName && roomId) return true;

  if ($("joinStatus")) {
    $("joinStatus").textContent = "Алдымен бөлмеге қосылыңыз!";
    $("joinStatus").style.color = "#b91c1c";
  }
  return false;
}

// ---------- 6. ТАПСЫРМА ЖАУАБЫН ЖІБЕРУ ----------
$("sendAnswerBtn")?.addEventListener("click", async () => {
  if (!ensureJoined()) return;

  const text = $("answerInput")?.value.trim();
  if (!text) {
    if ($("answerMsg")) {
      $("answerMsg").textContent = "Жауап бос!";
      $("answerMsg").style.color = "#b91c1c";
    }
    return;
  }

  await set(ref(db, `rooms/${roomId}/answers/${studentName}`), {
    name: studentName,
    avatar: avatar || "😀",
    text,
    ts: Date.now(),
  });

  if ($("answerMsg")) {
    $("answerMsg").textContent = "Жауап жіберілді ✅";
    $("answerMsg").style.color = "#059669";
  }
  if ($("answerInput")) $("answerInput").value = "";
});

// ---------- 7. БІР СӨЗДІК РЕФЛЕКСИЯ ----------
$("sendWordBtn")?.addEventListener("click", async () => {
  if (!ensureJoined()) return;

  const word = $("wordInput")?.value.trim();
  if (!word) {
    if ($("wordMsg")) {
      $("wordMsg").textContent = "Сөз бос!";
      $("wordMsg").style.color = "#b91c1c";
    }
    return;
  }

  await push(ref(db, `rooms/${roomId}/reflection/words`), {
    word,
    name: studentName,
    avatar: avatar || "😀",
    ts: Date.now(),
  });

  if ($("wordMsg")) {
    $("wordMsg").textContent = "Қосылды ✅";
    $("wordMsg").style.color = "#059669";
  }
  if ($("wordInput")) $("wordInput").value = "";
});

// ---------- 8. ЭМОЦИЯЛЫҚ РЕФЛЕКСИЯ ----------
document.querySelectorAll(".emoji-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!ensureJoined()) return;

    const emoji = btn.dataset.emoji;

    await push(ref(db, `rooms/${roomId}/reflection/emoji`), {
      emoji,
      name: studentName,
      avatar: avatar || "😀",
      ts: Date.now(),
    });

    if ($("joinStatus")) {
      $("joinStatus")..textContent = "Эмоция жіберілді ✅";
      $("joinStatus").style.color = "#059669";
    }
  });
});
