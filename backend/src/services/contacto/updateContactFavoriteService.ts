import supabase from "../../lib/supabase";

export async function updateContactFavoriteService(id_usuario: number, idContactoUsuario: number, favorito: boolean) {
  const { data, error } = await supabase.rpc("update_contact_favorite", {
    p_id_usuario: id_usuario,
    p_id_usuario_contacto: idContactoUsuario,
    p_favorito: favorito,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data; 
}