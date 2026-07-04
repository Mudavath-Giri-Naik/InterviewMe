const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

interface GroqChatOptions {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  reasoningEffort?: "low" | "medium" | "high";
}

export async function groqChat({
  system,
  user,
  model = DEFAULT_MODEL,
  temperature = 0.8,
  maxTokens = 400,
  json = false,
  reasoningEffort = "low",
}: GroqChatOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local and restart the dev server.");
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_completion_tokens: maxTokens,
      // gpt-oss are reasoning models — low effort keeps turn-taking snappy.
      reasoning_effort: reasoningEffort,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const content: string | undefined = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty completion.");
  }
  return content.trim();
}
