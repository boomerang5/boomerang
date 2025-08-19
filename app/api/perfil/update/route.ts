// app/api/perfil/update/route.ts
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const base = process.env.BACKEND_API_BASE_URL || "http://localhost:3001";
  const body = await req.text();                     // reenviamos tal cual
  const auth = req.headers.get("authorization") || undefined;

  const res = await fetch(`${base}/api/users/update`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
