import { db, ref, set } from "./firebaseConfig.js";

let selectedAvatar = "";
let studentName = "";
let roomId = "";

document.querySelectorAll(".avatar").forEach(a => {
  a.addEventListener("click", () => {
    document.querySelectorAll(".avatar").forEach(x => x.classList.remove("active"));
    a.classList.add("active");
    selectedAvatar = a.textContent;
  });
});

async function joinRoom() {
  studentName = document.getElementById("studentName").value.trim();
  roomId = document.getElementById("roomId").value.trim();

  if (!studentName || !roomId || !selectedAvatar) {
    document.getElementById("joinStatus").textContent =
      "Барлық өрісті толтырыңыз!";
    return;
  }

  await set(ref(db, `rooms/${roomId}/students/${studentName}`), {
    name: studentName,
    avatar: selectedAvatar,
    joinedAt: Date.now()
  });

  // Оқушы панеліне өтеді
  window.location.href =
    `/student-panel.html?name=${encodeURIComponent(studentName)}&room=${roomId}&avatar=${encodeURIComponent(selectedAvatar)}`;
}

document.getElementById("joinBtn").addEventListener("click", joinRoom);
