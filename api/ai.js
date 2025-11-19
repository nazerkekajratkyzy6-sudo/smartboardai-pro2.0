export default async function handler(req, res) {
  try {
    // Body оқу
    const body = req.body ? JSON.parse(req.body) : {};
    const prompt = body.prompt || "Сұрақ бос.";

    // API key оқу
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API KEY жоқ!!!" });
    }

    // OpenAI шақыру
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Сен қазақ мұғалімдеріне көмектесетін ассистентсің." },
          { role: "user", content: prompt }
        ],
        max_tokens: 300
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const answer = data.choices?.[0]?.message?.content || "Жауап табылмады.";

    res.status(200).json({ answer });

  } catch (err) {
    console.log("SERVER ERROR:", err);
    res.status(500).json({ error: err.toString() });
  }
}
