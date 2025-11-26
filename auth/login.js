import { auth, signInWithEmailAndPassword } from "../firebaseConfig.js";

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (!email || !pass) {
    alert("Email және құпия сөзді толтырыңыз.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, pass);

    // Тек бір мұғалім кіруіне рұқсат (email-lock)
    const allowedEmail = "YOUR_EMAIL@MAIL.COM"; // кейін өзгертіп беремін

    if (email !== allowedEmail) {
      alert("Бұл платформаға қол жеткізуге рұқсатыңыз жоқ.");
      return;
    }

    window.location.href = "../teacherBoard.html";

  } catch (err) {
    alert("Қате: " + err.message);
  }
};
