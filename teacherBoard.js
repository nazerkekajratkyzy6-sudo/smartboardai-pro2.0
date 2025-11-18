console.log("🔥 teacherBoard.js жүктелді!");
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  ref,
  set,
  push
} from "./firebaseConfig.js";

// UI helpers
function $(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  $("statusBar").textContent = text;
}

// Random Room ID
function randomRoomId() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

let currentRoomId = null;

// ========== EVENTS ==========

// Жаңа Room құру
$("createRoomBtn").onclick = async () => {
  const roomId = randomRoomId();
  currentRoomId = roomId;

  // Firebase-ке жазамыз
  await set(ref(db, "rooms/" + roomId), {
    createdAt: Date.now(),
    lessonTitle: "",
    board: [],
    students: {}
  });

  // Экранға шығару
  $("roomIdLabel").textContent = roomId;
  $("roomIdLabel2").textContent = roomId;

  setStatus("Жаңа бөлме жасалды: " + roomId);
};

// Room ID көшіру
$("copyRoomBtn").onclick = () => {
  if (!currentRoomId) return;
  navigator.clipboard.writeText(currentRoomId);
  setStatus("Room ID көшірілді");
};

// Logout
$("logoutBtn").onclick = () => {
  signOut(auth);
  window.location.href = "login.html";
};
// ------------------------------
//   ⚡ ОҚУШЫ ЖАУАПТАРЫН LIVE ТҮРДЕ ТЫҢДАУ
// ------------------------------
import { db, ref, onValue } from "./firebaseConfig.js";

function listenAnswers(roomId) {
    const answersRef = ref(db, `rooms/${roomId}/answers`);

    onValue(answersRef, (snapshot) => {
        const answersBox = document.getElementById("answersBox");

        if (!answersBox) return;

        answersBox.innerHTML = ""; // тазарту

        snapshot.forEach((child) => {
            const data = child.val();

            const div = document.createElement("div");
            div.className = "answerItem";

            div.innerHTML = `
                <b>${data.student}</b>: ${data.text}
                <br>
                <small>${new Date(data.time).toLocaleTimeString()}</small>
                <hr>
            `;

            answersBox.appendChild(div);
        });
    });
}



