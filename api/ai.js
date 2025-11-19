import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { prompt } = JSON.parse(req.body);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a Kazakh teacher assistant for school lessons." },
        { role: "user", content: prompt }
      ],
      max_tokens: 400
    });

    res.status(200).json({
      answer: response.choices[0].message.content
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}
