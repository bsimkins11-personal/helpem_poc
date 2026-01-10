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

IMPORTANT DATE FORMATTING:
When mentioning dates in your responses, ALWAYS use this format: "Day, Month Date" with ordinal suffix.
Examples: "Friday, January 16th", "Monday, March 3rd", "Tuesday, December 22nd"
Never use numeric date formats like "1/16" or "2025-01-16".

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

// Helper to format date with ordinal suffix
function formatDateForAI(date: Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).replace(/\d+/, `${day}${ordinal}`) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

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

  // Format appointments with readable dates for the AI
  const formattedAppointments = (userData.appointments || []).map((apt: { title: string; datetime: string | Date }) => ({
    title: apt.title,
    when: formatDateForAI(new Date(apt.datetime)),
  }));

  const formattedUserData = `
Todos: ${JSON.stringify(userData.todos || [], null, 2)}
Habits: ${JSON.stringify(userData.habits || [], null, 2)}
Appointments: ${JSON.stringify(formattedAppointments, null, 2)}
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
