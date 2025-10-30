// src/services/llamada/getUserCallHistoryService.ts
import supabase from "../../lib/supabase";

export async function getUserCallHistoryService(
  idUsuario: number, 
  q?: string, 
  from?: string, 
  to?: string
) {
  try {
    
    const { data, error } = await supabase.rpc('get_llamadas_conectadas', {
      p_id_usuario: idUsuario
    });

    if (error) {
      console.error("❌ Error al ejecutar SP get_llamadas_conectadas:", error);
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

    
    // Agregar campos de fecha y hora separados
    const processedData = filteredData.map((llamada: any) => {
      const fechaInicio = new Date(llamada.fecha_inicio);
      
      // Usar fecha local para evitar problemas de zona horaria
      const year = fechaInicio.getFullYear();
      const month = String(fechaInicio.getMonth() + 1).padStart(2, '0');
      const day = String(fechaInicio.getDate()).padStart(2, '0');
      const hours = String(fechaInicio.getHours()).padStart(2, '0');
      const minutes = String(fechaInicio.getMinutes()).padStart(2, '0');
      
      return {
        ...llamada,
        fecha_solo: `${year}-${month}-${day}`, // YYYY-MM-DD en fecha local
        hora_solo: `${hours}:${minutes}` // HH:MM en hora local
      };
    });
    
    return processedData;
    
  } catch (err: any) {
    console.error("❌ Error inesperado en getUserCallHistoryService:", err);
    throw new Error(err.message || "Error interno del servidor");
  }
}
