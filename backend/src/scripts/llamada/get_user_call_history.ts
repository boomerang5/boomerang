// backend/src/scripts/historial/getUserCallHistory.ts
import supabase from "../../lib/supabase";

async function getUserCallHistory(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_call_history", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Historial de llamadas encontrado. Resultado:", data);
}

// Prueba local con un usuario real (ejemplo: 2)
const idUsuario = 1

getUserCallHistory(idUsuario);
