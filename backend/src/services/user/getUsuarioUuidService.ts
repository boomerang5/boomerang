import supabase from "../../lib/supabase";

export async function getUsuarioUuid(uuidUsuario: string) {
  const { data, error } = await supabase.rpc("get_usuario_uuid", {
    p_user_id: uuidUsuario
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; 
}