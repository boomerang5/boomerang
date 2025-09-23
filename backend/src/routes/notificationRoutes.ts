import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';

const router = Router();

// Crear notificación de invitación a evento para un usuario
router.post('/event-invite', NotificationController.createEventInvite);

// Crear notificaciones de invitación a evento para múltiples usuarios
router.post('/event-invite-multiple', NotificationController.createMultipleEventInvites);

// Marcar notificación como leída
router.put('/:id/mark-read', NotificationController.markAsRead);

// Marcar notificación como respondida
router.put('/:id/mark-responded', NotificationController.markAsResponded);

// Obtener notificaciones de un usuario
router.get('/user/:userId', NotificationController.getUserNotifications);

// Responder a una notificación de evento (aceptar/rechazar)
router.post('/:id/respond', NotificationController.respondToEventInvite);

export default router;