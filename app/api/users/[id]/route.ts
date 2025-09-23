import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const base = process.env.BACKEND_API_BASE_URL || 'http://localhost:3001';
  const { id } = await params;
  const res = await fetch(`${base}/api/users/${id}`, { cache: 'no-store' });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
