import supabase from "../../lib/supabase";

async function getUserEvents(
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
    process.exit(1);
  }

  console.log("📅 Eventos obtenidos:", data);
  return data;
}

// Ejemplo de uso
const idUsuario = 2;

//Filtros de fecha (opcional - agregar en la función)
const fechaDesde = new Date("2024-07-01T00:00:00Z");
const fechaHasta = new Date("2024-11-01T00:00:00Z");

getUserEvents(idUsuario);
