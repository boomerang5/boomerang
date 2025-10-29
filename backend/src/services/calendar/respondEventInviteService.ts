import supabase from "../../lib/supabase";


export async function respondEventInviteService(
  idEvento: number,
  idUsuario: number,
  confirmado: boolean
) {
  const { data, error } = await supabase.rpc("respond_event_invite", {
    p_id_evento: idEvento,
    p_id_usuario: idUsuario,
    p_confirmado: confirmado
  });

  if (error) {
    throw new Error(error.message);
  }

}
