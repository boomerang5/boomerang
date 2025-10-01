import supabase from '../lib/supabase';

// Interfaces para los reportes (mantienen la misma estructura)
export interface ActividadTemporalData {
  periodo: string;
  totalLlamadas: number;
  duracionTotal: number;
  duracionPromedio: number;
  participantesUnicos: number;
}

export interface ColaboracionData {
  usuarioId: number;
  nombreUsuario: string;
  llamadasOrganizadas: number;
  llamadasParticipadas: number;
  tiempoTotalMinutos: number;
  colaboracionesUnicas: number;
}

export interface ProductividadData {
  periodo: string;
  reunionesProgramadas: number;
  reunionesCompletadas: number;
  tasaCompletitud: number;
  tiempoEfectivo: number;
  tiempoPromedioPorReunion: number;
}

export interface EstadisticasGenerales {
  totalLlamadas: number;
  totalMinutos: number;
  participantesUnicos: number;
  promedioParticipantesPorLlamada: number;
  llamadasCompletadas: number;
  tasaExito: number;
}

export class ReportsService {

  // Reporte de Actividad Temporal usando SP
  async getActividadTemporal(
    usuarioId: number,
    fechaInicio: Date,
    fechaFin: Date,
    agrupacion: 'dia' | 'semana' | 'mes' = 'dia'
  ): Promise<ActividadTemporalData[]> {
    try {
      const { data, error } = await supabase.rpc('get_actividad_temporal', {
        usuario_id_param: usuarioId,
        fecha_inicio_param: fechaInicio.toISOString().split('T')[0],
        fecha_fin_param: fechaFin.toISOString().split('T')[0]
      });

      if (error) {
        console.error('Error en get_actividad_temporal:', error);
        throw new Error(`Error al obtener actividad temporal: ${error.message}`);
      }

      // Mapear respuesta del SP a nuestra interface
      return (data || []).map((row: any) => ({
        periodo: row.periodo,
        totalLlamadas: parseInt(row.total_llamadas) || 0,
        duracionTotal: parseFloat(row.duracion_total) || 0,
        duracionPromedio: parseFloat(row.duracion_promedio) || 0,
        participantesUnicos: parseInt(row.participantes_unicos) || 0
      }));
    } catch (error) {
      console.error('Error ejecutando getActividadTemporal:', error);
      throw error;
    }
  }

  // Reporte de Colaboración usando SP
  async getColaboracion(
    usuarioId: number,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<ColaboracionData[]> {
    try {
      const { data, error } = await supabase.rpc('get_colaboracion', {
        usuario_id_param: usuarioId,
        fecha_inicio_param: fechaInicio.toISOString().split('T')[0],
        fecha_fin_param: fechaFin.toISOString().split('T')[0]
      });

      if (error) {
        console.error('Error en get_colaboracion:', error);
        throw new Error(`Error al obtener datos de colaboración: ${error.message}`);
      }

      // Mapear respuesta del SP a nuestra interface
      return (data || []).map((row: any) => ({
        usuarioId: parseInt(row.usuario_id),
        nombreUsuario: `${row.nombre_usuario} ${row.apellido_usuario}` || `Usuario ${row.usuario_id}`,
        llamadasOrganizadas: parseInt(row.llamadas_como_host) || 0,
        llamadasParticipadas: parseInt(row.llamadas_como_participante) || 0,
        tiempoTotalMinutos: parseFloat(row.tiempo_total_minutos) || 0,
        colaboracionesUnicas: parseInt(row.colaboraciones_unicas) || 0
      }));
    } catch (error) {
      console.error('Error ejecutando getColaboracion:', error);
      throw error;
    }
  }

  // Reporte de Productividad usando SP
  async getProductividad(
    usuarioId: number,
    fechaInicio: Date,
    fechaFin: Date,
    agrupacion: 'dia' | 'semana' | 'mes' = 'semana'
  ): Promise<ProductividadData[]> {
    try {
      const { data, error } = await supabase.rpc('get_productividad', {
        usuario_id_param: usuarioId,
        fecha_inicio_param: fechaInicio.toISOString().split('T')[0],
        fecha_fin_param: fechaFin.toISOString().split('T')[0]
      });

      if (error) {
        console.error('Error en get_productividad:', error);
        throw new Error(`Error al obtener datos de productividad: ${error.message}`);
      }

      // Mapear respuesta del SP a nuestra interface
      return (data || []).map((row: any) => ({
        periodo: row.fecha, // Usando fecha como periodo
        reunionesProgramadas: parseInt(row.llamadas_completadas) + parseInt(row.llamadas_canceladas) || 0,
        reunionesCompletadas: parseInt(row.llamadas_completadas) || 0,
        tasaCompletitud: parseFloat(row.tasa_completacion) || 0,
        tiempoEfectivo: parseFloat(row.duracion_promedio) || 0,
        tiempoPromedioPorReunion: parseFloat(row.duracion_promedio) || 0
      }));
    } catch (error) {
      console.error('Error ejecutando getProductividad:', error);
      throw error;
    }
  }

  // Estadísticas generales usando SP
  async getEstadisticasGenerales(
    usuarioId: number,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<EstadisticasGenerales> {
    try {
      const { data, error } = await supabase.rpc('get_estadisticas_generales', {
        usuario_id_param: usuarioId,
        fecha_inicio_param: fechaInicio.toISOString().split('T')[0],
        fecha_fin_param: fechaFin.toISOString().split('T')[0]
      });

      if (error) {
        console.error('Error en get_estadisticas_generales:', error);
        throw new Error(`Error al obtener estadísticas generales: ${error.message}`);
      }

      // La respuesta debe ser un objeto único
      const row = data && data.length > 0 ? data[0] : {};

      return {
        totalLlamadas: parseInt(row.total_llamadas) || 0,
        totalMinutos: parseFloat(row.duracion_promedio) * parseInt(row.total_llamadas) || 0,
        participantesUnicos: parseInt(row.total_usuarios) || 0,
        promedioParticipantesPorLlamada: parseInt(row.total_usuarios) / Math.max(parseInt(row.total_llamadas), 1) || 0,
        llamadasCompletadas: Math.round((parseInt(row.total_llamadas) * parseFloat(row.tasa_completacion)) / 100) || 0,
        tasaExito: parseFloat(row.tasa_completacion) || 0
      };
    } catch (error) {
      console.error('Error ejecutando getEstadisticasGenerales:', error);
      throw error;
    }
  }
}