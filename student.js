import { db, ref, set, push } from "./firebaseConfig.js";

const $ = (id) => document.getElementById(id);

let studentName = "";
let roomId = "";
let avatar = "";

// ------------ URL AUTO MODE ------------
const params = new URLSearchParams(window.location.search);
const autoName = params.get("name");
const autoRoom = params.get("room");
const autoAvatar = params.get("avatar");

// AUTO MODE → бар болса, панель instantly ашылады
if (autoName && autoRoom) {
    studentName = autoName;
    roomId = autoRoom;
    avatar = autoAvatar || "😀";

    $("autoJoinBanner").style.display = "block";
    $("joinForm").style.display = "none";
    $("mainPanel").style.display = "block";
}

// ------------ FORM MODE ------------
document.querySelectorAll(".avatar").forEach(el => {
    el.addEventListener("click", () => {
        document.querySelectorAll(".avatar").forEach(a => a.classList.remove("selected"));
        el.classList.add("selected");
        avatar = el.dataset.avatar;
    });
});

$("joinBtn")?.addEventListener("click", () => {
    studentName = $("studentName").value.trim();
    roomId = $("roomId").value.trim();

    if (!studentName || !roomId || !avatar) {
        $("joinStatus").textContent = "Барлық өрісті толтырыңыз!";
        return;
    }

    set(ref(db, `rooms/${roomId}/students/${studentName}`), {
        name: studentName,
        avatar,
        joinedAt: Date.now(),
    });

    $("joinForm").style.display = "none";
    $("mainPanel").style.display = "block";
});

// ------------ SEND ANSWER ------------
$("sendAnswerBtn")?.addEventListener("click", async () => {
    const text = $("answerInput").value.trim();
    if (!text) return;

    await set(ref(db, `rooms/${roomId}/answers/${studentName}`), {
        name: studentName,
        avatar,
        text,
        ts: Date.now(),
    });

    $("answerMsg").textContent = "Жауап жіберілді!";
    $("answerInput").value = "";
});

// ------------ WORD REFLECTION ------------
$("sendWordBtn")?.addEventListener("click", async () => {
    const word = $("wordInput").value.trim();
    if (!word) return;

    await push(ref(db, `rooms/${roomId}/reflection/words`), {
        name: studentName,
        avatar,
        word,
        ts: Date.now(),
    });

    $("wordMsg").textContent = "Қосылды!";
    $("wordInput").value = "";
});

// ------------ EMOJI ------------
document.querySelectorAll(".emoji-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        const emoji = btn.dataset.emoji;

        await push(ref(db, `rooms/${roomId}/reflection/emoji`), {
            name: studentName,
            avatar,
            emoji,
            ts: Date.now(),
        });
    });
});
