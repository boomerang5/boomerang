import supabase from "../../lib/supabase";

interface CreateChatParams {
  idUsuario: number;
  idContacto?: number | null;
  nombreGrupo?: string | null;
  idGrupo?: number | null;
}

export async function createChatService({ idUsuario, idContacto, nombreGrupo, idGrupo}: CreateChatParams): Promise<number | null> {
  const { data, error } = await supabase.rpc("create_chat", { 
    p_id_emisor: idUsuario,
    p_id_contacto: idContacto,
    p_nombre: nombreGrupo,
    p_id_grupo: idGrupo,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    process.exit(1);
  }

  if (!data) {
    console.log("ℹ️ No se logró crear el chat.");
    return null;
  }

  console.log("✅ Chat creado correctamente. ID:", data);
  return data as number;
}