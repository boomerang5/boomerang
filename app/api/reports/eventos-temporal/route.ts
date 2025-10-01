import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Interfaz para eventos temporal
interface EventosTemporal {
  periodo: string;
  eventosOrganizados: number;
  eventosInvitado: number;
  eventosConfirmados: number;
  eventosRechazados: number;
  eventosPendientes: number;
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

    // Llamar al stored procedure para eventos temporal
    const { data, error } = await supabase.rpc('get_eventos_temporal', {
      usuario_id_param: usuarioId,
      fecha_inicio_param: fechaInicio,
      fecha_fin_param: fechaFin
    });

    if (error) {
      console.error('Error en get_eventos_temporal:', error);
      return NextResponse.json({ error: 'Error al cargar eventos temporal' }, { status: 500 });
    }

    // Transformar los datos al formato esperado
    const eventosTemporal: EventosTemporal[] = (data || []).map((item: any) => ({
      periodo: item.periodo,
      eventosOrganizados: Number(item.eventos_organizados || 0),
      eventosInvitado: Number(item.eventos_invitado || 0),
      eventosConfirmados: Number(item.eventos_confirmados || 0),
      eventosRechazados: Number(item.eventos_rechazados || 0),
      eventosPendientes: Number(item.eventos_pendientes || 0)
    }));

    return NextResponse.json(eventosTemporal);
    
  } catch (err) {
    console.error('Error en API reports/eventos-temporal:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}