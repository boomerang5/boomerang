import { supabaseAdmin } from '../../lib/supabase';

export async function deleteFileByIdService(idArchivo: number): Promise<void> {
  // 1) Buscar path del archivo
  const { data: archivo, error: fetchError } = await supabaseAdmin
    .from('Archivo')
    .select('path_archivo')
    .eq('id', idArchivo)
    .single();

  if (fetchError || !archivo) {
    // si ya no existe el registro, nada que hacer
    console.warn('⚠️ Archivo no encontrado en tabla Archivo:', fetchError?.message);
    return;
  }

  const filePath = archivo.path_archivo as string;

  // 2) Eliminar del storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('mensajes')
    .remove([filePath]);
  if (storageError) {
    // logueo y sigo: intentamos al menos borrar el registro
    console.error('❌ Error al eliminar del storage:', storageError);
  }

  // 3) Eliminar registro del archivo (RPC o delete directo; uso tu RPC)
  const { error: deleteError } = await supabaseAdmin.rpc('delete_file', {
    p_id_archivo: idArchivo,
  });
  if (deleteError) {
    console.error('❌ Error al eliminar registro del archivo:', deleteError);
    // opcional: rethrow si querés marcar error duro
  }
}
