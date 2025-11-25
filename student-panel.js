// student-panel.js — PREMIUM SMARTBOARDAI PRO

import { db, ref, set, push } from "./firebaseConfig.js";

// ---------------------- URL параметрлері ----------------------
const params = new URLSearchParams(window.location.search);
const studentName = params.get("name");
const roomId = params.get("room");
const avatar = params.get("avatar") || "🙂";

// Егер мәлімет жоқ болса → қайтаратын боламыз
if (!studentName || !roomId) {
    alert("❗ Room ID немесе атыңыз анықталмады. Алдымен бөлмеге кіріңіз.");
    window.location.href = "student.html";
}

// Беттегі жазуды орнату
document.getElementById("studentHeader").textContent =
    `${avatar} ${studentName}, тапсырмаларыңызды жібере аласыз.`;


// ---------------------- ЖАУАП ЖІБЕРУ ----------------------
document.getElementById("sendAnswerBtn").addEventListener("click", async () => {
    const text = document.getElementById("answerInput").value.trim();
    const msg = document.getElementById("answerMsg");

    if (!text) {
        msg.textContent = "Жауап бос!";
        msg.style.color = "red";
        return;
    }

    await set(ref(db, `rooms/${roomId}/answers/${studentName}`), {
        name: studentName,
        avatar,
        text,
        ts: Date.now(),
    });

    msg.textContent = "Жауап жіберілді!";
    msg.style.color = "green";
    document.getElementById("answerInput").value = "";
});


// ---------------------- 1 СӨЗ РЕФЛЕКСИЯ ----------------------
document.getElementById("sendWordBtn").addEventListener("click", async () => {
    const word = document.getElementById("wordInput").value.trim();
    const msg = document.getElementById("wordMsg");

    if (!word) {
        msg.textContent = "Сөз бос!";
        msg.style.color = "red";
        return;
    }

    await push(ref(db, `rooms/${roomId}/reflection/words`), {
        word,
        name: studentName,
        avatar,
        ts: Date.now(),
    });

    msg.textContent = "Қосылды!";
    msg.style.color = "green";
    document.getElementById("wordInput").value = "";
});


// ---------------------- ЭМОЦИЯ ЖІБЕРУ ----------------------
document.querySelectorAll(".emoji-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
        const emoji = btn.dataset.emoji;
        const msg = document.getElementById("emojiMsg");

        await push(ref(db, `rooms/${roomId}/reflection/emoji`), {
            emoji,
            name: studentName,
            avatar,
            ts: Date.now(),
        });

        msg.textContent = "Эмоция жіберілді!";
        msg.style.color = "green";
    });
});
