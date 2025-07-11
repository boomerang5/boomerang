import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addContact(p_id_usuario: number, p_id_usuario_contacto: number) {
  console.log(`🧪 Ejecutando RPC add_contact con parámetros: { p_id_usuario: ${p_id_usuario}, p_id_usuario_contacto: ${p_id_usuario_contacto} }`);

  const { data, error } = await supabase.rpc("add_contact", {
    p_id_usuario,
    p_id_usuario_contacto,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error.message);
    process.exit(1);
  }

  console.log("✅ Contacto agregado correctamente. Resultado:", data); //Si da null se ejecutpo correctamente
}

// ejemplo de uso:
const usuarioId = 1;
const contactoId = 7;

addContact(usuarioId, contactoId);
