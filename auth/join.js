// SmartBoardAI PRO — JOIN SYSTEM + AVATAR (AUTH VERSION)

import {
  db,
  ref,
  set,
  push
} from "../firebaseConfig.js";   // /auth/ ішінен шығу

console.log("JOIN.js from /auth loaded ✔");

document.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("studentName");
  const roomInput = document.getElementById("roomId");
  const joinBtn = document.getElementById("joinBtn");
  const msg = document.getElementById("msg");

  const avatarBoxes = document.querySelectorAll(".avatar");
  const selectedAvatarInput = document.getElementById("selectedAvatar");

  // AVATAR SELECT
  avatarBoxes.forEach((box) => {
    box.addEventListener("click", () => {
      avatarBoxes.forEach((b) => b.classList.remove("selected"));
      box.classList.add("selected");
      selectedAvatarInput.value = box.dataset.avatar;
    });
  });

  // JOIN BUTTON
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

    try {
      // 🔹 Room бар-жоқ деп тексермейміз — бірден студентті жазамыз.
      const studentsRef = ref(db, "rooms/" + roomId + "/students");
      const newStudent = push(studentsRef);

      await set(newStudent, {
        name: name,
        avatar: avatar,
        joinedAt: Date.now()
      });

      // 🔹 Тікелей student.html бетіне өтеміз (түбірде)
      const url =
        `../student.html?name=${encodeURIComponent(name)}&room=${roomId}&avatar=${encodeURIComponent(avatar)}`;

      window.location.href = url;
    } catch (e) {
      console.error(e);
      msg.textContent = "Кіру кезінде қате кетті. Кейінірек қайталап көріңіз.";
    }
  });
});
