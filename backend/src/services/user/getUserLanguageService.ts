import supabase from "../../lib/supabase";

export async function getUserLanguageService(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_language", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    throw new Error(error.message); 
  }

  return data;
}

