import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export interface EventoData {
  titulo: string;
  descripcion?: string;
  fecha_programada: string;
  con_ia?: boolean;
  creado_por: number;
  invitados?: number[];
}

export interface EventoUpdateData {
  titulo?: string;
  descripcion?: string;
  fecha_programada?: string;
  con_ia?: boolean;
  invitados?: number[];
}

export class CalendarService {
  private client: SupabaseClient;

  constructor() {
    this.client = supabase;
  }

  // Obtener eventos de un usuario en un rango de fechas
  async getEventosByUser(userId: number, fechaInicio?: string, fechaFin?: string) {
    try {
      let query = this.client
        .from('EventoLlamada')
        .select(`
          *,
          Llamada:id_llamada (
            *,
            UsuarioXLlamada!inner (
              idUsuario
            )
          )
        `)
        .eq('Llamada.UsuarioXLlamada.idUsuario', userId);

      // Aplicar filtros de fecha si se proporcionan
      if (fechaInicio) {
        query = query.gte('fecha_programada', fechaInicio);
      }
      if (fechaFin) {
        query = query.lte('fecha_programada', fechaFin);
      }

      const { data: eventos, error } = await query.order('fecha_programada', { ascending: true });

      if (error) {
        console.error('Error obteniendo eventos:', error);
        throw new Error('Error al obtener eventos');
      }

      // Obtener invitados para cada evento
      const eventosConInvitados = await Promise.all(
        (eventos || []).map(async (evento) => {
          const invitados = await this.getInvitadosByEvento(evento.id);
          return {
            ...evento,
            invitados
          };
        })
      );

      return eventosConInvitados;
    } catch (error) {
      console.error('Error en getEventosByUser:', error);
      throw error;
    }
  }

  // Crear un nuevo evento/reunión
  async createEvento(eventoData: EventoData) {
    try {
      // 1. Crear la llamada primero
      const { data: llamada, error: llamadaError } = await this.client
        .from('Llamada')
        .insert({
          fecha_inicio: null, // Se llenará cuando inicie la llamada
          fecha_fin: null,
          titulo: eventoData.titulo,
          descripcion: eventoData.descripcion,
          duracion_calculada: null,
          grabada: false,
          id_grupo: null // Por ahora sin grupo
        })
        .select()
        .single();

      if (llamadaError) {
        console.error('Error creando llamada:', llamadaError);
        throw new Error('Error al crear la llamada');
      }

      // 2. Crear el evento programado
      const { data: evento, error: eventoError } = await this.client
        .from('EventoLlamada')
        .insert({
          id_llamada: llamada.id,
          fecha_programada: eventoData.fecha_programada,
          titulo: eventoData.titulo,
          descripcion: eventoData.descripcion,
          creado_por: eventoData.creado_por,
          con_ia: eventoData.con_ia || false
        })
        .select()
        .single();

      if (eventoError) {
        console.error('Error creando evento:', eventoError);
        // Limpiar la llamada creada si falla el evento
        await this.client.from('Llamada').delete().eq('id', llamada.id);
        throw new Error('Error al crear el evento');
      }

      // 3. Agregar el creador como participante
      const { error: participanteError } = await this.client
        .from('UsuarioXLlamada')
        .insert({
          idLlamada: llamada.id,
          idUsuario: eventoData.creado_por,
          host: true,
          ingreso: null, // Se llenará cuando se una a la llamada
          salida: null
        });

      if (participanteError) {
        console.error('Error agregando creador como participante:', participanteError);
      }

      // 4. Agregar invitados si los hay
      if (eventoData.invitados && eventoData.invitados.length > 0) {
        await this.addInvitados(evento.id, eventoData.invitados);
      }

      return {
        ...evento,
        id_llamada: llamada.id,
        invitados: eventoData.invitados || []
      };
    } catch (error) {
      console.error('Error en createEvento:', error);
      throw error;
    }
  }

  // Actualizar un evento existente
  async updateEvento(eventoId: number, updateData: EventoUpdateData) {
    try {
      // 1. Actualizar el evento
      const { data: evento, error: eventoError } = await this.client
        .from('EventoLlamada')
        .update({
          ...(updateData.titulo && { titulo: updateData.titulo }),
          ...(updateData.descripcion !== undefined && { descripcion: updateData.descripcion }),
          ...(updateData.fecha_programada && { fecha_programada: updateData.fecha_programada }),
          ...(updateData.con_ia !== undefined && { con_ia: updateData.con_ia })
        })
        .eq('id', eventoId)
        .select()
        .single();

      if (eventoError) {
        console.error('Error actualizando evento:', eventoError);
        throw new Error('Error al actualizar el evento');
      }

      // 2. Actualizar la llamada asociada si es necesario
      if (updateData.titulo || updateData.descripcion) {
        const { error: llamadaError } = await this.client
          .from('Llamada')
          .update({
            ...(updateData.titulo && { titulo: updateData.titulo }),
            ...(updateData.descripcion !== undefined && { descripcion: updateData.descripcion })
          })
          .eq('id', evento.id_llamada);

        if (llamadaError) {
          console.error('Error actualizando llamada:', llamadaError);
        }
      }

      // 3. Actualizar invitados si se proporcionan
      if (updateData.invitados !== undefined) {
        // Remover todos los invitados actuales (excepto el host)
        await this.client
          .from('UsuarioXLlamada')
          .delete()
          .eq('idLlamada', evento.id_llamada)
          .eq('host', false);

        // Agregar nuevos invitados
        if (updateData.invitados.length > 0) {
          await this.addInvitados(evento.id_llamada, updateData.invitados);
        }
      }

      const invitados = await this.getInvitadosByEvento(eventoId);
      
      return {
        ...evento,
        invitados
      };
    } catch (error) {
      console.error('Error en updateEvento:', error);
      throw error;
    }
  }

  // Eliminar un evento
  async deleteEvento(eventoId: number) {
    try {
      // 1. Obtener el evento para conseguir el ID de la llamada
      const { data: evento, error: getError } = await this.client
        .from('EventoLlamada')
        .select('id_llamada')
        .eq('id', eventoId)
        .single();

      if (getError) {
        console.error('Error obteniendo evento:', getError);
        throw new Error('Evento no encontrado');
      }

      // 2. Eliminar participantes de la llamada
      const { error: participantesError } = await this.client
        .from('UsuarioXLlamada')
        .delete()
        .eq('idLlamada', evento.id_llamada);

      if (participantesError) {
        console.error('Error eliminando participantes:', participantesError);
      }

      // 3. Eliminar el evento
      const { error: eventoError } = await this.client
        .from('EventoLlamada')
        .delete()
        .eq('id', eventoId);

      if (eventoError) {
        console.error('Error eliminando evento:', eventoError);
        throw new Error('Error al eliminar el evento');
      }

      // 4. Eliminar la llamada
      const { error: llamadaError } = await this.client
        .from('Llamada')
        .delete()
        .eq('id', evento.id_llamada);

      if (llamadaError) {
        console.error('Error eliminando llamada:', llamadaError);
      }

      return true;
    } catch (error) {
      console.error('Error en deleteEvento:', error);
      throw error;
    }
  }

  // Obtener invitados de un evento
  async getInvitadosByEvento(eventoId: number) {
    try {
      // Primero obtenemos el id de la llamada
      const { data: evento, error: eventoError } = await this.client
        .from('EventoLlamada')
        .select('id_llamada')
        .eq('id', eventoId)
        .single();

      if (eventoError || !evento) {
        return [];
      }

      // Luego obtenemos los participantes de la llamada
      const { data: participantes, error: participantesError } = await this.client
        .from('UsuarioXLlamada')
        .select(`
          idUsuario,
          host,
          Usuario:idUsuario (
            id,
            nombre,
            apellido,
            apodo
          )
        `)
        .eq('idLlamada', evento.id_llamada);

      if (participantesError) {
        console.error('Error obteniendo invitados:', participantesError);
        return [];
      }

      return (participantes || []).map((p: any) => ({
        id: p.idUsuario,
        nombre: p.Usuario?.nombre || '',
        apellido: p.Usuario?.apellido || '',
        apodo: p.Usuario?.apodo || '',
        host: p.host || false
      }));
    } catch (error) {
      console.error('Error en getInvitadosByEvento:', error);
      return [];
    }
  }

  // Agregar invitados a un evento
  async addInvitados(eventoIdOrLlamadaId: number, invitadosIds: number[]) {
    try {
      let llamadaId = eventoIdOrLlamadaId;

      // Si recibimos un evento ID, necesitamos obtener el llamada ID
      const { data: evento } = await this.client
        .from('EventoLlamada')
        .select('id_llamada')
        .eq('id', eventoIdOrLlamadaId)
        .single();

      if (evento) {
        llamadaId = evento.id_llamada;
      }

      const participantesToInsert = invitadosIds.map(userId => ({
        idLlamada: llamadaId,
        idUsuario: userId,
        host: false,
        ingreso: null,
        salida: null
      }));

      const { error } = await this.client
        .from('UsuarioXLlamada')
        .insert(participantesToInsert);

      if (error) {
        console.error('Error agregando invitados:', error);
        throw new Error('Error al agregar invitados');
      }

      return true;
    } catch (error) {
      console.error('Error en addInvitados:', error);
      throw error;
    }
  }

  // Remover un invitado de un evento
  async removeInvitado(eventoId: number, usuarioId: number) {
    try {
      // Obtener el ID de la llamada
      const { data: evento, error: eventoError } = await this.client
        .from('EventoLlamada')
        .select('id_llamada')
        .eq('id', eventoId)
        .single();

      if (eventoError || !evento) {
        throw new Error('Evento no encontrado');
      }

      const { error } = await this.client
        .from('UsuarioXLlamada')
        .delete()
        .eq('idLlamada', evento.id_llamada)
        .eq('idUsuario', usuarioId)
        .eq('host', false); // Solo permitir eliminar invitados, no el host

      if (error) {
        console.error('Error removiendo invitado:', error);
        throw new Error('Error al remover invitado');
      }

      return true;
    } catch (error) {
      console.error('Error en removeInvitado:', error);
      throw error;
    }
  }
}
