// student.js — SmartBoardAI PRO (оқушы жағы)

import { db, ref, set, get, push } from "./firebaseConfig.js";

let studentName = "";
let roomId = "";

const nameInput = document.getElementById("nameInput");
const codeInput = document.getElementById("codeInput");
const joinBtn = document.getElementById("joinBtn");
const joinMsg = document.getElementById("joinMsg");

const lessonBox = document.getElementById("lessonBox");
const joinBox = document.getElementById("joinBox");
const studentNameLabel = document.getElementById("studentNameLabel");
const roomLabel = document.getElementById("roomLabel");
const answerInput = document.getElementById("answerInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const resultMsg = document.getElementById("resultMsg");

const savedName = localStorage.getItem("studentName");
const savedRoom = localStorage.getItem("roomId");
if (savedName && savedRoom) {
  studentName = savedName;
  roomId = savedRoom;
  showLessonBox();
}

function showLessonBox() {
  joinBox.style.display = "none";
  lessonBox.style.display = "block";
  studentNameLabel.textContent = studentName;
  roomLabel.textContent = roomId;
}

joinBtn?.addEventListener("click", async () => {
  studentName = nameInput.value.trim();
  roomId = codeInput.value.trim();
  if (!studentName || !roomId) {
    joinMsg.textContent = "Барлық өрісті толтырыңыз.";
    return;
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) {
    joinMsg.textContent = "Мұндай Room табылмады.";
    return;
  }

  const studentsRef = ref(db, `rooms/${roomId}/students`);
  const newRef = push(studentsRef);
  await set(newRef, {
    name: studentName,
    joinedAt: Date.now()
  });

  localStorage.setItem("studentName", studentName);
  localStorage.setItem("roomId", roomId);

  joinMsg.textContent = "";
  showLessonBox();
});

sendBtn?.addEventListener("click", async () => {
  const ans = answerInput.value.trim();
  if (!ans) {
    resultMsg.textContent = "Жауап бос!";
    return;
  }
  if (!roomId || !studentName) {
    resultMsg.textContent = "Алдымен Room-ға қосылыңыз.";
    return;
  }

  const ansRef = ref(db, `rooms/${roomId}/answers/${studentName}`);
  await set(ansRef, {
    answer: ans,
    ts: Date.now()
  });

  resultMsg.textContent = "✅ Жауап жіберілді!";
});

clearBtn?.addEventListener("click", () => {
  answerInput.value = "";
  resultMsg.textContent = "";
});
