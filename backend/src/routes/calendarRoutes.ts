import { Router } from 'express';
import { CalendarController } from '../controllers/calendarController';

const router = Router();
const calendarController = new CalendarController();

// Rutas para eventos/reuniones
router.get('/eventos', calendarController.getEventos.bind(calendarController));
router.post('/eventos', calendarController.createEvento.bind(calendarController));
router.put('/eventos', calendarController.updateEvento.bind(calendarController));
router.delete('/eventos', calendarController.deleteEvento.bind(calendarController));

// Rutas para invitados
router.get('/invitados', calendarController.getInvitados.bind(calendarController));
router.post('/invitados', calendarController.addInvitados.bind(calendarController));
router.delete('/invitados', calendarController.removeInvitado.bind(calendarController));

export default router;
