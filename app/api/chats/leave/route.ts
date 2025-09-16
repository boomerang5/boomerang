import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE ||
  "http://localhost:3001"; // <-- ajustá a tu backend real

// Proxy: POST /api/chats/leave
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const body = await req.text();

    const upstreamUrl = `${API_BASE}/api/chats/leave`;

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

// Proxy opcional: DELETE /api/chats/leave?id_usuario=..&id_chat=..
export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const { searchParams } = new URL(req.url);
    const id_usuario = searchParams.get("id_usuario");
    const id_chat = searchParams.get("id_chat");
    if (!id_usuario || !id_chat) {
      return NextResponse.json(
        { error: "Faltan parámetros: id_usuario, id_chat" },
        { status: 400 }
      );
    }

    const upstreamUrl = `${API_BASE}/api/chats/leave?id_usuario=${encodeURIComponent(
      id_usuario
    )}&id_chat=${encodeURIComponent(id_chat)}`;

    const r = await fetch(upstreamUrl, {
      method: "DELETE",
      headers: {
        ...(auth ? { authorization: auth } : {}),
      },
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
