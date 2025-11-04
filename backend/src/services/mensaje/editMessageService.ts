import supabase from "../../lib/supabase";

export async function editMessageService(idEmisor: number, idMensaje: number, nuevoTexto: string): Promise<void> {
  const { error } = await supabase.rpc("edit_message", {
    p_id_emisor: idEmisor,
    p_id_mensaje: idMensaje,
    p_nuevo_texto: nuevoTexto
  });

  if (error) {
    process.exit(1);
  }
}