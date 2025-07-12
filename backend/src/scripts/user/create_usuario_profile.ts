import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// cargar variables de entorno
dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

// inicializar supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// objeto simulado desde el front
const usuario = {
  nombre: "Paula",
  apellido: "Arrascaeta",
  idioma: 1,
  apodo: "Peu",
  user_id: "fd4680cc-e879-4a70-8c19-21c1d0ab3ee6"
};

async function main() {
  try {
    const { data, error } = await supabase.rpc("create_usuario_profile", {
      p_nombre: usuario.nombre,
      p_apellido: usuario.apellido,
      p_idioma: usuario.idioma,
      p_apodo: usuario.apodo,
      p_user_id: usuario.user_id
    });

    if (error) {
      console.error("❌ Error al ejecutar la función:", error);
      process.exit(1);
    }

    console.log("✅ Usuario creado correctamente, id:", data);
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    process.exit(1);
  }
}

main();
