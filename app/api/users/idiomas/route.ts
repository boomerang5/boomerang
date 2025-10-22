import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const base = process.env.BACKEND_API_BASE_URL || 'http://localhost:3001';
    const auth = req.headers.get('authorization') || undefined;

    const response = await fetch(`${base}/api/users/idiomas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { 'Authorization': auth } : {}),
      },
      cache: 'no-store'
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 
        'Content-Type': response.headers.get('content-type') ?? 'application/json' 
      },
    });
  } catch (error) {
    console.error('Error in idiomas proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}