import { NextResponse } from "next/server";
import OpenAI from "openai";

const CHAT_SYSTEM_PROMPT = `You are helpem, a personal life assistant. You have access to the user's appointments, todos, and habits data.

Your capabilities:
1. ANSWER QUESTIONS about the user's schedule, tasks, and habits (past and future up to 1 year)
2. ADD NEW ITEMS when the user wants to create appointments, todos, or habits
3. SCHEDULE SMARTLY by considering existing commitments when suggesting times

When answering questions:
- Be conversational and helpful
- Reference specific items from their data
- For scheduling requests, check for conflicts
- For past questions, look at completed items and habit logs

When adding items, respond with JSON in this format:
{
  "action": "add",
  "type": "todo" | "habit" | "appointment",
  "title": "string",
  "priority": "low" | "medium" | "high" (for todos),
  "datetime": "ISO 8601 string" (for appointments),
  "frequency": "daily" | "weekly" (for habits)
}

For questions/conversations, respond with:
{
  "action": "response",
  "message": "your helpful response here"
}

Current date/time: {{CURRENT_DATETIME}}

USER'S DATA:
{{USER_DATA}}
`;

function formatUserData(data: { todos: any[]; habits: any[]; appointments: any[] }): string {
  const lines: string[] = [];
  
  lines.push("=== APPOINTMENTS ===");
  if (data.appointments.length === 0) {
    lines.push("No appointments scheduled.");
  } else {
    data.appointments.forEach(apt => {
      const date = new Date(apt.datetime).toLocaleString();
      lines.push(`- ${apt.title} (${date})`);
    });
  }
  
  lines.push("\n=== TODOS ===");
  if (data.todos.length === 0) {
    lines.push("No todos.");
  } else {
    data.todos.forEach(todo => {
      const status = todo.completedAt ? "✓ DONE" : `[${todo.priority}]`;
      const due = todo.dueDate ? ` - due ${new Date(todo.dueDate).toLocaleDateString()}` : "";
      const completed = todo.completedAt ? ` - completed ${new Date(todo.completedAt).toLocaleDateString()}` : "";
      lines.push(`- ${status} ${todo.title}${due}${completed}`);
    });
  }
  
  lines.push("\n=== HABITS ===");
  if (data.habits.length === 0) {
    lines.push("No habits tracked.");
  } else {
    data.habits.forEach(habit => {
      const recentLogs = habit.completions.slice(-7).map((c: any) => 
        new Date(c.date).toLocaleDateString()
      ).join(", ");
      lines.push(`- ${habit.title} (${habit.frequency}) - recent: ${recentLogs || "none"}`);
    });
  }
  
  return lines.join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  const client = new OpenAI({ apiKey });
  const { message, userData } = await req.json();

  const now = new Date();
  const currentDateTime = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const systemPrompt = CHAT_SYSTEM_PROMPT
    .replace('{{CURRENT_DATETIME}}', currentDateTime)
    .replace('{{USER_DATA}}', formatUserData(userData));

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;

  try {
    return NextResponse.json(JSON.parse(content!));
  } catch {
    // If not valid JSON, treat as plain text response
    return NextResponse.json({
      action: "response",
      message: content
    });
  }
}
