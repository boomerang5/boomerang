import supabase from "../../lib/supabase";

export async function getUserEventsService(
  idUsuario: number,
  fechaDesde?: Date,
  fechaHasta?: Date
) {
  const { data, error } = await supabase.rpc("get_user_events", {
    p_id_usuario: idUsuario,
    p_fecha_desde: fechaDesde ? fechaDesde.toISOString() : null,
    p_fecha_hasta: fechaHasta ? fechaHasta.toISOString() : null,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }

  return data;
}

