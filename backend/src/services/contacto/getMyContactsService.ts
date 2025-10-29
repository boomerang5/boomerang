import supabase from "../../lib/supabase";

export async function getMyContactsService(idUsuario: number, busquedaOpcional?: string) {
  const { data, error } = await supabase.rpc("get_my_contacts", {
    p_id_usuario: idUsuario,
    p_busqueda: busquedaOpcional?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data; 
}
