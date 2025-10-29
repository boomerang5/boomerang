import supabase from "../../lib/supabase";

export async function updateUserProfilePhoto(idUsuario: number, idArchivo: number) {
  const { data, error } = await supabase.rpc("update_user_profile_photo", {
    p_id_usuario: idUsuario,
    p_id_archivo: idArchivo
  });

  if (error) {
    throw new Error(error.message);
  }

  return data; 
}