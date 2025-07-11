const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  try {
    const { data, error } = await supabase
      .from("Usuario")
      .select(
        "id, nombre, apellido, mail, auth_provider, fecha_registro, idioma, User_id, apodo"
      )
      .limit(5);

    if (error) {
      console.error("❌ Error al consultar la base de datos:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ No se encontraron registros.");
    } else {
      console.log("✅ Datos obtenidos de la tabla Usuario:");
      console.table(data);
    }
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

main();
