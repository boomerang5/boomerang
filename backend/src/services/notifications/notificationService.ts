import supabase from '../../lib/supabase';

export interface CreateNotificationParams {
  id_usuario: number;
  tipo: 'meeting_invite' | 'friend_request' | 'system' | 'event_cancelled';
  mensaje: string;
  meta?: any;
}

/**
 * Servicio para crear notificaciones en la tabla Notificacion
 */
export class NotificationService {
  
  /**
   * Crear una nueva notificación
   */
  static async createNotification(params: CreateNotificationParams) {
    try {
      const { data, error } = await supabase
        .from('Notificacion')
        .insert({
          id_usuario: params.id_usuario,
          tipo: params.tipo,
          mensaje: params.mensaje,
          meta: params.meta || null,
          leida: false,
          fecha_envio: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error al crear notificación:', error);
        throw error;
      }

      console.log('Notificación creada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('Error en NotificationService.createNotification:', error);
      throw error;
    }
  }

  /**
   * Crear notificación de invitación a evento
   */
  static async createEventInviteNotification(
    id_usuario: number, 
    nombreEvento: string, 
    organizador: string,
    id_evento: number,
    fechaEvento?: string // 🆕 NUEVO: Fecha del evento
  ) {
    console.log('🔄 NotificationService.createEventInviteNotification iniciado:', {
      id_usuario,
      nombreEvento,
      organizador,
      id_evento,
      fechaEvento
    });
    
    // 🆕 NUEVO: Formatear mensaje con fecha y hora del evento
    console.log('📝 Datos recibidos para crear mensaje:', {
      nombreEvento,
      fechaEvento,
      tieneEvento: !!nombreEvento,
      tieneFecha: !!fechaEvento
    });
    
    let mensaje = `Te invitaron al evento "${nombreEvento}"`;
    if (fechaEvento) {
      try {
        const fecha = new Date(fechaEvento);
        const fechaFormateada = fecha.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const horaFormateada = fecha.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        mensaje = `Te invitaron al evento "${nombreEvento}" el ${fechaFormateada} a las ${horaFormateada}`;
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        mensaje = `Te invitaron al evento "${nombreEvento}"`;
      }
    }
    
    console.log('✉️ Mensaje final generado:', mensaje);
    
    const meta = {
      tipo_notificacion: 'invitacion_evento',
      id_evento: id_evento,
      nombre_evento: nombreEvento,
      organizador: organizador,
      fecha_evento: fechaEvento // 🆕 NUEVO: Incluir fecha del evento
    };

    console.log('📝 Datos para crear notificación:', {
      id_usuario,
      tipo: 'meeting_invite',
      mensaje,
      meta
    });

    const result = await this.createNotification({
      id_usuario,
      tipo: 'meeting_invite',
      mensaje,
      meta
    });

    console.log('✅ createEventInviteNotification completado:', result);
    return result;
  }

  /**
   * Crear notificación de evento cancelado
   */
  static async createEventCancelledNotification(
    id_usuario: number, 
    nombreEvento: string, 
    organizador: string,
    id_evento: number,
    fechaEvento?: string
  ) {
    console.log('🔄 NotificationService.createEventCancelledNotification iniciado:', {
      id_usuario,
      nombreEvento,
      organizador,
      id_evento,
      fechaEvento
    });
    
    // Formatear mensaje con fecha y hora del evento
    let mensaje = `El evento "${nombreEvento}" ha sido cancelado`;
    if (fechaEvento) {
      try {
        const fecha = new Date(fechaEvento);
        const fechaFormateada = fecha.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const horaFormateada = fecha.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        mensaje = `El evento "${nombreEvento}" programado para el ${fechaFormateada} a las ${horaFormateada} ha sido cancelado`;
      } catch (error) {
        console.error('Error al formatear fecha:', error);
      }
    }
    
    const meta = {
      tipo_notificacion: 'evento_cancelado',
      id_evento: id_evento,
      nombre_evento: nombreEvento,
      organizador: organizador,
      fecha_evento: fechaEvento
    };

    console.log('📝 Datos para crear notificación de cancelación:', {
      id_usuario,
      tipo: 'event_cancelled',
      mensaje,
      meta
    });

    const result = await this.createNotification({
      id_usuario,
      tipo: 'event_cancelled',
      mensaje,
      meta
    });

    console.log('✅ createEventCancelledNotification completado:', result);
    return result;
  }

  /**
   * Crear múltiples notificaciones de evento cancelado para varios usuarios
   */
  static async createMultipleEventCancelledNotifications(
    userIds: number[],
    nombreEvento: string,
    organizador: string,
    id_evento: number,
    fechaEvento?: string
  ) {
    console.log('🔄 NotificationService.createMultipleEventCancelledNotifications iniciado:', {
      userIds,
      nombreEvento,
      organizador,
      id_evento,
      fechaEvento
    });
    
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        console.log(`📤 Creando notificación de cancelación para usuario ${userId}...`);
        const notification = await this.createEventCancelledNotification(
          userId,
          nombreEvento,
          organizador,
          id_evento,
          fechaEvento
        );
        notifications.push(notification);
        console.log(`✅ Notificación de cancelación creada para usuario ${userId}:`, notification);
      } catch (error) {
        console.error(`❌ Error al crear notificación de cancelación para usuario ${userId}:`, error);
      }
    }

    console.log(`🎉 Proceso de cancelación completado. Total notificaciones creadas: ${notifications.length}`);
    return notifications;
  }

  /**
   * Crear múltiples notificaciones de invitación para varios usuarios
   */
  static async createMultipleEventInviteNotifications(
    userIds: number[],
    nombreEvento: string,
    organizador: string,
    id_evento: number,
    fechaEvento?: string // 🆕 NUEVO: Fecha del evento
  ) {
    console.log('🔄 NotificationService.createMultipleEventInviteNotifications iniciado:', {
      userIds,
      nombreEvento,
      organizador,
      id_evento,
      fechaEvento
    });
    
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        console.log(`📤 Creando notificación para usuario ${userId}...`);
        const notification = await this.createEventInviteNotification(
          userId,
          nombreEvento,
          organizador,
          id_evento,
          fechaEvento // 🆕 NUEVO: Pasar fecha del evento
        );
        notifications.push(notification);
        console.log(`✅ Notificación creada para usuario ${userId}:`, notification);
      } catch (error) {
        console.error(`❌ Error al crear notificación para usuario ${userId}:`, error);
      }
    }

    console.log(`🎉 Proceso completado. Total notificaciones creadas: ${notifications.length}`);
    return notifications;
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: number) {
    try {
      const { data, error } = await supabase
        .from('Notificacion')
        .update({ leida: true })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.error('Error al marcar notificación como leída:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en NotificationService.markAsRead:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como respondida (para invitaciones de eventos)
   */
  static async markAsResponded(notificationId: number, response: 'accept' | 'decline') {
    try {
      // Primero obtener la notificación actual
      const { data: currentNotification, error: fetchError } = await supabase
        .from('Notificacion')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (fetchError) {
        console.error('Error al obtener notificación:', fetchError);
        throw fetchError;
      }

      if (!currentNotification) {
        throw new Error('Notificación no encontrada');
      }

      // Actualizar el metadata para incluir la respuesta
      const updatedMeta = {
        ...currentNotification.meta,
        respondida: true,
        respuesta: response,
        fecha_respuesta: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('Notificacion')
        .update({ 
          leida: true, // También marcar como leída
          meta: updatedMeta 
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        console.error('Error al marcar notificación como respondida:', error);
        throw error;
      }

      console.log(`✅ Notificación ${notificationId} marcada como respondida con respuesta: ${response}`);
      return data;
    } catch (error) {
      console.error('Error en NotificationService.markAsResponded:', error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  static async getUserNotifications(userId: number) {
    try {
      const { data, error } = await supabase
        .from('Notificacion')
        .select('*')
        .eq('id_usuario', userId)
        .order('fecha_envio', { ascending: false });

      if (error) {
        console.error('Error al obtener notificaciones:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en NotificationService.getUserNotifications:', error);
      throw error;
    }
  }

  /**
   * Eliminar notificaciones de invitación para usuarios específicos de un evento
   */
  static async deleteEventInviteNotificationsForUsers(id_evento: number, userIds: number[]) {
    try {
      console.log(`🗑️ Eliminando notificaciones de invitación para evento ${id_evento} y usuarios:`, userIds);
      
      if (!userIds || userIds.length === 0) {
        console.log('ℹ️ No hay usuarios especificados para eliminar notificaciones');
        return { count: 0 };
      }

      const { data, error } = await supabase
        .from('Notificacion')
        .delete()
        .eq('tipo', 'meeting_invite')
        .in('id_usuario', userIds)
        .contains('meta', { id_evento: id_evento })
        .select();

      if (error) {
        console.error('Error al eliminar notificaciones de invitación:', error);
        throw error;
      }

      console.log(`✅ Eliminadas ${data?.length || 0} notificaciones de invitación`);
      return { count: data?.length || 0, deletedNotifications: data };
    } catch (error) {
      console.error('Error en NotificationService.deleteEventInviteNotificationsForUsers:', error);
      throw error;
    }
  }

  /**
   * Eliminar todas las notificaciones de invitación para un evento específico
   */
  static async deleteAllEventInviteNotifications(id_evento: number) {
    try {
      console.log(`🗑️ Eliminando todas las notificaciones de invitación para evento ${id_evento}`);

      const { data, error } = await supabase
        .from('Notificacion')
        .delete()
        .eq('tipo', 'meeting_invite')
        .contains('meta', { id_evento: id_evento })
        .select();

      if (error) {
        console.error('Error al eliminar todas las notificaciones de invitación:', error);
        throw error;
      }

      console.log(`✅ Eliminadas ${data?.length || 0} notificaciones de invitación del evento`);
      return { count: data?.length || 0, deletedNotifications: data };
    } catch (error) {
      console.error('Error en NotificationService.deleteAllEventInviteNotifications:', error);
      throw error;
    }
  }
}