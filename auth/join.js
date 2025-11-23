// SmartBoardAI PRO — JOIN SYSTEM + AVATAR (AUTH FOLDER VERSION)

import {
  db,
  ref,
  set,
  push,
  onValue
} from "../firebaseConfig.js";   // <<<<< МАҢЫЗДЫ: /auth/ ішінен шығу !!!

console.log("JOIN.js from /auth loaded ✔");

document.addEventListener("DOMContentLoaded", () => {

  const nameInput = document.getElementById("studentName");
  const roomInput = document.getElementById("roomId");
  const joinBtn = document.getElementById("joinBtn");
  const msg = document.getElementById("msg");

  const avatarBoxes = document.querySelectorAll(".avatar");
  const selectedAvatarInput = document.getElementById("selectedAvatar");

  // ---------------------------
  // AVATAR SELECT
  // ---------------------------
  avatarBoxes.forEach(box => {
    box.addEventListener("click", () => {
      avatarBoxes.forEach(b => b.classList.remove("selected"));
      box.classList.add("selected");
      selectedAvatarInput.value = box.dataset.avatar;
    });
  });

  // ---------------------------
  // JOIN BUTTON CLICK
  // ---------------------------
  joinBtn.addEventListener("click", async () => {

    const name = nameInput.value.trim();
    const roomId = roomInput.value.trim().toUpperCase();
    const avatar = selectedAvatarInput.value;

    msg.textContent = "";

    if (!name) {
      msg.textContent = "Атыңызды жазыңыз";
      return;
    }
    if (!avatar) {
      msg.textContent = "Аватар таңдаңыз!";
      return;
    }
    if (!roomId) {
      msg.textContent = "Room ID жазыңыз";
      return;
    }

    const roomRef = ref(db, "rooms/" + roomId + "/students");

    onValue(roomRef, (snapshot) => {

      // ❗ Дұрыс шарт — бөлме жоқ болса
      if (!snapshot.exists()) {
        msg.textContent = "Мұндай бөлме жоқ!";
        return;
      }

      // Студентті тіркеу
      const newStudent = push(roomRef);
      set(newStudent, {
        name: name,
        avatar: avatar,
        joinedAt: Date.now()
      });

      // student.html бетіне бағыттау (түбірде орналасқан)
      window.location.href =
        `../student.html?name=${encodeURIComponent(name)}&room=${roomId}&avatar=${encodeURIComponent(avatar)}`;

    }, { onlyOnce: true });

  });

});
