console.log("student.js жүктелді");

import {
  auth,
  db,
  signInAnonymously,
  onAuthStateChanged
} from "./firebaseConfig.js";

import {
  ref,
  set,
  get,
  child
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 🔹 DOM элементтер
const joinSection = document.getElementById("joinSection");
const answerBox = document.getElementById("answerBox");

const nameInput = document.getElementById("studentName");
const roomInput = document.getElementById("roomId");

const joinBtn = document.getElementById("joinBtn");
const joinMsg = document.getElementById("joinMsg");

const studentNameLabel = document.getElementById("studentNameLabel");
const roomLabel = document.getElementById("roomLabel");

const answerInput = document.getElementById("answerInput");
const sendBtn = document.getElementById("sendBtn");
const statusMsg = document.getElementById("statusMsg");

// 🔹 Қолданушы ID
let UID = null;

// 🔹 Firebase қауіпсіз кіру
onAuthStateChanged(auth, (user) => {
  if (user) {
    UID = user.uid;
    console.log("Оқушы аноним кіру:", UID);
  } else {
    signInAnonymously(auth);
  }
});

// 🔹 Кіру батырмасы
joinBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const room = roomInput.value.trim().toUpperCase();

  if (!name || !room) {
    joinMsg.textContent = "❗ Атыңызды және Room ID жазыңыз.";
    joinMsg.style.color = "red";
    return;
  }

  // 🔥 Room бар-жоғын тексеру
  const roomRef = ref(db, `rooms/${room}/status`);

  const snap = await get(roomRef);

  if (!snap.exists()) {
    joinMsg.textContent = "❗ Мұғалім бөлмесі табылмады.";
    joinMsg.style.color = "red";
    return;
  }

  // 🔥 Оқушыны тіркеу
  await set(ref(db, `rooms/${room}/students/${UID}`), {
    name: name,
    joinedAt: Date.now()
  });

  studentNameLabel.textContent = name;
  roomLabel.textContent = room;

  joinSection.style.display = "none";
  answerBox.style.display = "block";

  joinMsg.textContent = "";
});

// 🔹 Жауап жіберу
sendBtn.addEventListener("click", async () => {
  const text = answerInput.value.trim();
  const room = roomLabel.textContent;

  if (!text) {
    statusMsg.textContent = "❗ Жауап бос.";
    statusMsg.style.color = "red";
    return;
  }

  await set(ref(db, `rooms/${room}/answers/${UID}`), {
    name: studentNameLabel.textContent,
    text: text,
    time: Date.now()
  });

  statusMsg.textContent = "✔ Жауап жіберілді!";
  statusMsg.style.color = "green";

  answerInput.value = "";
});
