import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getContactsFavorites(p_id_usuario: number) {
  console.log(`🧪 Ejecutando RPC add_contact con parámetros: { p_id_usuario: ${p_id_usuario}`);

  const { data, error } = await supabase.rpc("get_contacts_favorites", {
    p_id_usuario
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error.message);
    process.exit(1);
  }

  console.log("✅ Consulta realizada con éxito. Resultado:", data); //Si da null se ejecutpo correctamente
}

// ejemplo de uso:
const usuarioId = 1;

getContactsFavorites(usuarioId);
