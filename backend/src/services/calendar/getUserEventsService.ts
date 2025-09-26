import supabase from "../../lib/supabase";

export async function getUserEventsService(
  idUsuario: number,
  fechaDesde?: Date,
  fechaHasta?: Date
) {
  console.log(`🚀 getUserEventsService iniciado para usuario: ${idUsuario}`);
  
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
    console.log(`📭 No hay eventos para usuario ${idUsuario}`);
    return eventos;
  }

  console.log(`📚 Procesando ${eventos.length} eventos para usuario ${idUsuario}`);

  // Ahora agregamos la información de confirmación para cada evento
  const eventosConConfirmacion = await Promise.all(
    eventos.map(async (evento: any) => {
      console.log(`🔄 Procesando evento ${evento.id} (creado por: ${evento.creado_por})`);
      try {
        // Si el usuario es el creador, siempre está confirmado
        if (evento.creado_por === idUsuario) {
          console.log(`👑 Usuario ${idUsuario} es creador del evento ${evento.id}`);
          return {
            ...evento,
            mi_confirmacion: 'confirmado'
          };
        }

        // Si es invitado, obtener su estado de confirmación usando el campo original
        console.log(`🔍 Buscando confirmación para evento ${evento.id}, usuario ${idUsuario}`);
        const { data: confirmacion, error: confirmError } = await supabase
          .from('EventoInvitado')
          .select('confirmado')
          .eq('id_evento', evento.id)
          .eq('id_usuario', idUsuario)
          .single();

        console.log(`📊 Resultado confirmación evento ${evento.id}:`, {
          error: confirmError,
          data: confirmacion,
          confirmado: confirmacion?.confirmado
        });

        if (confirmError || !confirmacion) {
          console.log(`⚠️ No hay confirmación para evento ${evento.id}, marcando como pendiente`);
          // Si no existe registro de invitación, marcamos como pendiente
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

        console.log(`✅ Estado final evento ${evento.id}: ${estadoConfirmacion}`);

        return {
          ...evento,
          mi_confirmacion: estadoConfirmacion
        };
      } catch (err) {
        console.error(`❌ Error al obtener confirmación para evento ${evento.id}:`, err);
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

