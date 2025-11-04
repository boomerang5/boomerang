import supabase from "../../lib/supabase";

export async function deleteContactService(idUsuario: number, idUsuarioContacto: number) {
  const { data, error } = await supabase.rpc("delete_contact", {
    p_id_usuario: idUsuario,
    p_id_usuario_contacto: idUsuarioContacto,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data; 
}