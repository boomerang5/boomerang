import supabase from "../../lib/supabase";

export async function deleteEventService(idEvento: number, idEditor: number) {
  const { data, error } = await supabase.rpc("delete_event", {
    p_id_evento: idEvento,
    p_editor: idEditor,
  });

  if (error) {
    throw error instanceof Error ? error : new Error((error as any)?.message ?? String(error));
  }

}