import supabase from "../../lib/supabase";

export async function getCallInfoService(idUsuario: number, idLlamada: number) {
  const { data, error } = await supabase.rpc("get_call_info", {
    p_id_usuario: idUsuario,
    p_id_llamada: idLlamada,
  });

  if (error) {
    console.error("❌ Error al ejecutar get_call_info:", error);
    throw new Error(error.message);
  }

  return data; 
}
