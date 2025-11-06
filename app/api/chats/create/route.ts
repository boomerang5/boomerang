import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  "http://localhost:3001"; // <— ajustá a tu backend real

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const body = await req.text();

    const upstreamUrl = `${API_BASE}/api/chats/create`;

    const r = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { authorization: auth } : {}),
      },
      body,
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return new NextResponse(text || "Upstream error", { status: r.status });
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy error" },
      { status: 500 }
    );
  }
}