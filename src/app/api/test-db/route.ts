import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, type } = body; // We now look for a 'type' field

    console.log(`Received ${type || 'unknown'} message: ${message}`);

    // Save to Database
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO user_inputs (content) VALUES ($1)',
        [message]
      );
    } finally {
      client.release();
    }

    // UAT FIX: Check the type to decide the response
    if (type === 'text') {
      return NextResponse.json({ 
        success: true, 
        message: "Text saved successfully!", 
        responseType: "text" 
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: "Voice saved and processed!", 
        responseType: "voice" 
      });
    }

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM user_inputs ORDER BY created_at DESC');
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
