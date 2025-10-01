import { Router } from 'express';
import { reportsController } from '../controllers/reportsController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: API para generar reportes y métricas del sistema
 */

// Ruta para actividad temporal
router.get('/actividad-temporal', reportsController.getActividadTemporal);

// Ruta para colaboración
router.get('/colaboracion', reportsController.getColaboracion);

// Ruta para productividad
router.get('/productividad', reportsController.getProductividad);

// Ruta para estadísticas generales
router.get('/estadisticas-generales', reportsController.getEstadisticasGenerales);

// Ruta para resumen completo
router.get('/resumen', reportsController.getResumen);

export default router;