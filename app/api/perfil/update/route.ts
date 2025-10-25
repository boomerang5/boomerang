// app/api/perfil/update/route.ts
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const base = process.env.BACKEND_API_BASE_URL || "http://localhost:3001";
  const auth = req.headers.get("authorization") || undefined;

    // 🧠 Leemos y normalizamos el body antes de reenviar
    const rawBody = await req.json();

    // Conversión de fecha "dd/MM/yyyy" → "yyyy-MM-dd"
    const toISO = (val?: string | null) => {
      if (!val) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
    };

    const body = {
      id: Number(rawBody.id),
      nombre: String(rawBody.nombre ?? ""),
      apellido: String(rawBody.apellido ?? ""),
      idioma: Number(rawBody.idioma ?? rawBody.id_idioma ?? 1),
      apodo: String(rawBody.apodo ?? ""),
      pais: rawBody.pais ?? null,
      genero: rawBody.genero !== undefined ? Number(rawBody.genero) : undefined,
      fecha_nacimiento: toISO(rawBody.fecha_nacimiento),
    };

    const res = await fetch(`${base}/api/users/update`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  }
