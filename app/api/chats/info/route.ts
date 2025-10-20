// app/api/chats/info/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id_usuario = searchParams.get("id_usuario");
    const id_chat = searchParams.get("id_chat");

    if (!id_usuario || !id_chat) {
      return NextResponse.json(
        { message: "Faltan parámetros: id_usuario e id_chat" },
        { status: 400 }
      );
    }

    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!auth) {
      return NextResponse.json({ message: "Falta Authorization" }, { status: 401 });
    }

    const base =
      process.env.BACKEND_API_BASE_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:3001';

    console.log('🔧 URL del backend configurada:', base);

    const url = `${base.replace(/\/+$/, "")}/api/chats/info?id_usuario=${encodeURIComponent(
      id_usuario
    )}&id_chat=${encodeURIComponent(id_chat)}`;

    console.log('🌐 URL completa para obtener info del chat:', url);

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: auth,
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { message: "Error desde backend", status: r.status, body: text },
        { status: r.status }
      );
    }

    // si viene vacío, volvemos []
    const json = text ? JSON.parse(text) : null;
    return NextResponse.json(json ?? {});
  } catch (err: any) {
    return NextResponse.json(
      { message: "Fallo /api/chats/info", error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
