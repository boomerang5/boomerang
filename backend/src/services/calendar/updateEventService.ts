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

      for (const invitado of invitados) {
        try {
          // 1. Notificación de cambio (tipo system) - SIN botones
          const notificationSystem = await NotificationService.createNotification({
            id_usuario: invitado.id_usuario,
            tipo: 'system',
            mensaje: `🔄 El evento "${eventoCompleto.titulo}" fue modificado\n\nEl día ${fechaFormateada} a las ${horaFormateada}\n\n⚠️ Tu confirmación volvió al estado pendiente`,
            meta: {
              id_evento: idEvento,
              tipo_cambio: 'modificacion',
              titulo_evento: eventoCompleto.titulo,
              fecha: fechaParaNotificacion.toISOString(), // Usar la fecha nueva
              organizador: editorNombre
            }
          });

          const metaData = {
            id_evento: idEvento,
            titulo_evento: eventoCompleto.titulo,
            fecha: fechaParaNotificacion.toISOString(), // Usar la fecha nueva, no la vieja de la DB
            organizador: editorNombre
          };

          

          // 2. Nueva invitación (tipo meeting_invite) - CON botones para confirmar
          const mensajeInvitacion = `El día ${fechaFormateada} a las ${horaFormateada}` +
                                    (eventoCompleto.descripcion ? `\n📝 ${eventoCompleto.descripcion}` : '');

          const notificationInvite = await NotificationService.createNotification({
            id_usuario: invitado.id_usuario,
            tipo: 'meeting_invite',
            mensaje: mensajeInvitacion,
            meta: metaData
          });
          
        } catch (error) {
          console.error(`Error enviando notificaciones a usuario ${invitado.id_usuario}:`, error);
        }
      }
    }
  }

  console.log("✅ Evento actualizado correctamente");
}