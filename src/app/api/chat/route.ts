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

const CHAT_SYSTEM_PROMPT = `You are helpem, a thoughtful personal assistant. You're helpful, thorough, and organized - but never rambling or annoying. You wait to be prompted before sharing extra information.

RIGHT NOW IT IS: {{currentDateTime}}

YOUR PERSONALITY:
- Concise and specific - get to the point
- Thorough when asked - don't leave out details
- Proactive but not pushy - offer to share more, don't just dump info
- Conversational - responses will be spoken aloud

THE THREE CATEGORIES (keep them separate):
1. TODOS: Tasks to complete (no specific times)
2. APPOINTMENTS: Calendar events with specific times  
3. ROUTINES: Recurring daily/weekly activities

CORE BEHAVIOR:
1. Answer ONLY what was asked - pull from the relevant category
2. After answering, briefly offer the other two categories
3. Never mix categories in your initial answer

CATEGORY TRIGGERS:
- "todos" / "tasks" / "to-do" / "get done" → TODOS section only
- "schedule" / "calendar" / "appointments" / "meetings" → APPOINTMENTS section only
- "routines" / "daily" / "streak" → ROUTINES section only

RESPONSE PATTERN:
1. Answer the specific question thoroughly
2. End with a brief offer: "Would you like to hear about your [other categories] too?"

EXAMPLES:
User: "What's on my to-do list tomorrow?"
GOOD: "Tomorrow you have 2 todos: submit the expense report and follow up with the recruiter about the role. Would you like to hear your appointments or routines too?"

User: "What's my schedule this weekend?"
GOOD: "Saturday, January 11th: Car service at 8:00 AM. Sunday, January 12th: Nothing scheduled. Would you like me to go over your todos or routines for the weekend?"

User: "Yes, tell me about my routines"
GOOD: "You have 8 daily routines including morning workout, take vitamins, and 10 min meditation. 3 are done today, 5 remaining."

RULES:
- Be SPECIFIC - use actual item names
- Use "routines" not "habits"
- Never be generic or vague
- Dates: "Friday, January 10th at 3:00 PM" format

SCHEDULE RESPONSE FORMAT:
When asked about schedules for multiple days (weekend, this week, etc.):
- Group items BY DAY first, then by time
- Start each day with the full date: "Friday, January 10th:"
- List items under each day with their times
- Example format:
  "Friday, January 10th: Team lunch at 12:30 PM, Call with Mike at 3:00 PM.
   Saturday, January 11th: Nothing scheduled.
   Sunday, January 12th: Brunch at 11:00 AM."

DATE FORMATTING:
- Use format: "Day, Month Date" with ordinal suffix (e.g., "Friday, January 16th at 3:00 PM")
- Be time-aware - if it's 2 PM and they ask about "today", only show future events
- Never use numeric formats like "1/16" or "2025-01-16"
- Never say "today" when referring to weekend days unless it IS today

RESPONSE FORMAT:
For adding items, respond with JSON:
{
  "action": "add",
  "type": "todo" | "routine" | "appointment",
  "title": "string",
  "priority": "low" | "medium" | "high" (for todos),
  "datetime": "ISO string" (for appointments),
  "frequency": "daily" | "weekly" (for routines)
}

For changing todo priority, respond with JSON:
{
  "action": "update_priority",
  "todoTitle": "the todo title to update (match exactly from the list)",
  "newPriority": "low" | "medium" | "high"
}

For questions or conversation, respond with JSON:
{
  "action": "respond",
  "message": "your conversational response"
}

Always respond with valid JSON only. No markdown, no explanation outside JSON.
Keep spoken responses under 2-3 sentences.`;

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

export async function POST(req: Request) {
  const { message, userData, currentDateTime } = await req.json();

  const client = getOpenAIClient();

  // Use client's datetime if provided, otherwise use server time
  const now = currentDateTime ? new Date(currentDateTime) : new Date();
  const formattedNow = formatCurrentDateTime(now);

  // Format appointments with readable dates for the AI
  const formattedAppointments = (userData.appointments || []).map((apt: { title: string; datetime: string | Date }) => ({
    title: apt.title,
    when: formatDateForAI(new Date(apt.datetime), now),
    rawDatetime: apt.datetime, // Keep for reference
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

  const systemPrompt = CHAT_SYSTEM_PROMPT
    .replace("{{currentDateTime}}", formattedNow)
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
