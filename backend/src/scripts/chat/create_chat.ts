import supabase from "../../lib/supabase";

interface CreateChatParams {
  idUsuario: number;
  idContacto?: number | null;
  nombreGrupo?: string | null;
  idGrupo?: number | null;
}

async function createChat({
  idUsuario,
  idContacto,
  nombreGrupo,
  idGrupo,
}: CreateChatParams): Promise<number | null> {
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

//Si quieres crear un chat privado, no pases nombreGrupo ni idGrupo
//Si quieres un chat grupal, no pases idContacto

// Ejemplo: Chat grupal
createChat({
  idUsuario: 1,
  nombreGrupo: "Trabajo",
  idGrupo: 5
});

// Ejemplo: Chat grupal
// createChat({
//   idUsuario: 1,
//   nombreGrupo: "Equipo Boomerang",
//   idGrupo: 10,
// });


