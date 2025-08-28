import supabase from "../../lib/supabase";

export async function addContactService(idUsuario: number, idUsuarioContacto: number) {
  const { data, error } = await supabase.rpc("add_contact", {
    p_id_usuario: idUsuario,
    p_id_usuario_contacto: idUsuarioContacto,
  });

  if (error) {
    console.error("❌ Supabase error:", error);
    throw new Error(error.message);
  }

  return data; // Podría ser null o ID del contacto
}
