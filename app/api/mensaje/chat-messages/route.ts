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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id_chat = searchParams.get("id_chat");
    const id_usuario = searchParams.get("id_usuario");
    
    if (!id_chat || !id_usuario) {
      return NextResponse.json(
        { error: "Faltan parámetros: id_chat, id_usuario" },
        { status: 400 }
      );
    }

    const auth = req.headers.get("authorization") || "";

    const base = getBaseURL();
    if (!base) {
      return NextResponse.json(
        { message: "Falta configurar la URL del backend (env var)." },
        { status: 500 }
      );
    }

    // Endpoint del backend que usa la función RPC mejorada
    const upstream = `${base.replace(/\/+$/, "")}/api/mensajes/chat-messages?id_chat=${encodeURIComponent(id_chat)}&id_usuario=${encodeURIComponent(id_usuario)}`;

    const r = await fetch(upstream, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        authorization: auth, // forwardeamos el token de Supabase
      },
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
      { message: err?.message || "Fallo al obtener mensajes del chat." },
      { status: 500 }
    );
  }
}