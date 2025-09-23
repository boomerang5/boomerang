import { Request, Response } from 'express';
import { NotificationService } from '../services/notifications/notificationService';

/**
 * Controlador para manejar notificaciones
 */
export class NotificationController {

  /**
   * Crear una notificación de invitación a evento
   * POST /api/notifications/event-invite
   */
  static async createEventInvite(req: Request, res: Response) {
    try {
      const { id_usuario, nombre_evento, organizador, id_evento } = req.body;

      if (!id_usuario || !nombre_evento || !organizador || !id_evento) {
        return res.status(400).json({
          success: false,
          message: 'Faltan parámetros requeridos: id_usuario, nombre_evento, organizador, id_evento'
        });
      }

      const notification = await NotificationService.createEventInviteNotification(
        id_usuario,
        nombre_evento,
        organizador,
        id_evento
      );

      res.status(201).json({
        success: true,
        message: 'Notificación de invitación creada exitosamente',
        data: notification
      });

    } catch (error) {
      console.error('Error en createEventInvite:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Crear múltiples notificaciones de invitación a evento
   * POST /api/notifications/event-invite-multiple
   */
  static async createMultipleEventInvites(req: Request, res: Response) {
    try {
      const { user_ids, nombre_evento, organizador, id_evento } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'user_ids debe ser un array no vacío'
        });
      }

      if (!nombre_evento || !organizador || !id_evento) {
        return res.status(400).json({
          success: false,
          message: 'Faltan parámetros requeridos: nombre_evento, organizador, id_evento'
        });
      }

      const notifications = await NotificationService.createMultipleEventInviteNotifications(
        user_ids,
        nombre_evento,
        organizador,
        id_evento
      );

      res.status(201).json({
        success: true,
        message: `${notifications.length} notificaciones creadas exitosamente`,
        data: notifications
      });

    } catch (error) {
      console.error('Error en createMultipleEventInvites:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Marcar notificación como leída
   * PUT /api/notifications/:id/mark-read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const notificationId = parseInt(req.params.id);

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de notificación inválido'
        });
      }

      const notification = await NotificationService.markAsRead(notificationId);

      res.status(200).json({
        success: true,
        message: 'Notificación marcada como leída',
        data: notification
      });

    } catch (error) {
      console.error('Error en markAsRead:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Marcar notificación como respondida (para invitaciones de eventos)
   * PUT /api/notifications/:id/mark-responded
   */
  static async markAsResponded(req: Request, res: Response) {
    try {
      const notificationId = parseInt(req.params.id);
      const { response } = req.body; // 'accept' | 'decline'

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de notificación inválido'
        });
      }

      if (!response || !['accept', 'decline'].includes(response)) {
        return res.status(400).json({
          success: false,
          message: 'Respuesta debe ser "accept" o "decline"'
        });
      }

      const notification = await NotificationService.markAsResponded(notificationId, response);

      res.status(200).json({
        success: true,
        message: 'Notificación marcada como respondida',
        data: notification
      });

    } catch (error) {
      console.error('Error en markAsResponded:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Obtener notificaciones de un usuario
   * GET /api/notifications/user/:userId
   */
  static async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }

      const notifications = await NotificationService.getUserNotifications(userId);

      res.status(200).json({
        success: true,
        message: 'Notificaciones obtenidas exitosamente',
        data: notifications
      });

    } catch (error) {
      console.error('Error en getUserNotifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Responder a una notificación de evento (aceptar/rechazar)
   * POST /api/notifications/:id/respond
   */
  static async respondToEventInvite(req: Request, res: Response) {
    try {
      const notificationId = parseInt(req.params.id);
      const { response, id_usuario } = req.body; // response: 'accept' | 'decline'

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de notificación inválido'
        });
      }

      if (!response || !['accept', 'decline'].includes(response)) {
        return res.status(400).json({
          success: false,
          message: 'Respuesta debe ser "accept" o "decline"'
        });
      }

      if (!id_usuario) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario requerido'
        });
      }

      // Marcar la notificación como leída
      await NotificationService.markAsRead(notificationId);

      // TODO: Aquí se podría agregar lógica adicional como:
      // - Actualizar estado en tabla EventoInvitado
      // - Crear notificación de respuesta para el organizador
      // - Enviar confirmación por email, etc.

      res.status(200).json({
        success: true,
        message: `Invitación ${response === 'accept' ? 'aceptada' : 'rechazada'} exitosamente`,
        data: {
          notification_id: notificationId,
          response: response,
          user_id: id_usuario
        }
      });

    } catch (error) {
      console.error('Error en respondToEventInvite:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}