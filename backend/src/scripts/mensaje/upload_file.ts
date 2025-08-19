import fs from "fs";
import path from "path";

import { supabaseAdmin } from "../../lib/supabase";

export async function uploadFile(
  bucketName: string,
  idChat: number,
  filePath: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const storagePath = `${idChat}/${Date.now()}_${fileName}`;

  const { data, error } = await supabaseAdmin.storage
  .from(bucketName)
  .upload(storagePath, fileBuffer, {
    cacheControl: "3600",
    upsert: false,
    contentType: "application/octet-stream",
  });

  if (error) throw error;

  console.log("✅ Archivo subido correctamente:", data);
  return storagePath; // ruta dentro del bucket
}
