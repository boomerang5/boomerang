import supabase from "../../lib/supabase";

export async function getStateUser(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_state_user", {
    p_id_usuario: idUsuario
  });

  if (error) {
    throw new Error(error.message);
  }

  return data; 
}