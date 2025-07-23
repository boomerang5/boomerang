import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  mail: string;
  fecha_registro: string;
  apodo: string;
  id_idioma: number;
  nombre_idioma: string;
}

async function getUserByIdUsuario(p_id_usuario: number) {
  console.log("🧪 Ejecutando RPC `get_user_by_id_usuario` con parámetro:", p_id_usuario);

  const { data, error } = await supabase.rpc("get_user_by_id_usuario", {
    p_id_usuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  const usuario = data as Usuario[];

  if (!usuario || usuario.length === 0) {
    console.log("ℹ️ No se encontró ningún usuario con ese id.");
  } else {
    console.log("✅ Usuario encontrado:");
    console.log("✅ Consulta realizada con éxito. Resultado:", data)
    console.table(usuario);
  }
}

// Prueba
const idUsuario = 1; // 👈 Cambia este valor por el id_usuario real que quieras consultar

getUserByIdUsuario(idUsuario);
