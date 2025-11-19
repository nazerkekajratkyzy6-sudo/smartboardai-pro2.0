import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const body = req.body ? JSON.parse(req.body) : {};
    const prompt = body.prompt || "";

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a Kazakh teacher AI assistant." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300
    });

    const result = completion.choices[0].message.content;

    res.status(200).json({ answer: result });

  } catch (err) {
    console.log("AI ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
