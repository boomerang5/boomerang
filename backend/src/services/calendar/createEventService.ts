import supabase from "../../lib/supabase";

export async function createEventService(
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
    throw new Error(error.message);
  }
  return data;
}

