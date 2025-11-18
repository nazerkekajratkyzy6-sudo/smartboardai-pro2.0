// -----------------------------------
// SmartBoardAI — Student (One-page)
// -----------------------------------

console.log("student.js жүктелді");

// Ескі деректерді өшіру (ескі бөлмеге кіріп кетпесін)
localStorage.removeItem("studentRoomId");
localStorage.removeItem("studentName");

// HTML элементтері
const joinBtn = document.getElementById("joinBtn");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

const answerBox = document.getElementById("answerBox");
const answerInput = document.getElementById("answerInput");
const statusMsg = document.getElementById("statusMsg");

// -----------------------------------
// 1) БӨЛМЕГЕ ҚОСЫЛУ (осы бетте)
// -----------------------------------
if (joinBtn) {
    joinBtn.addEventListener("click", () => {
        const name = document.getElementById("studentName").value.trim();
        const room = document.getElementById("roomId").value.trim();

        if (!name || !room) {
            alert("Атыңыз бен Room ID енгізіңіз!");
            return;
        }

        localStorage.setItem("studentName", name);
        localStorage.setItem("studentRoomId", room);

        // Кіру формасын жасырамыз
        document.getElementById("joinSection").style.display = "none";

        // Жауап жазатын аймақты көрсетеміз
        answerBox.style.display = "block";
    });
}

// -----------------------------------
// 2) FIREBASE-ҚА ЖАУАП ЖІБЕРУ
// -----------------------------------
import {
    db,
    ref,
    push,
    set
} from "./firebaseConfig.js";

if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
        const text = answerInput.value.trim();

        if (!text) {
            alert("Жауап бос болмауы керек!");
            return;
        }

        const name = localStorage.getItem("studentName");
        const room = localStorage.getItem("studentRoomId");

        if (!room || !name) {
            alert("Бөлмеге қайта кіріңіз!");
            location.reload();
            return;
        }

        try {
            const answerRef = ref(db, `rooms/${room}/answers`);
            const newAnswer = push(answerRef);

            await set(newAnswer, {
                name: name,
                answer: text,
                time: Date.now()
            });

            statusMsg.style.color = "green";
            statusMsg.innerText = "✔ Жауап жіберілді!";
        } catch (err) {
            statusMsg.style.color = "red";
            statusMsg.innerText = "⚠ Қате!";
        }
    });
}

// -----------------------------------
// 3) ТАЗАЛАУ
// -----------------------------------
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        answerInput.value = "";
        statusMsg.innerText = "";
    });
}
