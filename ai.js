// ai.js — SmartBoardAI PRO (AI Engine)

import { OPENAI_KEY } from "./env.js";

async function askAI(prompt) {
  if (!OPENAI_KEY) {
    return "❗ OPENAI_KEY бос. env.js файлын тексеріңіз.";
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "AI жауап бере алмады.";
  } catch (e) {
    return "⚠️ Қате: " + e.message;
  }
}

export const generateQuiz = async (topic, count = 5) =>
  askAI(
    `Тақырып: ${topic}\n${count} сұрақтан тұратын көп таңдаулы викторина жаса.\nФормат:\n1) Сұрақ\nA)\nB)\nC)\nD)\nДұрыс жауап: ...`
  );

export const generateRebus = async (topic) =>
  askAI(
    `"${topic}" тақырыбына қарапайым ребус құрастыр.\nФормат:\nРебус: [символдар]\nЖауабы: [сөз]`
  );

export const generateAnagram = async (word) =>
  askAI(
    `"${word}" сөзінен анаграмма құрастыр: 1 дұрыс жауап, 3 қате нұсқа, қазақ тілінде.`
  );

export const generateLessonPlan = async (topic, grade) =>
  askAI(
    `Тақырып: ${topic}\nСынып: ${grade}\nҚысқа Lesson Plan жаз.\n- Learning objectives\n- Starter\n- Main activities\n- Practice\n- Assessment\n- Reflection`
  );

export const explainTopic = async (topic) =>
  askAI(
    `"${topic}" тақырыбын 10 жасар балаға түсінікті етіп түсіндір. Өмірден мысалдар қос.`
  );

export const generatePISA = async (topic) =>
  askAI(
    `"${topic}" тақырыбына PISA форматына сай мәтіндік есептер жаса: контекст, сұрақ, 4 нұсқа, дұрыс жауап.`
  );

export const generateTIMSS = async (topic) =>
  askAI(
    `"${topic}" бойынша TIMSS стилінде логикалық есеп құрастыр: 4 нұсқа, дұрыс жауаппен.`
  );

export const generateBloom = async (topic) =>
  askAI(
    `"${topic}" бойынша Bloom таксономиясының 6 деңгейіне 6 тапсырма жаса: Remember, Understand, Apply, Analyze, Evaluate, Create.`
  );

export const generateReflection = async () =>
  askAI(
    `Сабақ соңында қолдануға 6 рефлексия сұрағын жаса: не түсінді, не қиын болды, өз-өзіне баға, көңіл-күйі т.б.`
  );
