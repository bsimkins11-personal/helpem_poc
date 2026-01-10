import { NextResponse } from "next/server";
import OpenAI from "openai";
import { AGENT_INSTRUCTIONS } from "@/lib/agentInstructions";

let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

const OPERATIONAL_RULES = `
=== CURRENT CONTEXT ===
RIGHT NOW IT IS: {{currentDateTime}}

=== USER'S CURRENT DATA ===
{{userData}}

=== CATEGORY HANDLING ===
THE THREE CATEGORIES (keep them separate in responses):
1. TODOS: Tasks to complete (no specific times) - from === TODOS === section
2. APPOINTMENTS: Calendar events with specific times - from === APPOINTMENTS === section
3. ROUTINES: Recurring daily/weekly activities - from === ROUTINES === section

CATEGORY TRIGGERS:
- "todos" / "tasks" / "to-do" / "get done" / "need to do" → TODOS section only
- "schedule" / "calendar" / "appointments" / "meetings" / "what do I have" → APPOINTMENTS section only
- "routines" / "daily" / "streak" / "wellness" → ROUTINES section only

RESPONSE PATTERN:
1. Answer the specific question thoroughly from the relevant category
2. End with a brief offer: "Would you like to hear about your [other categories] too?"
3. If user says "yes" or asks for more, provide the next category

=== DATE FORMATTING ===
- Use format: "Friday, January 10th at 3:00 PM"
- Group multi-day responses by day first, then time
- Be time-aware - if it's 2 PM and they ask about "today", only show future events

=== JSON RESPONSE FORMAT ===
For adding items:
{
  "action": "add",
  "type": "todo" | "routine" | "appointment",
  "title": "string",
  "priority": "low" | "medium" | "high" (for todos),
  "datetime": "ISO string" (for appointments),
  "frequency": "daily" | "weekly" (for routines)
}

For changing todo priority:
{
  "action": "update_priority",
  "todoTitle": "exact title from list",
  "newPriority": "low" | "medium" | "high"
}

For questions or conversation:
{
  "action": "respond",
  "message": "your conversational response"
}

Always respond with valid JSON only. No markdown outside JSON.
`;

// Helper to format date with ordinal suffix
function formatDateForAI(date: Date, now: Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  // Check if it's today or tomorrow
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateOnly = new Date(d);
  dateOnly.setHours(0, 0, 0, 0);
  
  let dateStr: string;
  if (dateOnly.getTime() === today.getTime()) {
    dateStr = "Today";
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    dateStr = "Tomorrow";
  } else {
    dateStr = d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).replace(/\d+/, `${day}${ordinal}`);
  }
  
  return dateStr + " at " + d.toLocaleTimeString("en-US", {
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

function formatCurrentDateTime(date: Date): string {
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).replace(/\d+,/, `${day}${ordinal},`);
  
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  
  return `${datePart} at ${timePart}`;
}

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  const { message, conversationHistory, userData, currentDateTime } = await req.json();

  const client = getOpenAIClient();

  // Use client's datetime if provided, otherwise use server time
  const now = currentDateTime ? new Date(currentDateTime) : new Date();
  const formattedNow = formatCurrentDateTime(now);

  // Format appointments with readable dates for the AI
  const formattedAppointments = (userData.appointments || []).map((apt: { title: string; datetime: string | Date }) => ({
    title: apt.title,
    when: formatDateForAI(new Date(apt.datetime), now),
    rawDatetime: apt.datetime,
  }));

  // Format todos with due dates
  const formattedTodos = (userData.todos || []).map((todo: { title: string; priority: string; dueDate?: string | Date; completedAt?: string | Date }) => ({
    title: todo.title,
    priority: todo.priority,
    dueDate: todo.dueDate ? formatDateForAI(new Date(todo.dueDate), now) : null,
    completed: !!todo.completedAt,
  }));

  // Format habits with completion status
  const formattedHabits = (userData.habits || []).map((habit: { title: string; frequency: string; completions: { date: string | Date }[] }) => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const completedToday = habit.completions.some((c: { date: string | Date }) => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === today.getTime();
    });
    return {
      title: habit.title,
      frequency: habit.frequency,
      completedToday,
      streak: habit.completions.length,
    };
  });

  const formattedUserData = `
=== APPOINTMENTS (calendar events with specific times) ===
${formattedAppointments.map((a: { title: string; when: string }) => `- ${a.title}: ${a.when}`).join("\n") || "None scheduled"}

=== TODOS (tasks to complete - NOT calendar events) ===
${formattedTodos.filter((t: { completed: boolean }) => !t.completed).map((t: { title: string; priority: string; dueDate: string | null }) => `- [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ""}`).join("\n") || "None"}

=== ROUTINES (recurring activities) ===
${formattedHabits.map((h: { title: string; frequency: string; completedToday: boolean }) => `- ${h.title} (${h.frequency}) ${h.completedToday ? "✓ done today" : "○ not done today"}`).join("\n") || "None"}
`;

  // Combine agent instructions with operational rules
  const systemPrompt = AGENT_INSTRUCTIONS + "\n\n" + OPERATIONAL_RULES
    .replace("{{currentDateTime}}", formattedNow)
    .replace("{{userData}}", formattedUserData);

  try {
    // Build messages array with conversation history for context
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (maintains context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: ConversationMessage) => {
        chatMessages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add the current message
    chatMessages.push({ role: "user", content: message });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
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
