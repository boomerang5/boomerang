import supabase from '../../lib/supabase';
import { deleteFileByIdService } from './deleteFileService';

type Params = { idMensaje: number; idEmisor: number };
type Result = { deleted_message: boolean; deleted_file: boolean };

export async function deleteMessageService({ idMensaje, idEmisor }: Params): Promise<Result> {
  // 1) Obtener el mensaje (para saber si tiene archivo y validar emisor)
  const { data: mensaje, error: fetchError } = await supabase
    .from('Mensaje')
    .select('id_archivo, id_emisor')
    .eq('id', idMensaje)
    .single();

  if (fetchError) {
    // si no existe el mensaje
    if (fetchError.code === 'PGRST116') return { deleted_message: false, deleted_file: false };
    throw fetchError;
  }

  if (!mensaje || Number(mensaje.id_emisor) !== idEmisor) {
    return { deleted_message: false, deleted_file: false };
  }

  // 2) Eliminar (RPC soft-delete o hard-delete según tu lógica)
  const { data: delData, error: delError } = await supabase.rpc('delete_message', {
    p_id_emisor: idEmisor,
    p_id_mensaje: idMensaje,
  });
  if (delError) throw delError;

  // opcionalmente, delData podría traer filas afectadas. Aquí asumimos que si no tiró error, eliminó.
  let deleted_file = false;

  // 3) Si tenía archivo: desvincular (si querés) y borrar archivo (storage + registro)
  if (mensaje.id_archivo) {
    // si querés desasociar primero (no siempre hace falta en soft-delete):
    // await supabase.from('Mensaje').update({ id_archivo: null }).eq('id', idMensaje);

    await deleteFileByIdService(Number(mensaje.id_archivo));
    deleted_file = true;
  }

  return { deleted_message: true, deleted_file };
}
