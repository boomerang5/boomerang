import fs from "fs";
import path from "path";
import { supabaseAdmin } from "../../lib/supabase";

/**
 * Descarga un archivo del bucket y lo guarda localmente.
 * @param bucketName Nombre del bucket (ej. 'mensajes')
 * @param storagePath Ruta del archivo dentro del bucket (ej. '4/172243098_calendario.pdf')
 * @param outputDir Carpeta local donde se guardará el archivo descargado
 */
export async function downloadFile(
  bucketName: string,
  storagePath: string,
  outputDir: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .download(storagePath);

    if (error) throw error;

    const fileName = path.basename(storagePath);
    const localFilePath = path.join(outputDir, fileName);

    // Guardar archivo localmente
    const fileBuffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localFilePath, fileBuffer);

    console.log(`✅ Archivo descargado correctamente: ${localFilePath}`);
    return localFilePath;
  } catch (err) {
    console.error("❌ Error al descargar el archivo:", err);
    return null;
  }
}

// Ejemplo de uso
const bucketName = "mensajes";
const storagePath = "4/1754003956329_calendario.pdf"; // Ruta obtenida al subir
const outputDir = path.join(__dirname, "descargas");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

downloadFile(bucketName, storagePath, outputDir);
