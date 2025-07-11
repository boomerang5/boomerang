import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main(): Promise<void> {
  const userId: string = "4b268139-258c-4dc4-9a0f-12b536dfc637";

  try {
    const { data, error } = await supabase.rpc("get_usuario_by_id", {
      p_user_id: userId,
    });

    if (error) {
      console.error("❌ Error al llamar la función:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ No se encontró el usuario con ese UUID.");
    } else {
      console.log("✅ Usuario encontrado:");
      console.table(data);
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

main();
