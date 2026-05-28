// api/ai.js —  SmartBoardAI PRO
// 8 педагогикалық AI режим

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch { body = {}; }

  const {
    action  = "chat",
    lang    = "kk",
    prompt  = "",
    image   = null,
    grade   = "",
    subject = "",
    uid     = null,   // пайдаланушы ID (Firebase Auth)
    plan    = "free", // "free" | "pro"
  } = body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY орнатылмаған" });

  // ── FREEMIUM ЛИМИТ ЖҮЙЕСІ ──────────────────────────
  const FREE_TOTAL_LIMIT = 10;  // Жалпы 10 тегін AI сұраныс (бір рет)

  if (plan !== "pro" && uid) {
    try {
      const admin = await import("firebase-admin");
      const { getDatabase } = await import("firebase-admin/database");

      if (!admin.default.apps.length) {
        admin.default.initializeApp({
          credential: admin.default.credential.cert({
            projectId:   process.env.FIREBASE_PROJECT_ID,
            privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
      }

      const db     = getDatabase();
      const useRef = db.ref(`users/${uid}/aiUsedTotal`);
      const snap   = await useRef.get();
      const used   = snap.val() || 0;

      if (used >= FREE_TOTAL_LIMIT) {
        return res.status(429).json({
          error:   "limit_reached",
          message: `${FREE_TOTAL_LIMIT} тегін AI сұраныс біткен. PRO жоспарына өтіңіз!`,
          used,
          limit:   FREE_TOTAL_LIMIT,
        });
      }

      // Санауышты арттыру
      await useRef.set(used + 1);
    } catch(adminErr) {
      console.warn("Firebase Admin limit check skipped:", adminErr.message);
    }
  }

  // ── System prompt ────────────────────────────────
  const systemPrompt = `
Сен SmartBoardAI PRO жүйесінің ресми педагогикалық AI-ассистентісің.
Қазақстандық мектеп бағдарламасын жақсы білесің (1-11 сынып).
Мұғалімге кәсіби, нақты, дайын пайдалануға болатын материал бересің.
Жауапты мұғалім сұраған тілде бер.
  `.trim();

  // ── User prompt ──────────────────────────────────
  const userPrompt = buildPrompt({ action, prompt, lang, grade, subject, image });

  try {
    // Vision үшін арнайы messages
    const messages = [{ role: "system", content: systemPrompt }];

    if (image && action === "photo_analyze") {
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: image, detail: "high" }
          },
          { type: "text", text: userPrompt }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const model = (image && action === "photo_analyze") ? "gpt-4o" : "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: action === "lesson_flow" ? 3500 : 2000,
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const answer = data.choices?.[0]?.message?.content || "Жауап табылмады.";

    // differentiation үшін JSON parse
    if (action === "differentiation") {
      try {
        const clean = answer.replace(/```json|```/gi, "").trim();
        const diff = JSON.parse(clean);
        return res.status(200).json({ answer, diff });
      } catch(e) {
        return res.status(200).json({ answer, diff: null });
      }
    }

    // lesson_flow үшін JSON parse
    if (action === "lesson_flow") {
      try {
        const clean = answer.replace(/```json|```/gi, "").trim();
        const lesson = JSON.parse(clean);
        return res.status(200).json({ answer, lesson });
      } catch(e) {
        return res.status(200).json({ answer, lesson: { title: prompt, blocks: [] } });
      }
    }

    return res.status(200).json({ answer });

  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({ error: err.toString() });
  }
}

// ── PROMPT BUILDER ───────────────────────────────────
function buildPrompt({ action, prompt, lang, grade, subject, image }) {
  const L = lang === "ru" ? "орысша" : lang === "en" ? "ағылшынша" : "қазақша";
  const G = grade   ? `${grade}-сынып` : "";
  const S = subject ? subject : "";
  const ctx = [S, G].filter(Boolean).join(", ");
  const ctxStr = ctx ? `\nПән/сынып: ${ctx}` : "";

  switch (action) {

    // 1. Сабақ жоспары
    case "lesson_plan":
      return `
Сабақ жоспарын кәсіби түрде жаса.
Тақырып: ${prompt}${ctxStr}

Мына бөлімдерді қамти:
1. Оқу мақсаты (SMART форматта)
2. Бағалау критерийі (3 дескриптор)
3. Сабақтың барысы:
   - Ұйымдастыру кезеңі (2 мин)
   - Үй тапсырмасын тексеру (5 мин)
   - Жаңа тақырып (15 мин)
   - Бекіту (10 мин)
   - Рефлексия (3 мин)
4. Дифференциация (үш деңгей)
5. Бағалау тапсырмасы

Жауапты ${L} бер.`.trim();

    // 2. Тапсырма жасау (3 деңгей)
    case "tasks":
      return `
Тақырып: ${prompt}${ctxStr}

3 деңгейде тапсырма жаса:
🟢 Деңгей 1 —  Білу (2 тапсырма)
🟡 Деңгей 2 —  Түсіну (2 тапсырма)
🔴 Деңгей 3 —  Қолдану / Шығармашылық (1 тапсырма)

Әр тапсырмаға бағалау критерийін қос.
Жауапты ${L} бер.`.trim();

    // 3. Тест/Quiz (10 сұрақ)
    case "quiz":
      return `
Тақырып: ${prompt}${ctxStr}

10 тест сұрағын жаса:
- 4 нұсқалы (A, B, C, D)
- Бір дұрыс жауап
- Соңында жауап кілті

Жауапты ${L} бер.`.trim();

    // 4. Мәтінді блоктарға бөлу
    case "split":
      return `
Мынандай мәтінді сабаққа арналған 4-6 логикалық блокқа бөл.
Әр блокта: тақырыпша + мазмұн + 1 сұрақ болсын.

Мәтін:
${prompt}

Жауапты ${L} бер.`.trim();

    // 5. AI түсіндіру режимі
    case "explain":
      return `
Мынаны оқушыға қарапайым, түсінікті тілмен түсіндір:
"${prompt}"
${ctxStr}

Мысалдармен, аналогиямен, нақты мысалдармен жаз.
Жауапты ${L} бер.`.trim();

    // 6. Дифференциация
    case "differentiation":
      return `Сен SmartBoardAI PRO педагогикалық ассистентісің. Тек ${L} тілінде жауап бер.

Тақырып: "${prompt}"${ctxStr}

3 деңгейде дифференцияланған тапсырма жасап, ТІКЕЛЕЙ JSON форматында қайтар (ешқандай түсіндірме жазба):

{
  "topic": "тақырып атауы",
  "levels": [
    {
      "level": 1,
      "name": "🟢 Базалық деңгей",
      "description": "Қолдау қажет оқушыларға —  негізгі түсінік",
      "tasks": [
        { "num": 1, "task": "тапсырма мәтіні", "hint": "кеңес немесе формула" },
        { "num": 2, "task": "тапсырма мәтіні", "hint": "кеңес" },
        { "num": 3, "task": "тапсырма мәтіні", "hint": "кеңес" }
      ]
    },
    {
      "level": 2,
      "name": "🟡 Орта деңгей",
      "description": "Орташа оқушыларға —  стандарт тапсырмалар",
      "tasks": [
        { "num": 1, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 2, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 3, "task": "тапсырма мәтіні", "hint": "" }
      ]
    },
    {
      "level": 3,
      "name": "🔴 Күрделі деңгей",
      "description": "Дарынды оқушыларға —  тереңдетілген",
      "tasks": [
        { "num": 1, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 2, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 3, "task": "тапсырма мәтіні", "hint": "" }
      ]
    }
  ]
}`.trim();

    // 7. Кері байланыс жазу
    case "feedback":
      return `
Оқушыға кәсіби, ынталандыратын, конструктивті кері байланыс жаз:
Жұмыс немесе жауап: "${prompt}"
${ctxStr}

Мына форматта:
✅ Жақсы жақтары: ...
📈 Жақсартуға болады: ...
💡 Нақты ұсыныс: ...

Жауапты ${L} бер.`.trim();

    // 8. Фото талдау (оқушы жазбасын тексеру)
    case "photo_analyze":
      return `
Оқушының осы жазбасын/шешімін тексер:
${prompt ? `Тапсырма контексті: ${prompt}` : ""}
${ctxStr}

Мыналарды жаз:
✅ Дұрыс жақтары
❌ Қателер (нақты қайда, неліктен)
📝 Толық дұрыс шешім
💬 Оқушыға кері байланыс

Жауапты ${L} бер.`.trim();

    // 9. PISA/TIMSS стиліндегі сұрақ
    case "pisa":
      return `
PISA/TIMSS стиліндегі сыни ойлау тапсырмасын жаса:
Тақырып/контекст: ${prompt}
${ctxStr}

Мына бөлімдерді қамти:
1. Нақты өмірлік ситуация (контекст)
2. Деректер/мәтін/диаграмма сипаттамасы
3. 3 сұрақ (білу → түсіну → талдау)
4. Бағалау рубрикасы

Жауапты ${L} бер.`.trim();

    // 10. AI Interactive Generator
    case "generate_interactive":
      return `
Сен HTML5 интерактив тапсырма жасаушысысың.
Мұғалімнің сұранысы: "${prompt}"
Пән/сынып: ${ctx || "жалпы"}

МАҢЫЗДЫ ЕРЕЖЕЛЕР:
1. Тек қана толық жұмыс жасайтын HTML файл жаз
2. Ешқандай сыртқы CDN, import жоқ —  тек inline JS/CSS
3. Файл браузерде тікелей ашылуы керек (iframe-де)
4. Дизайн: #4f46e5 (фиолет) негізгі түс, Inter шрифті
5. Мобильге бейімделген (max-width: 600px)
6. Ойын/тапсырма толық аяқталған болсын

Мына форматтардың бірін жаса (сұранысқа сәйкес):
- Quiz (4 нұсқалы тест)
- Matching (сәйкестендіру)
- Flashcards (карточкалар)
- Drag & Drop (сүйреп апару)
- True/False (иә/жоқ)
- Fill in the blanks (бос орын толтыру)
- Memory game (жадты дамыту)
- Math trainer (математикалық тренажер)

МІНДЕТТІ:
- <!DOCTYPE html> бастап жаз
- </html> аяқта
- Ойын логикасы толық жұмыс жасасын
- Нәтиже/ұпай көрсетілсін
- Перезапуск батырмасы болсын
- Тек HTML коды бер, бастапқы немесе аяқтағы мәтін жоқ

Жауап тілі: ${L}
`.trim();

    // 11. AI Lesson Flow —  толық сабақ JSON
    case "lesson_flow": {
      const lfLang = lang === "ru" ? "орыс" : lang === "en" ? "ағылшын" : "қазақ";
      return `Сен SmartBoardAI PRO педагогикалық ассистентісің. Тек ${lfLang} тілінде жауап бер.

Тақырып: "${prompt}"
Пән: ${subject || "жалпы"}
Сынып: ${grade || "7"}

Толық сабақ сценарийін ТІКЕЛЕЙ JSON форматында қайтар. Ешқандай түсіндірме, сілтеме немесе код блогы (backtick) жазба —  тек таза JSON:

{
  "title": "Сабақ тақырыбы",
  "goal": "Сабақ мақсаты (1-2 сөйлем)",
  "duration": 45,
  "blocks": [
    {
      "type": "intro",
      "title": "🎯 Кіріспе / Мотивация",
      "duration": 5,
      "content": "<p>Мотивациялық сұрақтар, сабақ мақсаты</p>"
    },
    {
      "type": "theory",
      "title": "📖 Теориялық бөлім",
      "duration": 12,
      "content": "<p>Негізгі теория</p><ul><li>Анықтама</li><li>Формула</li></ul>"
    },
    {
      "type": "example",
      "title": "✏️ Мысалдар",
      "duration": 10,
      "content": "<p>Шешілген мысалдар қадамдар бойынша</p>"
    },
    {
      "type": "practice",
      "title": "🧠 Тапсырмалар",
      "duration": 10,
      "content": "<p><b>Жай:</b> ...<br><b>Орта:</b> ...<br><b>Күрделі:</b> ...</p>"
    },
    {
      "type": "assessment",
      "title": "✅ Тексеру / Рефлексия",
      "duration": 5,
      "content": "<p>Тест сұрақтары немесе рефлексия тапсырмасы</p>"
    },
    {
      "type": "homework",
      "title": "📚 Үй тапсырмасы",
      "duration": 3,
      "content": "<p>Үй тапсырмасы</p>"
    }
  ]
}`;
    }

    // 12. Жалпы сұрақ
    default:
      return `\${prompt}\n\nЖауапты \${L} бер.`;
  }
}
