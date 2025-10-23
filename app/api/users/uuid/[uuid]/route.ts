import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const base = process.env.BACKEND_API_BASE_URL || 'http://localhost:3001';
  const { uuid } = await params;
  
  // Pasar el token de autorización si existe
  const auth = req.headers.get("authorization") || "";
  
  const res = await fetch(`${base}/api/users/uuid/${uuid}`, { 
    cache: 'no-store',
    headers: {
      ...(auth && { 'Authorization': auth }),
      'Content-Type': 'application/json'
    }
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
