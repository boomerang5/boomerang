import supabase from "../../lib/supabase";

export async function getContactsFavoritesService(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_contacts_favorites", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; 
}