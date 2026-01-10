import { NextResponse } from "next/server";
import OpenAI from "openai";

let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

const CHAT_SYSTEM_PROMPT = `You are helpem, a friendly voice-first life assistant. Keep responses concise and conversational since they will be spoken aloud.

Your capabilities:
1. Add todos, habits, or appointments
2. Answer questions about the user's schedule, tasks, and habits
3. Give helpful suggestions

Current date/time: {{currentDateTime}}

User's current data:
{{userData}}

RESPONSE FORMAT:
For adding items, respond with JSON:
{
  "action": "add",
  "type": "todo" | "habit" | "appointment",
  "title": "string",
  "priority": "low" | "medium" | "high" (for todos),
  "datetime": "ISO string" (for appointments),
  "frequency": "daily" | "weekly" (for habits)
}

For questions or conversation, respond with JSON:
{
  "action": "respond",
  "message": "your conversational response"
}

Always respond with valid JSON only. No markdown, no explanation outside JSON.
Keep spoken responses under 2 sentences when possible.`;

export async function POST(req: Request) {
  const { message, userData } = await req.json();

  const client = getOpenAIClient();

  const currentDateTime = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedUserData = `
Todos: ${JSON.stringify(userData.todos || [], null, 2)}
Habits: ${JSON.stringify(userData.habits || [], null, 2)}
Appointments: ${JSON.stringify(userData.appointments || [], null, 2)}
`;

  const systemPrompt = CHAT_SYSTEM_PROMPT
    .replace("{{currentDateTime}}", currentDateTime)
    .replace("{{userData}}", formattedUserData);

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || "";

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      // If not valid JSON, wrap it as a message
      return NextResponse.json({
        action: "respond",
        message: content,
      });
    }
  } catch (error) {
    console.error("OpenAI chat error:", error);
    return NextResponse.json(
      { action: "error", error: "I had trouble understanding that. Could you try again?" },
      { status: 500 }
    );
  }
}
