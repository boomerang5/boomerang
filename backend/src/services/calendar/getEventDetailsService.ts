import supabase from "../../lib/supabase";

export async function getEventDetailsService(idEvento: number, idUsuario: number) {
  const { data, error } = await supabase.rpc("get_event_details", {
    p_id_evento: idEvento,
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }

  return data;
}
