import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Interfaz para estadísticas de eventos
interface EventosEstadisticas {
  totalOrganizados: number;
  totalInvitacionesRecibidas: number;
  totalConfirmados: number;
  totalRechazados: number;
  totalPendientes: number;
  tasaConfirmacion: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener ID del usuario desde la tabla Usuario
    const { data: userData, error: userError } = await supabase
      .from('Usuario')
      .select('id')
      .eq('User_id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const usuarioId = userData.id;

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Faltan parámetros de fecha' }, { status: 400 });
    }

    // Llamar al stored procedure para estadísticas de eventos
    const { data, error } = await supabase.rpc('get_eventos_estadisticas', {
      usuario_id_param: usuarioId,
      fecha_inicio_param: fechaInicio,
      fecha_fin_param: fechaFin
    });

    if (error) {
      console.error('Error en get_eventos_estadisticas:', error);
      return NextResponse.json({ error: 'Error al cargar estadísticas de eventos' }, { status: 500 });
    }

    // Transformar los datos al formato esperado
    const estadisticas: EventosEstadisticas = {
      totalOrganizados: Number(data[0]?.total_organizados || 0),
      totalInvitacionesRecibidas: Number(data[0]?.total_invitaciones_recibidas || 0),
      totalConfirmados: Number(data[0]?.total_confirmados || 0),
      totalRechazados: Number(data[0]?.total_rechazados || 0),
      totalPendientes: Number(data[0]?.total_pendientes || 0),
      tasaConfirmacion: Number(data[0]?.tasa_confirmacion || 0)
    };

    return NextResponse.json(estadisticas);
    
  } catch (err) {
    console.error('Error en API reports/eventos-estadisticas:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}