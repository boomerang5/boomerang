// app/api/chats/create-group-with-chat/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.API_BASE_URL ||
    process.env.BACKEND_URL;
  if (!base) throw new Error("Falta configurar la URL del backend (API_BASE_URL).");
  return base.replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // Validación rápida del payload esperado por el swagger
    const id_usuario_creador = Number(body?.id_usuario_creador);
    const nombre = (body?.nombre ?? "").toString().trim();
    const descripcion = (body?.descripcion ?? "").toString();
    const participantes = Array.isArray(body?.participantes)
      ? (body.participantes as any[]).map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];

    if (!id_usuario_creador || !nombre || participantes.length === 0) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          detail:
            "Se requieren: id_usuario_creador (number), nombre (string) y participantes (number[]).",
        },
        { status: 400 }
      );
    }

    const API_BASE = requireEnv();
    const url = `${API_BASE}/api/chats/create-group-with-chat`;

    // Reenviamos el token si viene del cliente
    const auth = req.headers.get("authorization") || "";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({
        id_usuario_creador,
        nombre,
        descripcion,
        participantes,
      }),
      signal: controller.signal,
      // nada de cache
    }).catch((e) => {
      throw new Error("Fallo al contactar el backend: " + e.message);
    });
    clearTimeout(timeout);

    // Intentamos devolver tal cual el backend
    const ct = upstream.headers.get("content-type") || "";
    const text = await upstream.text();
    const maybeJson = ct.includes("application/json");
    const payload = maybeJson ? JSON.parse(text || "{}") : { raw: text };

    if (!upstream.ok) {
      // Burbujeamos el status del backend con su mensaje
      return NextResponse.json(
        { error: "Upstream error", status: upstream.status, payload },
        { status: upstream.status }
      );
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch (err: any) {
    console.error("[create-group-with-chat] ERROR:", err);
    return NextResponse.json(
      { error: "Internal error in route", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
