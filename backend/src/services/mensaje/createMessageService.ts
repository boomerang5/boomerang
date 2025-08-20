import supabase from '../../lib/supabase';
import { uploadFileService, deleteFileFromStorage } from './uploadFileService';

type Params = {
  idChat: number;
  idEmisor: number;
  texto: string | null;           // texto puede ser null si solo archivo
  idTipo: number | null;          // siempre presente, pero null cuando NO hay archivo
  file?: Express.Multer.File;
};

export async function createMessageService({
  idChat,
  idEmisor,
  texto,
  idTipo,
  file
}: Params) {
  let archivoId: number | null = null;
  let storagePath: string | null = null;

  try {
    // 1) Si viene archivo: validar y subir
    if (file) {
      if (idTipo == null) throw new Error('id_tipo requerido para archivo.');

      storagePath = await uploadFileService({
        bucket: 'mensajes',
        folderPrefix: String(idChat),
        file,
      });

      const { data: archivoData, error: archivoError } = await supabase.rpc('create_file', {
        p_path_archivo: storagePath,
        p_id_usuario: idEmisor,
        p_id_tipo_archivo: idTipo,
        p_es_mensaje: true,
      });
      if (archivoError) throw archivoError;
      if (archivoData == null || isNaN(Number(archivoData))) {
        throw new Error('create_file no devolvió un ID válido.');
      }
      archivoId = Number(archivoData);
    }

    // 2) Crear el mensaje
    const { data, error } = await supabase.rpc('create_message', {
      p_id_chat: idChat,
      p_id_emisor: idEmisor,
      p_texto: texto,          // string | null
      p_id_archivo: archivoId, // null si no hay archivo
    });
    if (error) throw error;
    if (data == null || isNaN(Number(data))) {
      throw new Error('create_message no devolvió un ID válido.');
    }

    return Number(data);
  } catch (err) {
    // Cleanup si el mensaje falló pero ya subimos archivo / creamos registro
    try {
      if (archivoId != null) {
        await supabase.rpc('delete_file', { p_id_archivo: archivoId }); // si tenés esta RPC
      }
      if (storagePath) {
        await deleteFileFromStorage('mensajes', storagePath);
      }
    } catch (cleanupErr) {
      // loguear pero no pisar el error principal
      console.error('⚠️ Cleanup falló:', cleanupErr);
    }
    throw err;
  }
}
