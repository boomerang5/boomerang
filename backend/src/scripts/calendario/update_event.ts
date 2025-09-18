import supabase from "../../lib/supabase";

async function updateEvent(
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
    process.exit(1);
  }

  console.log("✅ Evento actualizado correctamente. Resultado:", data);
}

// ejemplo de uso
const idEvento = 3;
const editor = 2;
const titulo = "Clase virtual";
const descripcion = "Actualización con cambios";
const color = "#ff5733";
const fecha = new Date("2025-07-01T12:00:00Z");

updateEvent(idEvento, editor, titulo, fecha, descripcion, color);
