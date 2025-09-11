import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Ajustá el nombre de la env var según tu proyecto.
// Usará el primero que encuentre.
function getBaseURL() {
  return (
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = req.headers.get("authorization") || "";

    const base = getBaseURL();
    if (!base) {
      return NextResponse.json(
        { message: "Falta configurar la URL del backend (env var)." },
        { status: 500 }
      );
    }

    // Swagger: POST /api/chats/delete
    const upstream = `${base.replace(/\/+$/, "")}/api/chats/delete`;

    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: auth, // forwardeamos el token de Supabase
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await r.text();
    const contentType = r.headers.get("content-type") || "application/json";
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": contentType },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Fallo al eliminar el chat." },
      { status: 500 }
    );
  }
}
