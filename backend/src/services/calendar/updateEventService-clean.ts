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

    // 3. Obtener nombre del editor
    const { data: editorData } = await supabase
      .from('Usuario')
      .select('nombre, apellido, apodo')
      .eq('id', editor)
      .single();

    const editorNombre = editorData 
      ? `${editorData.nombre || ''} ${editorData.apellido || ''}`.trim() || editorData.apodo || `Usuario ${editor}`
      : `Usuario ${editor}`;

    // 4. Enviar notificaciones solo si hay invitados y fecha
    if (invitados && invitados.length > 0 && fecha) {
      for (const invitado of invitados) {
        try {
          // Notificación de cambio
          await NotificationService.createNotification({
            id_usuario: invitado.id_usuario,
            tipo: 'system',
            mensaje: `📅 El evento "${eventoActual.titulo}" cambió de fecha/hora. Tu confirmación volvió al estado pendiente.`,
            meta: {
              evento_id: idEvento,
              tipo_cambio: 'fecha',
              nueva_fecha: fecha.toISOString(),
              titulo_evento: eventoActual.titulo
            }
          });

          // Nueva invitación
          await NotificationService.createEventInviteNotification(
            invitado.id_usuario,
            eventoActual.titulo,
            editorNombre,
            idEvento,
            fecha.toISOString()
          );
        } catch (error) {
        }
      }
    }
  }

  console.log("✅ Evento actualizado correctamente");
}