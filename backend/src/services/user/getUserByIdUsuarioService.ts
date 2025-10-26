import supabase from "../../lib/supabase";

export async function getUserByIdUsuario(idUsuario: number) {
  const { data, error } = await supabase.rpc("get_user_by_id_usuario", {
    p_id_usuario: idUsuario,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; // array de filas (RETURNS TABLE)
}
