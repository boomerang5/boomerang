import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUsuarioUuid(uuidUsuario: string) {

  try {
    const { data, error } = await supabase.rpc("get_usuario_uuid", {
      p_user_id: uuidUsuario,
    });

    if (error) {
      console.error("❌ Error al llamar la función:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ No se encontró el usuario con ese UUID.");
    } else {
      console.log("✅ Usuario encontrado:");
      console.log("✅ Consulta realizada con éxito. Resultado:", data)
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

const uuidUsuario = "4b268139-258c-4dc4-9a0f-12b536dfc637"; // 👈 Cambia este valor por el UUID real que quieras consultar

getUsuarioUuid(uuidUsuario);
