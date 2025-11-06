import supabase from "../../lib/supabase";

export async function getUserChatsService(idUsuario: number) {
  // Obtener todos los chats donde el usuario ha enviado mensajes
  const { data: mensajes, error: errorMensajes } = await supabase
    .from('Mensaje')
    .select('id_chat')
    .or(`id_emisor.eq.${idUsuario}`)
    .order('fecha', { ascending: false });

  if (errorMensajes) {
    throw new Error(errorMensajes.message);
  }

  if (!mensajes || mensajes.length === 0) {
    return [];
  }

  // Obtener IDs únicos de chats
  const chatIds = [...new Set(mensajes.map(m => m.id_chat))];

  // Obtener información de cada chat
  const { data: chats, error: errorChats } = await supabase
    .from('Chat')
    .select(`
      id,
      id_tipo_chat,
      id_grupo,
      nombre,
      fecha_creacion,
      Grupo:Grupo(id, nombre)
    `)
    .in('id', chatIds);

  if (errorChats) {
    throw new Error(errorChats.message);
  }

  if (!chats) {
    return [];
  }

  // Enriquecer cada chat con información adicional
  const enrichedChats = await Promise.all(
    chats.map(async (chat) => {
      // Obtener último mensaje
      const { data: ultimoMensaje } = await supabase
        .from('Mensaje')
        .select('texto, fecha, id_emisor')
        .eq('id_chat', chat.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

      // Para chats privados, obtener el nombre del otro usuario
      let nombreChat = chat.nombre;
      let idContacto = null;
      let nombreContacto = null;
      let apellidoContacto = null;

      if (chat.id_tipo_chat === 1) {
        // Chat privado - buscar el otro participante
        const { data: mensajesOtro } = await supabase
          .from('Mensaje')
          .select('id_emisor')
          .eq('id_chat', chat.id)
          .neq('id_emisor', idUsuario)
          .limit(1);

        if (mensajesOtro && mensajesOtro.length > 0) {
          const otroUsuarioId = mensajesOtro[0].id_emisor;
          
          // Obtener datos del otro usuario
          const { data: otroUsuario } = await supabase
            .from('Usuario')
            .select('id, nombre, apellido')
            .eq('id', otroUsuarioId)
            .single();

          if (otroUsuario) {
            idContacto = otroUsuario.id;
            nombreContacto = otroUsuario.nombre;
            apellidoContacto = otroUsuario.apellido;
            nombreChat = `${otroUsuario.nombre} ${otroUsuario.apellido}`;
          }
        }
      } else if (chat.id_tipo_chat === 2 && chat.Grupo) {
        // Chat grupal
        const grupo: any = chat.Grupo;
        nombreChat = Array.isArray(grupo) ? grupo[0]?.nombre : grupo?.nombre;
      }

      // Contar mensajes no leídos
      const { count: noLeidos } = await supabase
        .from('Mensaje')
        .select('*', { count: 'exact', head: true })
        .eq('id_chat', chat.id)
        .neq('id_emisor', idUsuario)
        .eq('eliminado', false);

      return {
        id_chat: chat.id,
        tipo_chat: chat.id_tipo_chat === 1 ? 'privado' : 'grupal',
        nombre_chat: nombreChat,
        id_contacto: idContacto,
        nombre_contacto: nombreContacto,
        apellido_contacto: apellidoContacto,
        id_grupo: chat.id_grupo,
        ultimo_mensaje: ultimoMensaje?.texto || null,
        fecha_ultimo_mensaje: ultimoMensaje?.fecha || null,
        no_leidos: noLeidos || 0,
        activo: true,
        fecha_creacion: chat.fecha_creacion
      };
    })
  );

  // Ordenar por fecha del último mensaje
  return enrichedChats.sort((a, b) => {
    const fechaA = a.fecha_ultimo_mensaje || a.fecha_creacion;
    const fechaB = b.fecha_ultimo_mensaje || b.fecha_creacion;
    return new Date(fechaB).getTime() - new Date(fechaA).getTime();
  });
}