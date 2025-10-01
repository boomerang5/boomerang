import { Request, Response } from 'express';
import { ReportsService } from '../services/reportsService';

const reportsService = new ReportsService();

export class ReportsController {
  
  /**
   * @swagger
   * /api/reports/actividad-temporal:
   *   get:
   *     summary: Obtiene datos de actividad temporal
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: fechaInicio
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de inicio del período
   *       - in: query
   *         name: fechaFin
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de fin del período
   *       - in: query
   *         name: agrupacion
   *         schema:
   *           type: string
   *           enum: [dia, semana, mes]
   *         description: Tipo de agrupación temporal
   *     responses:
   *       200:
   *         description: Datos de actividad temporal
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   periodo:
   *                     type: string
   *                   totalLlamadas:
   *                     type: number
   *                   duracionTotal:
   *                     type: number
   *                   duracionPromedio:
   *                     type: number
   *                   participantesUnicos:
   *                     type: number
   */
  async getActividadTemporal(req: Request, res: Response) {
    try {
      const { id_usuario, fechaInicio, fechaFin, agrupacion = 'dia' } = req.query;
      
      if (!id_usuario || !fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          error: 'id_usuario, fechaInicio y fechaFin son requeridos' 
        });
      }

      const usuarioId = parseInt(id_usuario as string);
      if (isNaN(usuarioId)) {
        return res.status(400).json({ 
          error: 'ID de usuario inválido' 
        });
      }

      const inicio = new Date(fechaInicio as string);
      const fin = new Date(fechaFin as string);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return res.status(400).json({ 
          error: 'Formato de fecha inválido' 
        });
      }

      const data = await reportsService.getActividadTemporal(
        usuarioId,
        inicio, 
        fin, 
        agrupacion as 'dia' | 'semana' | 'mes'
      );
      
      res.json(data);
    } catch (error) {
      console.error('Error al obtener actividad temporal:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * @swagger
   * /api/reports/colaboracion:
   *   get:
   *     summary: Obtiene datos de colaboración entre usuarios
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: fechaInicio
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de inicio del período
   *       - in: query
   *         name: fechaFin
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de fin del período
   *     responses:
   *       200:
   *         description: Datos de colaboración
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   usuarioId:
   *                     type: number
   *                   nombreUsuario:
   *                     type: string
   *                   llamadasOrganizadas:
   *                     type: number
   *                   llamadasParticipadas:
   *                     type: number
   *                   tiempoTotalMinutos:
   *                     type: number
   *                   colaboracionesUnicas:
   *                     type: number
   */
  async getColaboracion(req: Request, res: Response) {
    try {
      const { id_usuario, fechaInicio, fechaFin } = req.query;
      
      if (!id_usuario || !fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          error: 'id_usuario, fechaInicio y fechaFin son requeridos' 
        });
      }

      const usuarioId = parseInt(id_usuario as string);
      if (isNaN(usuarioId)) {
        return res.status(400).json({ 
          error: 'ID de usuario inválido' 
        });
      }

      const inicio = new Date(fechaInicio as string);
      const fin = new Date(fechaFin as string);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return res.status(400).json({ 
          error: 'Formato de fecha inválido' 
        });
      }

      const data = await reportsService.getColaboracion(usuarioId, inicio, fin);
      
      res.json(data);
    } catch (error) {
      console.error('Error al obtener datos de colaboración:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * @swagger
   * /api/reports/productividad:
   *   get:
   *     summary: Obtiene datos de productividad
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: fechaInicio
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de inicio del período
   *       - in: query
   *         name: fechaFin
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de fin del período
   *       - in: query
   *         name: agrupacion
   *         schema:
   *           type: string
   *           enum: [dia, semana, mes]
   *         description: Tipo de agrupación temporal
   *     responses:
   *       200:
   *         description: Datos de productividad
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   periodo:
   *                     type: string
   *                   reunionesProgramadas:
   *                     type: number
   *                   reunionesCompletadas:
   *                     type: number
   *                   tasaCompletitud:
   *                     type: number
   *                   tiempoEfectivo:
   *                     type: number
   *                   tiempoPromedioPorReunion:
   *                     type: number
   */
  async getProductividad(req: Request, res: Response) {
    try {
      const { id_usuario, fechaInicio, fechaFin, agrupacion = 'semana' } = req.query;
      
      if (!id_usuario || !fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          error: 'id_usuario, fechaInicio y fechaFin son requeridos' 
        });
      }

      const usuarioId = parseInt(id_usuario as string);
      if (isNaN(usuarioId)) {
        return res.status(400).json({ 
          error: 'ID de usuario inválido' 
        });
      }

      const inicio = new Date(fechaInicio as string);
      const fin = new Date(fechaFin as string);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return res.status(400).json({ 
          error: 'Formato de fecha inválido' 
        });
      }

      const data = await reportsService.getProductividad(
        usuarioId,
        inicio, 
        fin, 
        agrupacion as 'dia' | 'semana' | 'mes'
      );
      
      res.json(data);
    } catch (error) {
      console.error('Error al obtener datos de productividad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * @swagger
   * /api/reports/estadisticas-generales:
   *   get:
   *     summary: Obtiene estadísticas generales del período
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: fechaInicio
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de inicio del período
   *       - in: query
   *         name: fechaFin
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de fin del período
   *     responses:
   *       200:
   *         description: Estadísticas generales
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalLlamadas:
   *                   type: number
   *                 totalMinutos:
   *                   type: number
   *                 participantesUnicos:
   *                   type: number
   *                 promedioParticipantesPorLlamada:
   *                   type: number
   *                 llamadasCompletadas:
   *                   type: number
   *                 tasaExito:
   *                   type: number
   */
  async getEstadisticasGenerales(req: Request, res: Response) {
    try {
      const { id_usuario, fechaInicio, fechaFin } = req.query;
      
      if (!id_usuario || !fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          error: 'id_usuario, fechaInicio y fechaFin son requeridos' 
        });
      }

      const usuarioId = parseInt(id_usuario as string);
      if (isNaN(usuarioId)) {
        return res.status(400).json({ 
          error: 'ID de usuario inválido' 
        });
      }

      const inicio = new Date(fechaInicio as string);
      const fin = new Date(fechaFin as string);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return res.status(400).json({ 
          error: 'Formato de fecha inválido' 
        });
      }

      const data = await reportsService.getEstadisticasGenerales(usuarioId, inicio, fin);
      
      res.json(data);
    } catch (error) {
      console.error('Error al obtener estadísticas generales:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * @swagger
   * /api/reports/resumen:
   *   get:
   *     summary: Obtiene un resumen completo con todos los tipos de reportes
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: fechaInicio
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de inicio del período
   *       - in: query
   *         name: fechaFin
   *         schema:
   *           type: string
   *           format: date
   *         required: true
   *         description: Fecha de fin del período
   *     responses:
   *       200:
   *         description: Resumen completo de reportes
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 estadisticasGenerales:
   *                   type: object
   *                 actividadTemporal:
   *                   type: array
   *                 colaboracion:
   *                   type: array
   *                 productividad:
   *                   type: array
   */
  async getResumen(req: Request, res: Response) {
    try {
      const { id_usuario, fechaInicio, fechaFin } = req.query;
      
      if (!id_usuario || !fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          error: 'id_usuario, fechaInicio y fechaFin son requeridos' 
        });
      }

      const usuarioId = parseInt(id_usuario as string);
      if (isNaN(usuarioId)) {
        return res.status(400).json({ 
          error: 'ID de usuario inválido' 
        });
      }

      const inicio = new Date(fechaInicio as string);
      const fin = new Date(fechaFin as string);
      
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        return res.status(400).json({ 
          error: 'Formato de fecha inválido' 
        });
      }

      const [estadisticasGenerales, actividadTemporal, colaboracion, productividad] = 
        await Promise.all([
          reportsService.getEstadisticasGenerales(usuarioId, inicio, fin),
          reportsService.getActividadTemporal(usuarioId, inicio, fin, 'dia'),
          reportsService.getColaboracion(usuarioId, inicio, fin),
          reportsService.getProductividad(usuarioId, inicio, fin, 'semana')
        ]);
      
      res.json({
        estadisticasGenerales,
        actividadTemporal,
        colaboracion,
        productividad
      });
    } catch (error) {
      console.error('Error al obtener resumen de reportes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

export const reportsController = new ReportsController();