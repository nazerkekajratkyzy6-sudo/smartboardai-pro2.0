console.log("teacherBoard.js жүктелді!");

import {
  auth,
  db,
  ref,
  set,
  push,
  get,
  onAuthStateChanged
} from "./firebaseConfig.js";


// ▪▪▪ ҚЫСҚА DOM функциялары
function $(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  const board = $("boardArea");
  board.innerHTML = `<div class="status">${text}</div>`;
}


// ▪▪▪ Room ID генерациясы
function randomRoomId() {
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


// ▪▪▪ LIVE тыңдау — оқушы жауаптары
function listenAnswers(roomId) {
  const answersRef = ref(db, "rooms/" + roomId + "/answers");

  onValue(answersRef, (snapshot) => {
    const data = snapshot.val();
    const box = $("answersBox");

    if (!data) {
      box.innerHTML = `<i class="small">Жауап әлі жоқ…</i>`;
      return;
    }

    let html = "";
    Object.keys(data).forEach((key) => {
      const item = data[key];
      html += `
        <div class="answer-item">
          <b>${item.name}</b><br>
          ${item.text}
          <hr>
        </div>
      `;
    });

    box.innerHTML = html;
  });
}


// ▪▪▪ Жаңа бөлме жасау
$("createRoomBtn").onclick = async () => {
  const roomId = randomRoomId();

  // Firebase-ке жаңа бөлме жазу
  await set(ref(db, "rooms/" + roomId), {
    createdAt: Date.now(),
    answers: {}
  });

  $("roomIdLabel").textContent = roomId;
  $("roomIdLabel2").textContent = roomId;

  setStatus("Жаңа бөлме жасалды: " + roomId);

  // LIVE тыңдау қосылады
  listenAnswers(roomId);
};


// ▪▪▪ Тақта қайта ашылса — тыңдауды авто қайта қосу
window.addEventListener("load", () => {
  const roomId = $("roomIdLabel").textContent;
  if (roomId && roomId !== "–") {
    listenAnswers(roomId);
  }
});
