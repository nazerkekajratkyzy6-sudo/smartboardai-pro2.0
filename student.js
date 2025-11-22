import {
  db,
  ref,
  push,
  set
} from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let selectedAvatar = null;
let roomId = null;
let studentName = null;

/* --------------------------
      Аватар таңдау
--------------------------- */
document.querySelectorAll(".avatar-option").forEach((el) => {
  el.onclick = () => {
    document.querySelectorAll(".avatar-option")
      .forEach((x) => x.classList.remove("selected"));

    el.classList.add("selected");
    selectedAvatar = el.textContent.trim();
  };
});

/* --------------------------
      Кіру
--------------------------- */
$("joinBtn").onclick = () => {
  studentName = $("studentName").value.trim();
  roomId = $("roomInput").value.trim();

  if (!selectedAvatar) return alert("Аватар таңдаңыз!");
  if (!studentName) return alert("Атыңызды жазыңыз!");
  if (!roomId) return alert("Room ID жазыңыз!");

  $("welcomeMsg").textContent = `${selectedAvatar} ${studentName}, сіз бөлмеге кірдіңіз!`;

  document.querySelector(".center-wrapper").style.display = "none";
  $("workUI").classList.remove("hidden");
};

/* --------------------------
      Жауап жіберу
--------------------------- */
$("sendAnswerBtn").onclick = async () => {
  const txt = $("answerInput").value.trim();
  if (!txt) return;

  await push(ref(db, `rooms/${roomId}/answers`), {
    avatar: selectedAvatar,
    name: studentName,
    text: txt,
    time: Date.now()
  });

  $("answerInput").value = "";
};

/* --------------------------
      Эмоция жіберу
--------------------------- */
document.querySelectorAll(".emoji-btn").forEach((el) => {
  el.onclick = async () => {
    const emoji = el.dataset.emoji;

    await push(ref(db, `rooms/${roomId}/emoji`), {
      avatar: selectedAvatar,
      name: studentName,
      emoji,
      time: Date.now()
    });
  };
});

/* --------------------------
      Word Cloud жіберу
--------------------------- */
$("sendCloudBtn").onclick = async () => {
  const word = $("cloudInput").value.trim();
  if (!word) return;

  await push(ref(db, `rooms/${roomId}/cloud`), {
    avatar: selectedAvatar,
    name: studentName,
    word,
    time: Date.now()
  });

  $("cloudInput").value = "";
};
