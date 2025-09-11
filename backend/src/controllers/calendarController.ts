import { Request, Response } from 'express';
import { CalendarService } from '../services/calendar/calendarService';

export class CalendarController {
  private calendarService: CalendarService;

  constructor() {
    this.calendarService = new CalendarService();
  }

  // Obtener eventos de un usuario
  async getEventos(req: Request, res: Response) {
    try {
      const { id_usuario, fecha_inicio, fecha_fin } = req.query;

      if (!id_usuario) {
        return res.status(400).json({ error: 'id_usuario es requerido' });
      }

      const eventos = await this.calendarService.getEventosByUser(
        Number(id_usuario),
        fecha_inicio as string,
        fecha_fin as string
      );

      res.json({ eventos });
    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear nuevo evento
  async createEvento(req: Request, res: Response) {
    try {
      const {
        titulo,
        descripcion,
        fecha_programada,
        con_ia,
        creado_por,
        invitados = []
      } = req.body;

      if (!titulo || !fecha_programada || !creado_por) {
        return res.status(400).json({ 
          error: 'titulo, fecha_programada y creado_por son requeridos' 
        });
      }

      const evento = await this.calendarService.createEvento({
        titulo,
        descripcion,
        fecha_programada,
        con_ia: con_ia || false,
        creado_por,
        invitados
      });

      res.status(201).json({ evento });
    } catch (error) {
      console.error('Error creando evento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar evento
  async updateEvento(req: Request, res: Response) {
    try {
      const {
        id,
        titulo,
        descripcion,
        fecha_programada,
        con_ia,
        invitados = []
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id del evento es requerido' });
      }

      const evento = await this.calendarService.updateEvento(id, {
        titulo,
        descripcion,
        fecha_programada,
        con_ia,
        invitados
      });

      res.json({ evento });
    } catch (error) {
      console.error('Error actualizando evento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar evento
  async deleteEvento(req: Request, res: Response) {
    try {
      const { id_evento } = req.query;

      if (!id_evento) {
        return res.status(400).json({ error: 'id_evento es requerido' });
      }

      await this.calendarService.deleteEvento(Number(id_evento));
      res.json({ message: 'Evento eliminado exitosamente' });
    } catch (error) {
      console.error('Error eliminando evento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener invitados de un evento
  async getInvitados(req: Request, res: Response) {
    try {
      const { id_evento } = req.query;

      if (!id_evento) {
        return res.status(400).json({ error: 'id_evento es requerido' });
      }

      const invitados = await this.calendarService.getInvitadosByEvento(Number(id_evento));
      res.json({ invitados });
    } catch (error) {
      console.error('Error obteniendo invitados:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Agregar invitados a un evento
  async addInvitados(req: Request, res: Response) {
    try {
      const { id_evento, invitados } = req.body;

      if (!id_evento || !Array.isArray(invitados)) {
        return res.status(400).json({ 
          error: 'id_evento y invitados (array) son requeridos' 
        });
      }

      await this.calendarService.addInvitados(id_evento, invitados);
      res.json({ message: 'Invitados agregados exitosamente' });
    } catch (error) {
      console.error('Error agregando invitados:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Remover invitado de un evento
  async removeInvitado(req: Request, res: Response) {
    try {
      const { id_evento, id_usuario } = req.query;

      if (!id_evento || !id_usuario) {
        return res.status(400).json({ 
          error: 'id_evento y id_usuario son requeridos' 
        });
      }

      await this.calendarService.removeInvitado(Number(id_evento), Number(id_usuario));
      res.json({ message: 'Invitado removido exitosamente' });
    } catch (error) {
      console.error('Error removiendo invitado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
