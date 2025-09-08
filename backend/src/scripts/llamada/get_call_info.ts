// backend/src/scripts/llamada/get_call_info.ts
import supabase from "../../lib/supabase";

async function getCallInfo(idUsuario: number, idLlamada: number) {
  const { data, error } = await supabase.rpc("get_call_info", {
    p_id_usuario: idUsuario,
    p_id_llamada: idLlamada,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("ℹ️ No se encontraron datos para la llamada.");
    process.exit(0);
  }

  console.log("✅ Info de la llamada:");
  console.dir(data, { depth: null });
}

// 🔹 Prueba local (ajustá con IDs válidos de tu DB)
const idUsuario = 2;
const idLlamada = 56;

getCallInfo(idUsuario, idLlamada);
