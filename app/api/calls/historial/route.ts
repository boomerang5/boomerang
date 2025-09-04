import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const upstream = `${API_BASE}/api/calls/history?${sp.toString()}`
  const r = await fetch(upstream, { headers: { 'content-type': 'application/json' } })
  const body = await r.text()
  return new NextResponse(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') ?? 'application/json' } })
}