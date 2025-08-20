import supabase from "../../lib/supabase";

export async function getAllContactsService(idUsuario: number, busquedaOpcional?: string) {
  const { data, error } = await supabase.rpc("get_all_contacts", {
    p_id_usuario: idUsuario,
    p_busqueda: busquedaOpcional?? null,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; 
}