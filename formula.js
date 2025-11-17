// formula.js — SmartBoardAI PRO Formula Engine
import { explainTopic } from "./ai.js";

export function renderFormula(container, latex) {
  container.innerHTML = `
    <div class="formula-card">
      <h3>📐 Формула</h3>
      <p>LaTeX:</p>
      <pre>${latex}</pre>
      <p>Көрінісі:</p>
      <div id="formulaRendered">\\(${latex}\\)</div>
    </div>
  `;

  if (window.MathJax && window.MathJax.typeset) {
    window.MathJax.typeset();
  }
}

export async function explainFormula(container, latex) {
  const text = await explainTopic(`Мына формуланы түсіндір: ${latex}`);
  container.innerHTML = `
    <div class="formula-explain">
      <h3>🧠 Түсіндірме</h3>
      <pre>${text}</pre>
    </div>
  `;
}

export function renderFormulaPanel(container) {
  container.innerHTML = `
    <div class="card">
      <h3>∑ Формула панелі</h3>
      <p class="small">LaTeX түрінде формула енгізіп, көрінісін және түсіндірмесін ала аласыз.</p>
      <textarea id="latexInput" placeholder="Мысалы: a^2 + b^2 = c^2"
        style="width:100%; min-height:60px;"></textarea>
      <div style="margin-top:6px; display:flex; gap:6px;">
        <button class="btn btn-primary" id="btnShowFormula">Формуланы көрсету</button>
        <button class="btn btn-ghost" id="btnExplainFormula">AI түсіндірсін</button>
      </div>
      <div id="formulaOutput" style="margin-top:10px;"></div>
    </div>
  `;

  const latexInput = container.querySelector("#latexInput");
  const formulaOutput = container.querySelector("#formulaOutput");

  container.querySelector("#btnShowFormula").onclick = () => {
    const formula = latexInput.value.trim();
    if (formula) renderFormula(formulaOutput, formula);
  };

  container.querySelector("#btnExplainFormula").onclick = () => {
    const formula = latexInput.value.trim();
    if (formula) explainFormula(formulaOutput, formula);
  };
}
