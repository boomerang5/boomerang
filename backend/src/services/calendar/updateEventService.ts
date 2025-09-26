import supabase from "../../lib/supabase";
import { NotificationService } from "../notifications/notificationService";

export async function updateEventService(
  idEvento: number,
  editor: number,
  titulo?: string,
  fecha?: Date,
  descripcion?: string,
  color?: string
) {
  // Obtener información actual del evento
  const { data: eventoActual, error: errorEvento } = await supabase
    .from('EventoCalendario')
    .select('fecha, titulo, creado_por')
    .eq('id', idEvento)
    .single();

  if (errorEvento) {
    throw new Error(errorEvento.message);
  }

  // Verificar si la fecha cambió (más de 1 minuto de diferencia)
  let fechaCambio = false;
  if (fecha) {
    const fechaActualTime = new Date(eventoActual.fecha).getTime();
    const fechaNuevaTime = fecha.getTime();
    const diferenciaMinutos = Math.abs(fechaNuevaTime - fechaActualTime) / (1000 * 60);
    fechaCambio = diferenciaMinutos > 1;
  }

  // Actualizar el evento
  const { data, error } = await supabase.rpc("update_event", {
    p_id_evento: idEvento,
    p_editor: editor,
    p_titulo: titulo ?? null,
    p_descripcion: descripcion ?? null,
    p_color: color ?? null,
    p_fecha: fecha ? fecha.toISOString() : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Solo si cambió la fecha: resetear confirmaciones y notificar
  if (fechaCambio) {
    console.log('📅 Cambio de fecha detectado - reseteando confirmaciones y enviando notificaciones');

    // 1. Resetear confirmaciones (excepto creador)
    await supabase
      .from('EventoInvitado')
      .update({ confirmado: null })
      .eq('id_evento', idEvento)
      .neq('id_usuario', eventoActual.creado_por);

    // 2. Obtener invitados para notificar
    const { data: invitados } = await supabase
      .from('EventoInvitado')
      .select('id_usuario')
      .eq('id_evento', idEvento)
      .neq('id_usuario', eventoActual.creado_por);

    // 3. Obtener información completa del evento actualizado
    const { data: eventoCompleto } = await supabase
      .from('EventoCalendario')
      .select('titulo, fecha, descripcion')
      .eq('id', idEvento)
      .single();

    // 4. Obtener nombre del editor
    const { data: editorData } = await supabase
      .from('Usuario')
      .select('nombre, apellido, apodo')
      .eq('id', editor)
      .single();

    const editorNombre = editorData 
      ? `${editorData.nombre || ''} ${editorData.apellido || ''}`.trim() || editorData.apodo || `Usuario ${editor}`
      : `Usuario ${editor}`;

    // 5. Enviar notificaciones usando la fecha NUEVA (parámetro) no la vieja de la DB
    if (invitados && invitados.length > 0 && eventoCompleto) {
      // Usar la fecha nueva (parámetro) si está disponible, sino la de la DB
      const fechaParaNotificacion = fecha || new Date(eventoCompleto.fecha);
      
      const fechaObj = fechaParaNotificacion;
      const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Argentina/Buenos_Aires'
      });
      
      const horaFormateada = fechaObj.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires'
      });

      console.log('🔔 Datos para notificaciones:', {
        fechaParametro: fecha,
        fechaDB: eventoCompleto.fecha,
        fechaParaNotificacion: fechaParaNotificacion.toISOString(),
        fechaFormateada,
        horaFormateada,
        cantidadInvitados: invitados.length
      });

      for (const invitado of invitados) {
        try {
          console.log(`🔄 Enviando notificaciones a usuario ${invitado.id_usuario}...`);
          
          // 1. Notificación de sistema
          console.log('📢 ANTES de crear notificación SYSTEM');
          const systemResult = await NotificationService.createNotification({
            id_usuario: invitado.id_usuario,
            tipo: 'system',
            mensaje: `🔄 El evento "${eventoCompleto.titulo}" fue modificado\n\nEl día ${fechaFormateada} a las ${horaFormateada}\n\n⚠️ Tu confirmación volvió al estado pendiente`,
            meta: {
              id_evento: idEvento,
              tipo_cambio: 'modificacion',
              titulo_evento: eventoCompleto.titulo,
              fecha: fechaParaNotificacion.toISOString(),
              organizador: editorNombre
            }
          });
          console.log('✅ DESPUES de crear notificación SYSTEM:', systemResult);

          // 2. Nueva invitación (igual que cuando se crea el evento)
          console.log('📢 ANTES de crear notificación MEETING_INVITE');
          console.log('📊 Parámetros para createEventInviteNotification:', {
            id_usuario: invitado.id_usuario,
            nombreEvento: eventoCompleto.titulo,
            organizador: editorNombre,
            id_evento: idEvento,
            fechaEvento: fechaParaNotificacion.toISOString(),
            descripcion: eventoCompleto.descripcion
          });
          
          const inviteResult = await NotificationService.createEventInviteNotification(
            invitado.id_usuario,
            eventoCompleto.titulo,
            editorNombre,
            idEvento,
            fechaParaNotificacion.toISOString(),
            eventoCompleto.descripcion
          );
          console.log('✅ DESPUES de crear notificación MEETING_INVITE:', inviteResult);
        } catch (error) {
          console.error(`❌ ERROR COMPLETO enviando notificaciones a usuario ${invitado.id_usuario}:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            fullError: error
          });
        }
      }
      console.log('✅ Nuevas invitaciones enviadas');
    }
  }

  console.log("✅ Evento actualizado correctamente");
}