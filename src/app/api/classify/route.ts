import { NextResponse } from "next/server";
import OpenAI from "openai";
import { LIFE_ASSISTANT_PROMPT } from "@/lib/prompt";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  const { input } = await req.json();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: LIFE_ASSISTANT_PROMPT },
      { role: "user", content: input },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;

  try {
    return NextResponse.json(JSON.parse(content!));
  } catch {
    return NextResponse.json(
      { error: "Invalid LLM response" },
      { status: 500 }
    );
  }
}
