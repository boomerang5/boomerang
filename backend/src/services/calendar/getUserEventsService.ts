import supabase from "../../lib/supabase";

export async function getUserEventsService(
  idUsuario: number,
  fechaDesde?: Date,
  fechaHasta?: Date
) {
  
  // Primero obtenemos los eventos usando la función RPC original
  const { data: eventos, error } = await supabase.rpc("get_user_events", {
    p_id_usuario: idUsuario,
    p_fecha_desde: fechaDesde ? fechaDesde.toISOString() : null,
    p_fecha_hasta: fechaHasta ? fechaHasta.toISOString() : null,
  });

  if (error) {
    console.error("❌ Error al ejecutar la función:", error);
    throw new Error(error.message);
  }

  if (!eventos || eventos.length === 0) {
    return eventos;
  }


  // Ahora agregamos la información de confirmación para cada evento
  const eventosConConfirmacion = await Promise.all(
    eventos.map(async (evento: any) => {
      try {
        // Si el usuario es el creador, siempre está confirmado
        if (evento.creado_por === idUsuario) {
          return {
            ...evento,
            mi_confirmacion: 'confirmado'
          };
        }

        // Si es invitado, obtener su estado de confirmación usando el campo original
        const { data: confirmacion, error: confirmError } = await supabase
          .from('EventoInvitado')
          .select('confirmado')
          .eq('id_evento', evento.id)
          .eq('id_usuario', idUsuario)
          .single();

        if (confirmError || !confirmacion) {
          return {
            ...evento,
            mi_confirmacion: 'pendiente'
          };
        }

        // Mapear el valor booleano a string (sistema original)
        let estadoConfirmacion = 'pendiente';
        if (confirmacion.confirmado === true) {
          estadoConfirmacion = 'confirmado';
        } else if (confirmacion.confirmado === false) {
          estadoConfirmacion = 'rechazado';
        }


        return {
          ...evento,
          mi_confirmacion: estadoConfirmacion
        };
      } catch (err) {
        // En caso de error, marcamos como pendiente por defecto
        return {
          ...evento,
          mi_confirmacion: 'pendiente'
        };
      }
    })
  );

  return eventosConConfirmacion;
}

