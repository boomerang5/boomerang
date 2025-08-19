import { supabaseAdmin } from '../../lib/supabase';

type UploadParams = {
  bucket: string;         // 'mensajes'
  folderPrefix: string;   // String(idChat)
  file: Express.Multer.File;
};

function sanitize(name: string) {
  return name.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').toLowerCase();
}

// (Opcional) limitar tipos de archivo aceptados
const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  // agregá lo que necesites
];

export async function uploadFileService({ bucket, folderPrefix, file }: UploadParams) {
  // opcional: validar mimetype
  // if (!ALLOWED_MIMES.includes(file.mimetype)) {
  //   throw new Error(`Tipo de archivo no permitido: ${file.mimetype}`);
  // }

  const path = `${folderPrefix}/${Date.now()}_${sanitize(file.originalname || 'archivo')}`;
  const { data, error } = await supabaseAdmin
    .storage.from(bucket)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) throw error;
  return data.path; // p.ej. "4/172..._calendario.pdf"
}

export async function deleteFileFromStorage(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw error;
}
