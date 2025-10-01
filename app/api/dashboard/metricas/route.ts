import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Interfaz para las métricas del dashboard
interface DashboardMetricas {
  llamadasHoy: number;
  llamadasSemana: number;
  tiempoTotalHoy: number;
  tiempoPromedioLlamada: number;
  llamadasConectadas: number;
  llamadasNoConectadas: number;
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

    // Llamar al stored procedure para métricas del dashboard
    const { data, error } = await supabase.rpc('get_dashboard_metricas', {
      usuario_id_param: usuarioId
    });

    if (error) {
      console.error('Error en get_dashboard_metricas:', error);
      return NextResponse.json({ error: 'Error al cargar métricas' }, { status: 500 });
    }

    // Transformar los datos al formato esperado
    const metricas: DashboardMetricas = {
      llamadasHoy: Number(data[0]?.llamadas_hoy || 0),
      llamadasSemana: Number(data[0]?.llamadas_semana || 0),
      tiempoTotalHoy: Number(data[0]?.tiempo_total_hoy || 0),
      tiempoPromedioLlamada: Number(data[0]?.tiempo_promedio_llamada || 0),
      llamadasConectadas: Number(data[0]?.llamadas_conectadas || 0),
      llamadasNoConectadas: Number(data[0]?.llamadas_no_conectadas || 0)
    };

    return NextResponse.json(metricas);
    
  } catch (err) {
    console.error('Error en API dashboard/metricas:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}