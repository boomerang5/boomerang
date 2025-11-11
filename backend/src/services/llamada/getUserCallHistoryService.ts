// src/services/llamada/getUserCallHistoryService.ts
import supabase from "../../lib/supabase";

export async function getUserCallHistoryService(
  idUsuario: number, 
  q?: string, 
  from?: string, 
  to?: string
) {
  try {

    
    const { data, error } = await supabase.rpc('get_user_call_history', {
      p_id_usuario: idUsuario
    });

    if (error) {
      console.error("❌ Error al ejecutar SP get_user_call_history:", error);
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return [];
    }

    let filteredData = data;

    // Aplicar filtros en el backend
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredData = filteredData.filter((llamada: any) => {
        // Búsqueda en campos principales
        const matchTitle = llamada.titulo?.toLowerCase().includes(searchTerm);
        const matchDescription = llamada.descripcion?.toLowerCase().includes(searchTerm);
        const matchUserName = llamada.otro_usuario_nombre?.toLowerCase().includes(searchTerm);
        
        // Búsqueda en participantes (incluyendo apodo)
        const matchParticipants = llamada.participantes?.some((p: any) => 
          p.nombre?.toLowerCase().includes(searchTerm) ||
          p.apellido?.toLowerCase().includes(searchTerm) ||
          p.apodo?.toLowerCase().includes(searchTerm)
        );
        
        return matchTitle || matchDescription || matchUserName || matchParticipants;
      });
    }

    if (from) {
      const fromDate = new Date(from);
      filteredData = filteredData.filter((llamada: any) => 
        new Date(llamada.fecha_inicio) >= fromDate
      );
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día
      filteredData = filteredData.filter((llamada: any) => 
        new Date(llamada.fecha_inicio) <= toDate
      );
    }

    
    // Agregar campos de fecha y hora separados y calcular duración
    const processedData = filteredData.map((llamada: any) => {
      // Procesar fecha de forma simple - SIN conversiones de timezone
      // Extraer fecha directamente del string de PostgreSQL
      const fechaStr = String(llamada.fecha_inicio);
      const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
      
      let year, month, day, hours, minutes;
      if (match) {
        [, year, month, day, hours, minutes] = match;
      } else {
        // Fallback usando Date
        const fechaInicio = new Date(llamada.fecha_inicio);
        year = fechaInicio.getFullYear();
        month = String(fechaInicio.getMonth() + 1).padStart(2, '0');
        day = String(fechaInicio.getDate()).padStart(2, '0');
        hours = String(fechaInicio.getHours()).padStart(2, '0');
        minutes = String(fechaInicio.getMinutes()).padStart(2, '0');
      }
      
      // Calcular duración en segundos desde el interval de PostgreSQL
      let duracionSegundos = 0;
      if (llamada.duracion_calculada) {
        // El interval viene como string tipo "00:02:15" o como objeto
        const duracionStr = typeof llamada.duracion_calculada === 'string' 
          ? llamada.duracion_calculada 
          : llamada.duracion_calculada.toString();
        
        // Parsear el interval "HH:MM:SS"
        const match = duracionStr.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          const [, hours, minutes, seconds] = match;
          duracionSegundos = (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds);
        }
      }
      
      return {
        ...llamada,
        id_llamada: llamada.id, // Mapear id a id_llamada para compatibilidad
        duracion_segundos: duracionSegundos,
        fecha_solo: `${year}-${month}-${day}`, // YYYY-MM-DD en fecha local
        hora_solo: `${hours}:${minutes}`, // HH:MM en hora local
        // Asegurar compatibilidad con campos esperados por el frontend
        tiene_grabacion: false, // El nuevo SP no incluye este campo, default false
        tiene_transcripcion: false, // El nuevo SP no incluye este campo, default false
        estado: 'finalizada', // Asumir que llamadas en historial están finalizadas
        tipo: 'video' // Default tipo video
      };
    });
    
    return processedData;
    
  } catch (err: any) {
    console.error("❌ Error inesperado en getUserCallHistoryService:", err);
    throw new Error(err.message || "Error interno del servidor");
  }
}
