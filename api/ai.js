// File: api/ai.js

// Vercel Node.js runtime
export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // ---- Body оқу ----
    let body = {};
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch {
        body = {};
      }
    } else {
      body = req.body || {};
    }

    const {
      action = "chat",
      lang = "kk",
      prompt = "Сұрақ бос."
    } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY орнатылмаған" });
    }

    // ---- Prompt құрылысы ----
    const systemPrompt = `
Сен SmartBoardAI PRO жүйесінің ресми AI-ассистентісің.
Міндеттерің:
- Сабақ жоспары, тапсырма, эссе, тест жасау
- Мәтінді блоктарға бөліп беру
- Мәтінді қайта жазу
- 1–11 сыныпқа сай тапсырма құру
- Мұғалім сұрағы қандай тілде болса, сол тілде жауап беру
    `.trim();

    const userPrompt = buildPrompt(action, prompt, lang);

    // ---- OpenAI API ----
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OPENAI API ERROR:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const answer =
      data.choices?.[0]?.message?.content || "Жауап табылмады.";

    return res.status(200).json({ answer });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.toString() });
  }
}

// 🔵 PROMPT BUILDER
function buildPrompt(action, prompt, lang) {
  const LANG_OUT =
    lang === "ru"
      ? "орыс тілінде"
      : lang === "en"
      ? "ағылшын тілінде"
      : "қазақ тілінде";

  switch (action) {
    case "lesson_plan":
      return `
Сабақ жоспарын құр:
Тақырып: ${prompt}
Бөлімдер:
- Оқу мақсаты
- Бағалау критерийі
- Теория
- Тапсырмалар (3 деңгей)
- Рефлексия
Жауапты ${LANG_OUT} бер.
`;

    case "tasks":
      return `
Тақырып: ${prompt}
5 тапсырма құрастыр.
Жауапты ${LANG_OUT} бер.
`;

    case "quiz":
      return `
Тақырып: ${prompt}
10 тест сұрағын құрастыр.
Нұсқалар + Жауап кілті болсын.
Жауапты ${LANG_OUT} бер.
`;

    case "split":
      return `
Мәтінді сабаққа арналған block форматқа бөл:
${prompt}
Жауапты ${LANG_OUT} бер.
`;

    default:
      return `${prompt}\n\nЖауапты ${LANG_OUT} бер.`;
  }
}
