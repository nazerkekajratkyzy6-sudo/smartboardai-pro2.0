// games.js — SmartBoardAI PRO Games Engine

import { generateRebus, generateAnagram, generateQuiz } from "./ai.js";

export async function showRebus(container, topic) {
  container.innerHTML = "<p>⏳ Ребус жасалып жатыр...</p>";
  const result = await generateRebus(topic);
  container.innerHTML = `
    <div class="game-card">
      <h3>🧩 Ребус</h3>
      <pre>${result}</pre>
    </div>
  `;
}

export async function showAnagram(container, word) {
  container.innerHTML = "<p>⏳ Анаграмма жасалып жатыр...</p>";
  const result = await generateAnagram(word);
  container.innerHTML = `
    <div class="game-card">
      <h3>🔤 Анаграмма</h3>
      <pre>${result}</pre>
    </div>
  `;
}

export async function showQuiz(container, topic, count = 5) {
  container.innerHTML = "<p>⏳ Тест жасалып жатыр...</p>";
  const result = await generateQuiz(topic, count);
  container.innerHTML = `
    <div class="game-card">
      <h3>❓ Викторина</h3>
      <pre>${result}</pre>
    </div>
  `;
}

export function renderGamesPanel(container) {
  container.innerHTML = `
    <div class="card">
      <h3>🎮 SmartBoardAI Games</h3>
      <p class="small">Ребус, анаграмма, тест құралдары.</p>
      <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
        <button id="btnRebus" class="btn btn-ghost">Ребус</button>
        <button id="btnAnagram" class="btn btn-ghost">Анаграмма</button>
        <button id="btnQuiz" class="btn btn-ghost">Тест (5 сұрақ)</button>
      </div>
      <div id="gameArea" style="margin-top:10px;"></div>
    </div>
  `;

  const gameArea = container.querySelector("#gameArea");

  container.querySelector("#btnRebus").onclick = () => {
    const topic = prompt("Ребус тақырыбы:");
    if (topic) showRebus(gameArea, topic);
  };

  container.querySelector("#btnAnagram").onclick = () => {
    const word = prompt("Сөз енгіз:");
    if (word) showAnagram(gameArea, word);
  };

  container.querySelector("#btnQuiz").onclick = () => {
    const topic = prompt("Викторина тақырыбы:");
    if (topic) showQuiz(gameArea, topic, 5);
  };
}
