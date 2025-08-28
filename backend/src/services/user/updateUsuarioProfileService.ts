import supabase from "../../lib/supabase";

export async function updateUsuarioProfileService(idUsuario: number, nombre: string, apellido: string, idioma: number, apodo: string) {
  const { data, error } = await supabase.rpc("update_usuario_profile", {
    p_id: idUsuario,
    p_nombre: nombre,
    p_apellido: apellido,
    p_idioma:idioma,
    p_apodo: apodo
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; 
}