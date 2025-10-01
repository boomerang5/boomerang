import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Interfaz para los top contactos
interface TopContacto {
  usuarioId: number;
  nombre: string;
  apellido: string;
  tiempoTotalMinutos: number;
  totalLlamadas: number;
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
    const limite = parseInt(searchParams.get('limite') || '5');

    // Llamar al stored procedure para top contactos
    const { data, error } = await supabase.rpc('get_dashboard_top_contactos', {
      usuario_id_param: usuarioId,
      limite: limite
    });

    if (error) {
      console.error('Error en get_dashboard_top_contactos:', error);
      return NextResponse.json({ error: 'Error al cargar top contactos' }, { status: 500 });
    }

    // Transformar los datos al formato esperado
    const topContactos: TopContacto[] = (data || []).map((item: any) => ({
      usuarioId: item.usuario_id,
      nombre: item.nombre,
      apellido: item.apellido,
      tiempoTotalMinutos: Number(item.tiempo_total_minutos || 0),
      totalLlamadas: Number(item.total_llamadas || 0)
    }));

    return NextResponse.json(topContactos);
    
  } catch (err) {
    console.error('Error en API dashboard/top-contactos:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}