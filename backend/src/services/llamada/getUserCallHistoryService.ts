// src/services/llamada/getUserCallHistoryService.ts
import supabase from "../../lib/supabase";

export async function getUserCallHistoryService(idUsuario: number) {
  // Primero obtenemos los IDs de llamadas donde el usuario participa
  const { data: misLlamadas, error: misLlamadasError } = await supabase
    .from('participantes_llamada')
    .select('id_llamada')
    .eq('id_usuario', idUsuario);

  if (misLlamadasError) {
    console.error("❌ Error al obtener mis llamadas:", misLlamadasError);
    throw new Error(misLlamadasError.message);
  }

  if (!misLlamadas || misLlamadas.length === 0) {
    return [];
  }

  const idsLlamadas = misLlamadas.map(l => l.id_llamada);

  // Ahora obtenemos los detalles de esas llamadas
  const { data: llamadas, error: llamadasError } = await supabase
    .from("llamadas")
    .select(`
      id_llamada,
      tipo,
      estado,
      fecha_inicio,
      fecha_fin,
      duracion_segundos,
      titulo,
      descripcion,
      id_grupo,
      tiene_grabacion,
      id_archivo_grabacion,
      tiene_transcripcion,
      id_chat,
      resumen
    `)
    .in('id_llamada', idsLlamadas)
    .order('fecha_inicio', { ascending: false });

  if (llamadasError) {
    console.error("❌ Error al obtener llamadas:", llamadasError);
    throw new Error(llamadasError.message);
  }

  if (!llamadas || llamadas.length === 0) {
    return [];
  }

  // Para cada llamada, obtenemos los participantes
  const llamadasConParticipantes = await Promise.all(
    llamadas.map(async (llamada) => {
      // Obtener participantes
      const { data: participantes, error: participantesError } = await supabase
        .from("participantes_llamada")
        .select(`
          id_usuario,
          es_host
        `)
        .eq('id_llamada', llamada.id_llamada);

      if (participantesError) {
        console.error(`❌ Error al obtener participantes de llamada ${llamada.id_llamada}:`, participantesError);
      }

      // Obtener información de usuarios
      const idsUsuarios = participantes?.map(p => p.id_usuario) || [];
      const { data: usuarios } = await supabase
        .from('usuario')
        .select('id_usuario, nombre, apellido, apodo')
        .in('id_usuario', idsUsuarios);

      // Formatear participantes con información del usuario
      const participantesFormateados = participantes?.map(p => {
        const usuario = usuarios?.find(u => u.id_usuario === p.id_usuario);
        return {
          id_usuario: p.id_usuario,
          nombre: usuario?.nombre || '',
          apellido: usuario?.apellido || '',
          apodo: usuario?.apodo || null,
          es_iniciador: p.es_host
        };
      }) || [];

      // Encontrar el otro usuario (para llamadas 1-a-1)
      let otroUsuarioNombre = null;
      let esHost = false;

      if (!llamada.id_grupo && participantes && participantes.length > 0) {
        const otroParticipante = participantes.find(p => p.id_usuario !== idUsuario);
        if (otroParticipante) {
          const otroUsuario = usuarios?.find(u => u.id_usuario === otroParticipante.id_usuario);
          if (otroUsuario) {
            otroUsuarioNombre = `${otroUsuario.nombre} ${otroUsuario.apellido}`;
          }
        }

        const miParticipacion = participantes.find(p => p.id_usuario === idUsuario);
        esHost = miParticipacion?.es_host || false;
      }

      return {
        ...llamada,
        otro_usuario_nombre: otroUsuarioNombre,
        participantes: participantesFormateados,
        es_host: esHost
      };
    })
  );

  return llamadasConParticipantes;
}
