import supabase from "../../lib/supabase";

export async function updateContactFavoriteService(idContactoUsuario: number, favorito: boolean) {
  const { data, error } = await supabase.rpc("update_contact_favorite", {
    p_id_contacto_usuario: idContactoUsuario,
    p_favorito: favorito,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; 
}