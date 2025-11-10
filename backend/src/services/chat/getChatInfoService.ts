import supabase from "../../lib/supabase";

export async function getChatInfoService(idChat: number, idUsuario?: number) {
  // Intentar usar la función get_chat_info que debería incluir participantes
  let { data, error } = await supabase.rpc("get_chat_info", {
    p_id_chat: idChat,
    p_user_id: idUsuario || null,
  });

  if (error) {
    // Si la función no existe, crear respuesta básica desde tablas directamente
    console.log('⚠️ get_chat_info no encontrada, usando consulta directa');
    
    const { data: chatData, error: chatError } = await supabase
      .from("Chat")
      .select(`
        id,
        nombre,
        id_tipo_chat,
        fecha_creacion,
        id_grupo,
        Grupo (
          id,
          nombre,
          descripcion
        )
      `)
      .eq("id", idChat)
      .single();

    if (chatError) {
      throw chatError;
    }

    // Obtener participantes por separado
    const { data: participantesData, error: participantesError } = await supabase
      .from("ChatParticipante")
      .select(`
        Usuario (
          id,
          nombre,
          apellido,
          mail
        )
      `)
      .eq("id_chat", idChat)
      .eq("eliminado", false);

    if (participantesError) {
      throw participantesError;
    }

    // Obtener último mensaje
    const { data: mensajeData } = await supabase
      .from("Mensaje")
      .select("texto, fecha")
      .eq("id_chat", idChat)
      .eq("eliminado", false)
      .order("fecha", { ascending: false })
      .limit(1)
      .single();

    // Construir respuesta manual
    const participantes = participantesData?.map(p => ({
      id_usuario: (p.Usuario as any)?.id,
      nombre: (p.Usuario as any)?.nombre,
      apellido: (p.Usuario as any)?.apellido,
      email: (p.Usuario as any)?.mail,
      id_usuario_contacto: (p.Usuario as any)?.id
    })) || [];

    const grupoData = (chatData.Grupo as any);
    
    const chatInfo = {
      id_chat: chatData.id,
      nombre: chatData.id_tipo_chat === 2 && grupoData?.nombre 
        ? grupoData.nombre 
        : chatData.nombre,
      descripcion: null,
      tipo_chat: chatData.id_tipo_chat,
      fecha_creacion: chatData.fecha_creacion,
      ultimo_mensaje: mensajeData?.texto || null,
      fecha_ultimo_mensaje: mensajeData?.fecha || null,
      id_grupo: chatData.id_grupo || grupoData?.id || null,
      nombre_grupo: grupoData?.nombre || null,
      descripcion_grupo: grupoData?.descripcion || null,
      participantes: participantes
    };

    return [chatInfo];
  }
  
  if (Array.isArray(data)) return data;        
  if (data == null) return [];                
  return [data]; 
}

