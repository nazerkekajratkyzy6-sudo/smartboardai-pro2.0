// /api/ai.js — Vercel Serverless Function
// SmartBoardAI PRO — Premium AI Backend
// Назарке Кайраткызы үшін арнайы

import OpenAI from "openai";

// --- OPENAI CLIENT ---
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// --- ALLOWED FUNCTIONS (actions) ---
const ACTIONS = [
  "chat",
  "lesson_plan",
  "tasks",
  "quiz",
  "worksheet",
  "split_blocks",
  "auto_language"
];

// --- MAIN HANDLER ---
export default async function handler(req, res) {
  // Allow POST only
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { action, prompt, lang } = req.body;

    if (!ACTIONS.includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const systemPrompt = buildSystemPrompt(action, lang);
    const userPrompt = buildUserPrompt(action, prompt, lang);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    });

    const aiText = completion.choices[0].message.content;

    res.status(200).json({
      ok: true,
      action,
      result: aiText
    });

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}

// ===============================
// BUILD SYSTEM PROMPT
// ===============================
function buildSystemPrompt(action, lang) {
  let L = lang || "kz";

  const HEAD = {
    kz: "Сен SmartBoardAI PRO мұғалімдер платформасының ресми AI-модулі боласың.",
    ru: "Ты — официальный AI-модуль платформы SmartBoardAI PRO.",
    en: "You are the official AI module of SmartBoardAI PRO."
  };

  return HEAD[L] + 
Міндеттерің:
- қысқа әрі нақты жауап беру
- блоктарға бөліп құрылымды сақтау
- қажет болса кесте, формула, тапсырма құру
- мектеп стандартына сай болу (KZ curriculum)
;
}

// ===============================
// BUILD USER PROMPT
// ===============================
function buildUserPrompt(action, prompt, lang) {
  switch (action) {
    case "chat":
      return prompt;

    case "lesson_plan":
      return 
Сабақ жоспарын құр:
- тақырып
- оқу мақсаты
- бағалау критерийі
- тапсырмалар
- рефлексия
Тіл: ${lang}.
Тақырып: ${prompt}.
;

    case "tasks":
      return 
Мына тақырып бойынша 5 тапсырма құрастыр:
${prompt}
Қиындық деңгейі: аралас.
Тіл: ${lang}.
;

    case "quiz":
      return 
Мына тақырыпқа 10 сұрақтық тест құрастыр:
${prompt}
Жауап кілтімен бірге.
Тіл: ${lang}.
;

    case "worksheet":
      return 
Мына тақырыпқа толық WORKSHEET құрастыр:
– жылы кіріспе
– теория
– 5 есеп (шешімімен)
– шағын рефлексия
Тақырып: ${prompt}
Тіл: ${lang}.
;

    case "split_blocks":
      return 
Мәтінді тақтаға бөліктерге бөл:
${prompt}
Тіл: ${lang}.
;

    case "auto_language":
      return 
Тілін анықта да қайта жаз:
${prompt}
;

    default:
      return prompt;
  }
}