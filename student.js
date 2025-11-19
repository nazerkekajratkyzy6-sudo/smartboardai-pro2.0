console.log("student.js жүктелді");

// Firebase-тен керек функцияларды аламыз
import {
  db,
  ref,
  get,
  push
} from "./firebaseConfig.js";

// DOM элементтер
const joinSection  = document.getElementById("joinSection");
const writeSection = document.getElementById("writeSection");

const nameInput = document.getElementById("studentName");
const roomInput = document.getElementById("roomId");

const joinBtn  = document.getElementById("joinBtn");
const joinMsg  = document.getElementById("joinMsg");

const answerBox = document.getElementById("answerBox");
const sendBtn   = document.getElementById("sendBtn");
const sendMsg   = document.getElementById("sendMsg");

let studentName = "";
let roomId = "";

// ⚡ 1) Room-ға қосылу
joinBtn.addEventListener("click", async () => {
  studentName = nameInput.value.trim();
  roomId      = roomInput.value.trim();

  if (!studentName || !roomId) {
    joinMsg.textContent = "Атыңызды және Room ID толтырыңыз!";
    joinMsg.style.color = "red";
    return;
  }

  // Мұғалім бөлмесі бар ма?
  const roomRef = ref(db, "rooms/" + roomId);
  const roomSnap = await get(roomRef);

  if (!roomSnap.exists()) {
    joinMsg.textContent = "Мұғалім бөлмесі табылмады!";
    joinMsg.style.color = "red";
    return;
  }

  // Сәтті қосылса
  joinMsg.textContent = "Бөлмеге қосылдыңыз ✔";
  joinMsg.style.color = "green";

  joinSection.style.display  = "none";
  writeSection.style.display = "block";

  document.getElementById("joinedInfo").textContent =
    `Қосылдыңыз: ${studentName} · Room: ${roomId}`;
});

// ⚡ 2) Жауап жіберу
sendBtn.addEventListener("click", async () => {
  const answer = answerBox.value.trim();

  if (answer === "") {
    sendMsg.textContent = "Жауап бос болмауы керек!";
    sendMsg.style.color = "red";
    return;
  }

  const answersRef = ref(db, `rooms/${roomId}/answers`);
  await push(answersRef, {
    student: studentName,
    text: answer,
    time: Date.now()
  });

  sendMsg.textContent = "Жауап жіберілді ✔";
  sendMsg.style.color = "green";
  answerBox.value = "";
});
