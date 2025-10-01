import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Interfaz para contactos favoritos
interface ContactoFavorito {
  usuarioId: number;
  nombre: string;
  apellido: string;
  esFavorito: boolean;
  fechaAgregado: string;
  tiempoTotalLlamadas: number;
  llamadasRecientes: number;
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

    // Llamar al stored procedure para contactos favoritos
    const { data, error } = await supabase.rpc('get_contactos_favoritos', {
      usuario_id_param: usuarioId
    });

    if (error) {
      console.error('Error en get_contactos_favoritos:', error);
      return NextResponse.json({ error: 'Error al cargar contactos favoritos' }, { status: 500 });
    }

    // Transformar los datos al formato esperado
    const contactosFavoritos: ContactoFavorito[] = (data || []).map((item: any) => ({
      usuarioId: item.usuario_id,
      nombre: item.nombre,
      apellido: item.apellido,
      esFavorito: item.es_favorito,
      fechaAgregado: item.fecha_agregado,
      tiempoTotalLlamadas: Number(item.tiempo_total_llamadas || 0),
      llamadasRecientes: Number(item.llamadas_recientes || 0)
    }));

    return NextResponse.json(contactosFavoritos);
    
  } catch (err) {
    console.error('Error en API reports/contactos-favoritos:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}