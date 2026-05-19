// api/ai.js — SmartBoardAI PRO
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
  } = body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY орнатылмаған" });

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
        max_tokens: 2000,
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const answer = data.choices?.[0]?.message?.content || "Жауап табылмады.";
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
🟢 Деңгей 1 — Білу (2 тапсырма)
🟡 Деңгей 2 — Түсіну (2 тапсырма)
🔴 Деңгей 3 — Қолдану / Шығармашылық (1 тапсырма)

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
      return `
Тақырып: ${prompt}${ctxStr}

Осы тақырыпқа 3 деңгейде дифференцияланған тапсырма жаса:
1. Қолдау қажет оқушыларға (базалық)
2. Орташа деңгейдегі оқушыларға
3. Дарынды оқушыларға (тереңдетілген)

Жауапты ${L} бер.`.trim();

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
2. Ешқандай сыртқы CDN, import жоқ — тек inline JS/CSS
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

    // 11. Жалпы сұрақ
    default:
      return `\${prompt}\n\nЖауапты \${L} бер.`;
  }
}
