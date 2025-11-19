import supabase from "../../lib/supabase";

export interface CreateNotificationParams {
  id_usuario: number;
  tipo:
    | "meeting_invite"
    | "reinvite"
    | "friend_request"
    | "system"
    | "event_cancelled";
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
        .from("Notificacion")
        .insert({
          id_usuario: params.id_usuario,
          tipo: params.tipo,
          mensaje: params.mensaje,
          meta: params.meta || null,
          leida: false,
          fecha_envio: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
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
    fechaEvento?: string,
    descripcion?: string // 🆕 NUEVO: Descripción del evento
  ) {
    // ✅ Formatear mensaje bonito con fecha y hora (GMT-3 Argentina)
    let mensaje = "";
    if (fechaEvento) {
      try {
        const fecha = new Date(fechaEvento);
        const fechaFormateada = fecha.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "America/Argentina/Buenos_Aires",
        });
        const horaFormateada = fecha.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Argentina/Buenos_Aires",
        });

        // Formato: "El día... a las..."
        mensaje = `El día ${fechaFormateada} a las ${horaFormateada}`;
        if (descripcion) {
          mensaje += `\n📝 ${descripcion}`;
        }
      } catch (error) {
        mensaje = descripcion || "";
      }
    } else {
      mensaje = descripcion || "";
    }

    const meta = {
      tipo_notificacion: "invitacion_evento",
      id_evento: id_evento, // ✅ CORRECTO: id_evento (no evento_id)
      titulo_evento: nombreEvento, // ✅ NUEVO: título del evento para el frontend
      organizador: organizador,
      fecha: fechaEvento, // ✅ CORRECTO: fecha (no fecha_evento)
      descripcion: descripcion,
    };

    const result = await this.createNotification({
      id_usuario,
      tipo: "reinvite",
      mensaje,
      meta,
    });

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
    // Formatear mensaje con fecha y hora del evento
    let mensaje = `El evento "${nombreEvento}" ha sido cancelado`;
    if (fechaEvento) {
      try {
        const fecha = new Date(fechaEvento);
        const fechaFormateada = fecha.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const horaFormateada = fecha.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        mensaje = `El evento "${nombreEvento}" programado para el ${fechaFormateada} a las ${horaFormateada} ha sido cancelado`;
      } catch (error) {
        console.error("Error al formatear fecha:", error);
      }
    }

    const meta = {
      tipo_notificacion: "evento_cancelado",
      id_evento: id_evento,
      nombre_evento: nombreEvento,
      organizador: organizador,
      fecha_evento: fechaEvento,
    };

    const result = await this.createNotification({
      id_usuario,
      tipo: "event_cancelled",
      mensaje,
      meta,
    });

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
    const notifications = [];

    for (const userId of userIds) {
      try {
        const notification = await this.createEventCancelledNotification(
          userId,
          nombreEvento,
          organizador,
          id_evento,
          fechaEvento
        );
        notifications.push(notification);
      } catch (error) {
        console.error(
          `❌ Error al crear notificación de cancelación para usuario ${userId}:`,
          error
        );
      }
    }
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
    fechaEvento?: string,
    descripcion?: string // 🆕 NUEVO: Descripción del evento
  ) {
    const notifications = [];

    for (const userId of userIds) {
      try {
        const notification = await this.createEventInviteNotification(
          userId,
          nombreEvento,
          organizador,
          id_evento,
          fechaEvento,
          descripcion // 🆕 NUEVO: Pasar descripción del evento
        );
        notifications.push(notification);
      } catch (error) {
        console.error(
          `❌ Error al crear notificación para usuario ${userId}:`,
          error
        );
      }
    }
    return notifications;
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(notificationId: number) {
    try {
      const { data, error } = await supabase
        .from("Notificacion")
        .update({ leida: true })
        .eq("id", notificationId)
        .select()
        .single();

      if (error) {
        console.error("Error al marcar notificación como leída:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error en NotificationService.markAsRead:", error);
      throw error;
    }
  }

  /**
   * Marcar notificación como respondida (para invitaciones de eventos)
   */
  static async markAsResponded(
    notificationId: number,
    response: "accept" | "decline"
  ) {
    try {
      // Primero obtener la notificación actual
      const { data: currentNotification, error: fetchError } = await supabase
        .from("Notificacion")
        .select("*")
        .eq("id", notificationId)
        .single();

      if (fetchError) {
        console.error("Error al obtener notificación:", fetchError);
        throw fetchError;
      }

      if (!currentNotification) {
        throw new Error("Notificación no encontrada");
      }

      // Actualizar el metadata para incluir la respuesta
      const updatedMeta = {
        ...currentNotification.meta,
        respondida: true,
        respuesta: response,
        fecha_respuesta: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("Notificacion")
        .update({
          leida: true, // También marcar como leída
          meta: updatedMeta,
        })
        .eq("id", notificationId)
        .select()
        .single();

      if (error) {
        console.error("Error al marcar notificación como respondida:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error en NotificationService.markAsResponded:", error);
      throw error;
    }
  }

  /**
   * Obtener notificaciones de un usuario
   */
  static async getUserNotifications(userId: number) {
    try {
      const { data, error } = await supabase
        .from("Notificacion")
        .select("*")
        .eq("id_usuario", userId)
        .order("fecha_envio", { ascending: false });

      if (error) {
        console.error("Error al obtener notificaciones:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error en NotificationService.getUserNotifications:",
        error
      );
      throw error;
    }
  }

  /**
   * Eliminar notificaciones de invitación para usuarios específicos de un evento
   */
  static async deleteEventInviteNotificationsForUsers(
    id_evento: number,
    userIds: number[]
  ) {
    try {
      if (!userIds || userIds.length === 0) {
        return { count: 0 };
      }

      const { data, error } = await supabase
        .from("Notificacion")
        .delete()
        .eq("tipo", "meeting_invite")
        .in("id_usuario", userIds)
        .contains("meta", { id_evento: id_evento })
        .select();

      if (error) {
        console.error("Error al eliminar notificaciones de invitación:", error);
        throw error;
      }

      return { count: data?.length || 0, deletedNotifications: data };
    } catch (error) {
      console.error(
        "Error en NotificationService.deleteEventInviteNotificationsForUsers:",
        error
      );
      throw error;
    }
  }

  /**
   * Eliminar todas las notificaciones de invitación para un evento específico
   */
  static async deleteAllEventInviteNotifications(id_evento: number) {
    try {
      const { data, error } = await supabase
        .from("Notificacion")
        .delete()
        .eq("tipo", "meeting_invite")
        .contains("meta", { id_evento: id_evento })
        .select();

      if (error) {
        console.error(
          "Error al eliminar todas las notificaciones de invitación:",
          error
        );
        throw error;
      }
      return { count: data?.length || 0, deletedNotifications: data };
    } catch (error) {
      console.error(
        "Error en NotificationService.deleteAllEventInviteNotifications:",
        error
      );
      throw error;
    }
  }
}
