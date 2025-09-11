// app/api/chats/user/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // evita cache en Vercel/Next

// Configurá tu base URL del backend en .env.local
// por ejemplo: API_BASE_URL=https://tu-backend.com
const API_BASE =
  process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET(req: NextRequest) {
  try {
    if (!API_BASE) {
      return NextResponse.json(
        { error: "API_BASE_URL no configurado" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id_usuario = searchParams.get("id_usuario");
    if (!id_usuario) {
      return NextResponse.json(
        { error: "Falta el parámetro id_usuario" },
        { status: 400 }
      );
    }

    const auth = req.headers.get("authorization") || "";

    const upstreamUrl = `${API_BASE}/api/chats/user?id_usuario=${encodeURIComponent(
      id_usuario
    )}`;

    const r = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        // reenviamos el token del usuario
        Authorization: auth,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    // devolvemos tal cual (status + body) lo del backend
    const text = await r.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: r.status });
    } catch {
      // si no es JSON válido, devolvemos texto
      return new NextResponse(text, {
        status: r.status,
        headers: { "Content-Type": r.headers.get("content-type") || "text/plain" },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Fallo al consultar /api/chats/user" },
      { status: 500 }
    );
  }
}
