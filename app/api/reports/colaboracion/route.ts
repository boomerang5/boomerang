import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

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

    const url = new URL(`${BACKEND_URL}/api/reports/colaboracion`);
    url.searchParams.set('id_usuario', userData.id.toString());
    url.searchParams.set('fechaInicio', fechaInicio);
    url.searchParams.set('fechaFin', fechaFin);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Error del backend: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error en API route colaboracion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}