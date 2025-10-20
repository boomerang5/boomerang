// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente para el NAVEGADOR (RPC/SELECT con RLS)
 * Usa variables PÚBLICAS (NEXT_PUBLIC_).
 */
const PUBLIC_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLIC_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(PUBLIC_URL, PUBLIC_ANON);

/**
 * Cliente ADMIN para el SERVIDOR (route handlers /api, descarga de Storage privado, etc.)
 * JAMÁS importarlo desde componentes cliente.
 */
const SRV_URL = process.env.SUPABASE_URL;
const SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin =
  SRV_URL && SRV_KEY
    ? createClient(SRV_URL, SRV_KEY, { auth: { persistSession: false } })
    : null;

/** Bucket (clave interna del archivo NO incluye el nombre del bucket) */
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "calls";

/**
 * Helper para bajar y parsear NDJSON.
 * Debe usarse en el SERVIDOR (usa supabaseAdmin si está disponible).
 * Si el bucket fuese público, podría funcionar también con el cliente público.
 */
export async function downloadNdjson(path: string): Promise<any[]> {
  const client = supabaseAdmin ?? supabase; // prioriza admin (privado)
  const { data, error } = await client.storage.from(SUPABASE_BUCKET).download(path);
  if (error) throw error;
  const text = await data.text();
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}