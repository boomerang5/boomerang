import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  "";

if (!API_BASE) {
  console.warn(
    "[mensaje/create-file] Falta NEXT_PUBLIC_BACKEND_URL (o API_BASE/BACKEND_URL)"
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const form = await req.formData();

    const res = await fetch(`${API_BASE}/api/mensaje/create-file`, {
      method: "POST",
      headers: auth ? { Authorization: auth } : undefined,
      body: form, // mantiene el boundary automáticamente
    });

    const ct = res.headers.get("content-type") || "application/json";
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "content-type": ct } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
