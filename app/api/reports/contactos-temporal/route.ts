import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Interfaz para contactos temporal
interface ContactosTemporal {
  periodo: string;
  contactosAgregados: number;
  solicitudesEnviadas: number;
  solicitudesRecibidas: number;
  solicitudesAceptadas: number;
  solicitudesRechazadas: number;
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

    // Llamar al stored procedure para contactos temporal
    const { data, error } = await supabase.rpc('get_contactos_temporal', {
      usuario_id_param: usuarioId,
      fecha_inicio_param: fechaInicio,
      fecha_fin_param: fechaFin
    });

    if (error) {
      console.error('Error en get_contactos_temporal:', error);
      return NextResponse.json({ error: 'Error al cargar contactos temporal' }, { status: 500 });
    }

    // Transformar los datos al formato esperado
    const contactosTemporal: ContactosTemporal[] = (data || []).map((item: any) => ({
      periodo: item.periodo,
      contactosAgregados: Number(item.contactos_agregados || 0),
      solicitudesEnviadas: Number(item.solicitudes_enviadas || 0),
      solicitudesRecibidas: Number(item.solicitudes_recibidas || 0),
      solicitudesAceptadas: Number(item.solicitudes_aceptadas || 0),
      solicitudesRechazadas: Number(item.solicitudes_rechazadas || 0)
    }));

    return NextResponse.json(contactosTemporal);
    
  } catch (err) {
    console.error('Error en API reports/contactos-temporal:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}