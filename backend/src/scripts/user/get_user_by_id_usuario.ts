// scripts/tests/get_user_by_id_usuario.ts
import supabase from "../../lib/supabase";

async function getUserByIdUsuario(p_id_usuario: number) {
  console.log("🧪 RPC get_user_by_id_usuario >", { p_id_usuario });

  const { data, error } = await supabase.rpc("get_user_by_id_usuario", {
    p_id_usuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.log("⚠️  No se encontró el usuario.");
    return;
  }

  // La RPC RETURNS TABLE ⇒ Supabase devuelve un array de filas
  const row = Array.isArray(data) ? data[0] : data;

  console.log("✅ Resultado:", data);
}

// Prueba
const idUsuario = 2;
getUserByIdUsuario(idUsuario);
