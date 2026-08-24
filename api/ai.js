// api/ai.js — SmartBoardAI PRO
// 8 педагогикалық AI режим + Rate limiting + Security

export const config = { runtime: "nodejs" };

// ── Rate Limiting (in-memory, Vercel serverless-та жұмыс істейді) ──
const RATE_MAP = new Map();
const MAX_REQ_PER_MIN = 15; // 1 минутта максимум 15 сұраныс (бір IP)
const MAX_REQ_PER_HOUR = 60; // 1 сағатта максимум 60 сұраныс

function checkRateLimit(ip) {
  const now = Date.now();
  const minKey  = `${ip}_m_${Math.floor(now / 60000)}`;
  const hourKey = `${ip}_h_${Math.floor(now / 3600000)}`;

  const minCount  = (RATE_MAP.get(minKey)  || 0) + 1;
  const hourCount = (RATE_MAP.get(hourKey) || 0) + 1;

  RATE_MAP.set(minKey,  minCount);
  RATE_MAP.set(hourKey, hourCount);

  // Ескі кілттерді тазалау (memory leak болмасын)
  if (RATE_MAP.size > 1000) {
    const oldKeys = [...RATE_MAP.keys()].slice(0, 200);
    oldKeys.forEach(k => RATE_MAP.delete(k));
  }

  if (minCount  > MAX_REQ_PER_MIN)  return { blocked: true, reason: "min" };
  if (hourCount > MAX_REQ_PER_HOUR) return { blocked: true, reason: "hour" };
  return { blocked: false };
}

export default async function handler(req, res) {
  // ── CORS headers ────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ── Rate Limit тексеру ───────────────────────────
  const ip = (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  ).trim();

  const limit = checkRateLimit(ip);
  if (limit.blocked) {
    return res.status(429).json({
      error: limit.reason === "min"
        ? "Тым көп сұраныс. 1 минуттан кейін қайталаңыз."
        : "Сағаттық лимитке жеттіңіз. Кейінірек қайталаңыз."
    });
  }

  // ── Body парсинг ─────────────────────────────────
  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: "Жарамсыз JSON" });
  }

  const {
    action  = "chat",
    lang    = "kk",
    prompt  = "",
    image   = null,
    grade   = "",
    subject = "",
    uid     = null,
    plan    = "free",
  } = body;

  // ── Input валидация ──────────────────────────────
  if (typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt мәтін болуы керек" });
  }

  // Prompt ұзындығы шегі
  if (prompt.length > 5000) {
    return res.status(400).json({ error: "Prompt тым ұзын (макс. 5000 таңба)" });
  }

  // Action тізімі — тек рұқсатты action-дар
  const ALLOWED_ACTIONS = [
    "chat", "lesson_plan", "tasks", "quiz", "split", "explain",
    "differentiation", "feedback", "photo_analyze", "pisa",
    "generate_interactive", "lesson_flow", "certificate_text"
  ];
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: "Рұқсатсыз action" });
  }

  // Image өлшем тексеру (base64: 1MB ≈ 1.37MB base64)
  if (image) {
    if (typeof image !== "string") {
      return res.status(400).json({ error: "image string болуы керек" });
    }
    // Base64 өлшемі: ~5MB-тан аспасын (= ~3.75MB нақты файл)
    if (image.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Сурет тым үлкен (макс. 5MB). Кішірейтіп жіберіңіз." });
    }
    // Тек data:image/* немесе http форматы рұқсатты
    if (!image.startsWith("data:image/") && !image.startsWith("http")) {
      return res.status(400).json({ error: "Жарамсыз сурет форматы" });
    }
  }

  // Photo analyze үшін image міндетті
  if (action === "photo_analyze" && !image) {
    return res.status(400).json({ error: "photo_analyze үшін image міндетті" });
  }

  // ── API Key ──────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY орнатылмаған" });

  // ── System prompt ────────────────────────────────
  const systemPrompt = `
Сен SmartBoardAI PRO жүйесінің ресми педагогикалық AI-ассистентісің.
Қазақстандық мектеп бағдарламасын жақсы білесің (1-11 сынып).
Мұғалімге кәсіби, нақты, дайын пайдалануға болатын материал бересің.
Жауапты мұғалім сұраған тілде бер.
  `.trim();

  const userPrompt = buildPrompt({ action, prompt, lang, grade, subject, image });

  try {
    const messages = [{ role: "system", content: systemPrompt }];

    if (image && action === "photo_analyze") {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image, detail: "high" } },
          { type: "text", text: userPrompt }
        ]
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const model = (image && action === "photo_analyze") ? "gpt-4o" : "gpt-4o-mini";
    const maxTokens = action === "lesson_flow" ? 3500
                    : action === "generate_interactive" ? 3000
                    : 2000;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: maxTokens,
        messages,
      }),
    });

    // OpenAI жауабы дұрыс па?
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(502).json({
        error: errData?.error?.message || "OpenAI API қатесі"
      });
    }

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const answer = data.choices?.[0]?.message?.content || "Жауап табылмады.";

    // differentiation үшін JSON parse
    if (action === "differentiation") {
      try {
        const clean = answer.replace(/```json|```/gi, "").trim();
        const diff = JSON.parse(clean);
        return res.status(200).json({ answer, diff });
      } catch {
        return res.status(200).json({ answer, diff: null });
      }
    }

    // lesson_flow үшін JSON parse
    if (action === "lesson_flow") {
      try {
        const clean = answer.replace(/```json|```/gi, "").trim();
        const lesson = JSON.parse(clean);
        return res.status(200).json({ answer, lesson });
      } catch {
        return res.status(200).json({ answer, lesson: { title: prompt, blocks: [] } });
      }
    }

    return res.status(200).json({ answer });

  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({ error: "Сервер қатесі. Қайталап көріңіз." });
  }
}

// ── PROMPT BUILDER ───────────────────────────────────
function buildPrompt({ action, prompt, lang, grade, subject }) {
  const L = lang === "ru" ? "орысша" : lang === "en" ? "ағылшынша" : "қазақша";
  const G = grade   ? `${grade}-сынып` : "";
  const S = subject ? subject : "";
  const ctx = [S, G].filter(Boolean).join(", ");
  const ctxStr = ctx ? `\nПән/сынып: ${ctx}` : "";

  switch (action) {

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

    case "tasks":
      return `
Тақырып: ${prompt}${ctxStr}

3 деңгейде тапсырма жаса:
🟢 Деңгей 1 — Білу (2 тапсырма)
🟡 Деңгей 2 — Түсіну (2 тапсырма)
🔴 Деңгей 3 — Қолдану / Шығармашылық (1 тапсырма)

Әр тапсырмаға бағалау критерийін қос.
Жауапты ${L} бер.`.trim();

    case "quiz":
      return `
Тақырып: ${prompt}${ctxStr}

10 тест сұрағын жаса:
- 4 нұсқалы (A, B, C, D)
- Бір дұрыс жауап
- Соңында жауап кілті

Жауапты ${L} бер.`.trim();

    case "split":
      return `
Мынандай мәтінді сабаққа арналған 4-6 логикалық блокқа бөл.
Әр блокта: тақырыпша + мазмұн + 1 сұрақ болсын.

Мәтін:
${prompt}

Жауапты ${L} бер.`.trim();

    case "explain":
      return `
Мынаны оқушыға қарапайым, түсінікті тілмен түсіндір:
"${prompt}"
${ctxStr}

Мысалдармен, аналогиямен, нақты мысалдармен жаз.
Жауапты ${L} бер.`.trim();

    case "differentiation":
      return `Сен SmartBoardAI PRO педагогикалық ассистентісің. Тек ${L} тілінде жауап бер.

Тақырып: "${prompt}"${ctxStr}

3 деңгейде дифференцияланған тапсырма жасап, ТІКЕЛЕЙ JSON форматында қайтар:

{
  "topic": "тақырып атауы",
  "levels": [
    {
      "level": 1,
      "name": "🟢 Базалық деңгей",
      "description": "Қолдау қажет оқушыларға — негізгі түсінік",
      "tasks": [
        { "num": 1, "task": "тапсырма мәтіні", "hint": "кеңес немесе формула" },
        { "num": 2, "task": "тапсырма мәтіні", "hint": "кеңес" },
        { "num": 3, "task": "тапсырма мәтіні", "hint": "кеңес" }
      ]
    },
    {
      "level": 2,
      "name": "🟡 Орта деңгей",
      "description": "Орташа оқушыларға — стандарт тапсырмалар",
      "tasks": [
        { "num": 1, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 2, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 3, "task": "тапсырма мәтіні", "hint": "" }
      ]
    },
    {
      "level": 3,
      "name": "🔴 Күрделі деңгей",
      "description": "Дарынды оқушыларға — тереңдетілген",
      "tasks": [
        { "num": 1, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 2, "task": "тапсырма мәтіні", "hint": "" },
        { "num": 3, "task": "тапсырма мәтіні", "hint": "" }
      ]
    }
  ]
}`.trim();

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

    case "generate_interactive":
      return `
Сен HTML5 интерактив тапсырма жасаушысысың.
Мұғалімнің сұранысы: "${prompt}"
Пән/сынып: ${ctx || "жалпы"}

МАҢЫЗДЫ ЕРЕЖЕЛЕР:
1. Тек қана толық жұмыс жасайтын HTML файл жаз
2. Ешқандай сыртқы CDN, import жоқ — тек inline JS/CSS
3. Файл браузерде тікелей ашылуы керек (iframe-де)
4. Дизайн: #4f46e5 (фиолет) негізгі түс, Inter шрифті
5. Мобильге бейімделген (max-width: 600px)
6. Ойын/тапсырма толық аяқталған болсын

МІНДЕТТІ:
- <!DOCTYPE html> бастап жаз
- </html> аяқта
- Ойын логикасы толық жұмыс жасасын
- Нәтиже/ұпай көрсетілсін
- Перезапуск батырмасы болсын
- Тек HTML коды бер

Жауап тілі: ${L}
`.trim();

    case "lesson_flow": {
      const lfLang = lang === "ru" ? "орыс" : lang === "en" ? "ағылшын" : "қазақ";
      return `Сен SmartBoardAI PRO педагогикалық ассистентісің. Тек ${lfLang} тілінде жауап бер.

Тақырып: "${prompt}"
Пән: ${subject || "жалпы"}
Сынып: ${grade || "7"}

Толық сабақ сценарийін ТІКЕЛЕЙ JSON форматында қайтар. Тек таза JSON:

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
      "content": "<p>Негізгі теория</p>"
    },
    {
      "type": "example",
      "title": "✏️ Мысалдар",
      "duration": 10,
      "content": "<p>Шешілген мысалдар</p>"
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
      "content": "<p>Тест сұрақтары немесе рефлексия</p>"
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

    case "certificate_text":
      return `Оқушыға арналған марапат мәтінін жаз.
Оқушы: ${prompt}
Тіл: ${L}
Ресми, шабыттандырушы тілмен. Тек мәтін бер.`;

    default:
      return `${prompt}\n\nЖауапты ${L} бер.`;
  }
}
