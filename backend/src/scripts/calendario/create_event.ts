import supabase from "../../lib/supabase";

async function createEvent(
  idCreador: number,
  titulo: string,
  fecha: Date,
  descripcion?: string,
  color?: string,
  invitados?: number[]
) {
  const { data, error } = await supabase.rpc("create_event", {
    p_creado_por: idCreador,
    p_titulo: titulo,
    p_descripcion: descripcion ?? null,
    p_color: color ?? null,
    p_fecha: fecha.toISOString(),
    p_invitados: invitados ?? null,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  console.log("✅ Evento creado correctamente. Resultado:", data);
}

// Prueba
const idCreador = 2;
const titulo = "Presentación del proyecto";
const fecha = new Date("2025-10-01T20:30:00Z");
const descripcion = "Reunión para presentar el proyecto final";
const color = "#ff0000";
const invitados = [1, 3];

createEvent(idCreador, titulo, fecha, descripcion, color, invitados);
