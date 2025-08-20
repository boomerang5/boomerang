import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Cargar .env desde backend/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  throw new Error("❌ Faltan variables SUPABASE en el archivo .env");
}

// Cliente para uso común (frontend / scripts básicos)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Cliente con permisos elevados (ignora RLS)
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

export default supabase;
