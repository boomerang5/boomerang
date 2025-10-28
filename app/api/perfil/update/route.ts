// app/api/perfil/update/route.ts
import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const base = process.env.BACKEND_API_BASE_URL || "http://localhost:3001";
  const auth = req.headers.get("authorization") || undefined;

  const raw = await req.json();

  // Helpers
  const toISO = (val?: string | null) => {
    if (!val) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;              // yyyy-mm-dd
    const m = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);   // dd/mm/yyyy
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  };

  const toInt = (v: unknown) => {
    const n = typeof v === "string" ? v.trim() : v;
    const num = Number(n);
    return Number.isFinite(num) ? num : null;
  };

  // Si llegan etiquetas en vez de IDs, mapear (ajusta según tu catálogo real)
  const mapGeneroEtiquetaAId = (g: unknown): number | null => {
    if (g == null) return null;
    if (typeof g === "number") return g;
    const s = String(g).toLowerCase();
    if (s.includes("masculino")) return 1;
    if (s.includes("femenino")) return 2;
    if (s.includes("otro")) return 3;
    return toInt(g); // intenta parsear número si vino como "1"
  };

  const mapIdiomaEtiquetaAId = (i: unknown): number | null => {
    if (i == null) return null;
    if (typeof i === "number") return i;
    const s = String(i).toLowerCase();
    if (s.includes("espa")) return 1;   // Español -> 1 (ajusta!)
    if (s.includes("ingl")) return 2;   // Inglés  -> 2
    if (s.includes("portu")) return 3;  // Portugués -> 3
    return toInt(i);
  };

  // Normalización
  // Normalizar/extraer solo las claves que el frontend envía por defecto.
  // El frontend (app/protected/perfil/editar/page.tsx) envía 6 claves: id, nombre, apellido, idioma, apodo, pais.
  // Permitimos además recibir opcionalmente id_genero/genero y fecha_nacimiento si el cliente las incluye.
  const generoParsed = mapGeneroEtiquetaAId(raw.genero ?? raw.id_genero);
  const fechaIso = toISO(raw.fecha_nacimiento);
  const idiomaParsed = mapIdiomaEtiquetaAId(raw.idioma ?? raw.id_idioma);

  const body: Record<string, unknown> = {
    id: toInt(raw.id),
    nombre: String(raw.nombre ?? "").trim(),
    apellido: String(raw.apellido ?? "").trim(),
    apodo: String(raw.apodo ?? "").trim(),
    pais: (raw.pais ?? "").toString().trim(),
    idioma: idiomaParsed,
  };

  if (generoParsed != null) body.genero = generoParsed; // opcional
  if (fechaIso) body.fecha_nacimiento = fechaIso;     // opcional

  // Validación local para no depender del 400 del backend
  // Validación local: sólo los campos obligatorios que el frontend ya envía
  const faltantes: string[] = [];
  if (!body.id) faltantes.push("id");
  if (!body.nombre) faltantes.push("nombre");
  if (!body.apellido) faltantes.push("apellido");
  if (!body.apodo) faltantes.push("apodo");
  if (!body.pais) faltantes.push("pais");
  if (body.idioma == null) faltantes.push("idioma");

  if (faltantes.length) {
    return new Response(
      JSON.stringify({ error: "Faltan campos requeridos.", fields: faltantes }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // Reenvío al backend
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
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
