import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.API_BASE ||
  process.env.BACKEND_URL ||
  "";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const url = new URL(req.url);
    const id_mensaje = url.searchParams.get("id_mensaje");
    if (!id_mensaje) {
      return NextResponse.json({ ok: false, error: "Falta id_mensaje" }, { status: 400 });
    }

    const upstream = await fetch(
      `${API_BASE}/api/mensaje/getfile?id_mensaje=${encodeURIComponent(id_mensaje)}`,
      { headers: auth ? { Authorization: auth } : undefined }
    );

    const ct = upstream.headers.get("content-type") || "application/json";
    const text = await upstream.text();
    return new NextResponse(text, { status: upstream.status, headers: { "content-type": ct } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
