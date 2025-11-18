// -------------------------
// SmartBoardAI — Student.js
// -------------------------

console.log("student.js жүктелді");

// 1) ЕСКІ ДЕРЕКТЕРДІ ТАЗАЛАУ — өте маңызды!
localStorage.removeItem("studentRoomId");
localStorage.removeItem("studentName");

// Элементтер
const joinBtn = document.getElementById("joinBtn");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

const answerInput = document.getElementById("answerInput");
const statusMsg = document.getElementById("statusMsg");

// -------------------------
// 2) БӨЛМЕГЕ ҚОСЫЛУ
// -------------------------
if (joinBtn) {
    joinBtn.addEventListener("click", () => {
        const name = document.getElementById("studentName").value.trim();
        const room = document.getElementById("roomId").value.trim();

        if (!name || !room) {
            alert("Атыңыз бен Room ID енгізіңіз!");
            return;
        }

        // Жаңа бөлме сақтау
        localStorage.setItem("studentName", name);
        localStorage.setItem("studentRoomId", room);

        // Негізгі оқушы панеліне өту
        window.location.href = "studentBoard.html";
    });
}


// -------------------------
// 3) ANSWER САҚТАУ (Firebase Realtime Database)
// -------------------------
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
            window.location.href = "student.html";
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
            statusMsg.innerText = "⚠ Қате! Жауап жіберілмеді.";
            console.error(err);
        }
    });
}


// -------------------------
// 4) ТАЗАЛАУ БАТЫРМАСЫ
// -------------------------
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        answerInput.value = "";
        statusMsg.innerText = "";
    });
}
