import supabase from "../../lib/supabase";


async function respondEventInvite(
  idEvento: number,
  idUsuario: number,
  confirmado: boolean
) {
  const { data, error } = await supabase.rpc("respond_event_invite", {
    p_id_evento: idEvento,
    p_id_usuario: idUsuario,
    p_confirmado: confirmado
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Respuesta registrada correctamente. Resultado:", data);
  return data;
}

// Ejemplo de uso
const idEvento = 7;
const idUsuario = 1;
const confirmado = true;

respondEventInvite(idEvento, idUsuario, confirmado);
