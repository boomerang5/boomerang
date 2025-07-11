import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateContactFavorite({
  idContactoUsuario,
  favorito,
}: {
  idContactoUsuario: number;
  favorito: boolean;
}) {
  try {
    const { data, error } = await supabase.rpc("update_contact_favorite", {
      p_id_contacto_usuario: idContactoUsuario,
      p_favorito: favorito
    });

    if (error) {
      console.error("❌ Error al ejecutar la función:", error);
      process.exit(1);
    }

    console.log("✅ Contacto actualizado correctamente. Resultado:", data);
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

// ejemplo de uso
const idContactoUsuario = 12; // el id de ContactoUsuario
const favorito = true;       // true o false

updateContactFavorite({ idContactoUsuario, favorito });
