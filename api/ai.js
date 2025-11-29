// /api/ai.js — SmartBoardAI PRO
// Vercel Serverless Function (Fully Fixed Version)

import OpenAI from "openai";

// ============== OPENAI CLIENT ==============
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Қолдануға рұқсат етілген әрекеттер
const ACTIONS = [
  "chat",
  "lesson_plan",
  "tasks",
  "quiz",
  "worksheet",
  "split_blocks",
  "auto_language"
];

// ============== MAIN HANDLER ==============
export default async function handler(req, res) {

  // Тек POST рұқсат
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { action, prompt, lang } = req.body;

    // Action дұрыс па?
    if (!ACTIONS.includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const systemPrompt = buildSystemPrompt(action, lang);
    const userPrompt = buildUserPrompt(action, prompt, lang);

    // ============== OPENAI CALL ==============
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",  // mini → ең тез
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const aiText =
      completion?.choices?.[0]?.message?.content ||
      "AI жауап қайтара алмады.";

    return res.status(200).json({
      ok: true,
      action,
      result: aiText,
    });

  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}

// =====================================================================
//                           SYSTEM PROMPT
// =====================================================================
function buildSystemPrompt(action, lang) {
  const L = lang || "kz";

  const HEAD = {
    kz: "Сен SmartBoardAI PRO мұғалімдер платформасының ресми AI-модулі боласың.",
    ru: "Ты — официальный AI-модуль платформы SmartBoardAI PRO.",
    en: "You are the official AI module of SmartBoardAI PRO."
  };

  return `
${HEAD[L]}

Міндеттерің:
- қысқа әрі нақты жауап беру
- блоктарға бөліп құрылымды сақтау
- қажет болса кесте, формула, тапсырма құру
- мектеп стандартына сай болу (KZ curriculum)
- мұғалім қолдана алатындай нақты әрі түсінікті жауап беру
`;
}

// =====================================================================
//                              USER PROMPT
// =====================================================================
function buildUserPrompt(action, prompt, lang) {

  switch (action) {

    case "chat":
      return `${prompt}`;

    case "lesson_plan":
      return `
Сабақ жоспарын құр:
- тақырып
- оқу мақсаты
- бағалау критерийлері
- тапсырмалар (кемінде 3)
- саралау
- рефлексия
Тіл: ${lang}
Тақырып: ${prompt}
`;

    case "tasks":
      return `
Мына тақырып бойынша 5 аралас деңгейдегі тапсырма құр:
${prompt}
Тіл: ${lang}
`;

    case "quiz":
      return `
Тақырып: ${prompt}
10 сұрақтан тұратын тест құрастыр.
Әр сұраққа 4 нұсқа бер.
Соңында жеке "Жауап кілті" болсын.
Тіл: ${lang}
`;

    case "worksheet":
      return `
Толық WORKSHEET құрастыр:
– жылы кіріспе
– теориялық түсіндіру
– 5 есеп (шешімімен)
– рефлексия
Тақырып: ${prompt}
Тіл: ${lang}
`;

    case "split_blocks":
      return `
Мәтінді сабаққа арналған блоктарға бөл:
${prompt}
Тіл: ${lang}
`;

    case "auto_language":
      return `
Төмендегі мәтіннің тілін анықта:
${prompt}

Сосын оны грамматикасы дұрыс, таза стильде қайта жаз.
`;

    default:
      return `${prompt}`;
  }
}
