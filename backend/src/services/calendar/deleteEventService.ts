import supabase from "../../lib/supabase";

export async function deleteEventService(idEvento: number, idEditor: number) {
  const { data, error } = await supabase.rpc("delete_event", {
    p_id_evento: idEvento,
    p_editor: idEditor,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }

  console.log("✅ Evento eliminado correctamente. Resultado:", data);
}