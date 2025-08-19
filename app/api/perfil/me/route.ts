// app/api/perfil/me/route.ts
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const base = process.env.BACKEND_API_BASE_URL || "http://localhost:3001";
  const { searchParams } = new URL(req.url);
  const uuid = searchParams.get("uuid");            // 👈 viene del cliente
  if (!uuid) {
    return new Response(JSON.stringify({ error: "Falta uuid" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const upstream = `${base}/api/users/uuid/${uuid}`;
  const auth = req.headers.get("authorization") || undefined;

  const res = await fetch(upstream, {
    headers: { ...(auth ? { Authorization: auth } : {}) },
    cache: "no-store",
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
