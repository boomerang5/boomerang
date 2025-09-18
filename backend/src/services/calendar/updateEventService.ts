import supabase from "../../lib/supabase";

export async function updateEventService(
  idEvento: number,
  editor: number,
  titulo?: string,
  fecha?: Date,
  descripcion?: string,
  color?: string
) {
  const { data, error } = await supabase.rpc("update_event", {
    p_id_evento: idEvento,
    p_editor: editor,
    p_titulo: titulo ?? null,
    p_descripcion: descripcion ?? null,
    p_color: color ?? null,
    p_fecha: fecha ? fecha.toISOString() : null,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }

  console.log("✅ Evento actualizado correctamente.");
};
