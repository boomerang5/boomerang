import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener el id numérico del usuario usando su UUID
    const { data: userData, error: userError } = await supabase
      .from('Usuario')
      .select('id')
      .eq('User_id', session.user.id)
      .maybeSingle();

    if (userError || !userData?.id) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'fechaInicio y fechaFin son requeridos' },
        { status: 400 }
      );
    }

    // Llamar directamente a los stored procedures de Supabase
    const [estadisticasRes, actividadRes] = await Promise.all([
      supabase.rpc('get_estadisticas_generales', {
        usuario_id_param: userData.id,
        fecha_inicio_param: fechaInicio,
        fecha_fin_param: fechaFin
      }),
      supabase.rpc('get_actividad_temporal', {
        usuario_id_param: userData.id,
        fecha_inicio_param: fechaInicio,
        fecha_fin_param: fechaFin
      })
    ]);

    if (estadisticasRes.error) {
      console.error('Error en get_estadisticas_generales:', estadisticasRes.error);
      return NextResponse.json(
        { error: 'Error al obtener estadísticas generales' },
        { status: 500 }
      );
    }

    if (actividadRes.error) {
      console.error('Error en get_actividad_temporal:', actividadRes.error);
      return NextResponse.json(
        { error: 'Error al obtener actividad temporal' },
        { status: 500 }
      );
    }

    // Formatear la respuesta como esperaba el frontend
    const estadisticasGenerales = estadisticasRes.data?.[0] || {
      total_llamadas: 0,
      total_minutos: 0,
      participantes_unicos: 0,
      promedio_participantes_por_llamada: 0,
      llamadas_completadas: 0,
      tasa_exito: 0
    };

    const actividadTemporal = actividadRes.data || [];

    const data = {
      estadisticasGenerales: {
        totalLlamadas: Number(estadisticasGenerales.total_llamadas || 0),
        totalMinutos: Number(estadisticasGenerales.total_minutos || 0),
        participantesUnicos: Number(estadisticasGenerales.participantes_unicos || 0),
        promedioParticipantesPorLlamada: Number(estadisticasGenerales.promedio_participantes_por_llamada || 0),
        llamadasCompletadas: Number(estadisticasGenerales.llamadas_completadas || 0),
        tasaExito: Number(estadisticasGenerales.tasa_exito || 0)
      },
      actividadTemporal: actividadTemporal.map((item: any) => ({
        periodo: item.periodo,
        totalLlamadas: Number(item.total_llamadas || 0),
        duracionTotal: Number(item.duracion_total || 0),
        duracionPromedio: Number(item.duracion_promedio || 0),
        participantesUnicos: Number(item.participantes_unicos || 0)
      }))
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error en API route resumen:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}