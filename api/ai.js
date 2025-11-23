// File: api/ai.js

// Vercel-ге Node.js runtime қолдану үшін:
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
      } catch (e) {
        body = {};
      }
    } else if (typeof req.body === "object" && req.body !== null) {
      body = req.body;
    }

    const prompt = body.prompt || "Сұрақ бос.";
    const lang = body.lang || "kk"; // teacherBoard.js-тегі lang

    // ---- API key ----
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY орнатылмаған" });
    }

    // ---- OpenAI шақыру ----
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
Сен SmartBoardAI PRO жүйесінің ресми AI-ассистентісің.

Міндеттерің:
- Қазақ және орыс мұғалімдеріне көмектесу
- Сабақ жоспарын (ҚМЖ/ОМЖ логикасына жақын) қысқа, түсінікті блоктармен беру
- Тапсырмаларды 3 деңгейге бөлу: жеңіл, орташа, күрделі
- Математика, физика, информатика, STEM, логика есептерін құрастыру
- Эссе, қысқа мәтін, диалог, test/quiz сұрақтарын жазу
- Жауапты әрқашан құрылымдап беру: тақырып, түсіндіру, мысал, қорытынды/жауап
- Мұғалім сұраған сынып пен жас ерекшелігін ескеру

Тіл ережесі:
- Егер сұрақ қазақша болса — қазақша жауап бер
- Егер сұрақ орысша болса — орысша жауап бер
- Егер аралас немесе түсініксіз болса — қазақша жауап бер

Жауаптарың:
- Өте жалпы, бос сөйлемдер болмауы тиіс
- Әрқашан нақты контент құрастыр: есеп, тапсырма, жоспар, қадамдар
- Қажет кезде маркерленген тізімдер мен бөлімдерге бөл
            `.trim(),
          },
          {
            role: "user",
            content:
              prompt +
              `\n\nНәтижені келесі тілде бер: ${
                lang === "ru" ? "орыс тілі" : lang === "en" ? "ағылшын тілі" : "қазақ тілі"
              }.`,
          },
        ],
        max_tokens: 900,
        temperature: 0.7,
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
