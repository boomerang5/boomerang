import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateUsuarioProfile({
  id,
  nombre,
  apellido,
  idioma,
  apodo,
}: {
  id: number;
  nombre: string;
  apellido: string;
  idioma: number;
  apodo: string;
}) {
  const { data, error } = await supabase.rpc("update_usuario_profile", {
    p_id: id,
    p_nombre: nombre,
    p_apellido: apellido,
    p_idioma: idioma,
    p_apodo: apodo,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Perfil actualizado correctamente. Resultado:", data);
}

// ejemplo de uso
updateUsuarioProfile({
  id: 2,
  nombre: "Pedro",
  apellido: "Argañaraz",
  idioma: 2,
  apodo: "Pedrito",
});
