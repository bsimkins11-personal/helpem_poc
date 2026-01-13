import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    console.log("Saving message to DB:", message);

    await query(
      'INSERT INTO user_inputs (content) VALUES ($1)',
      [message || 'test message']
    );

    console.log("DATABASE SAVE SUCCESSFUL");
    return NextResponse.json({ success: true, message: "Saved to database!" });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("DATABASE SAVE ERROR:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await query('SELECT * FROM user_inputs ORDER BY id DESC LIMIT 10');
    return NextResponse.json({ 
      success: true, 
      count: result.rowCount,
      rows: result.rows 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("DATABASE READ ERROR:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
