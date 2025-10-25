import { supabaseAdmin } from "../../lib/supabase";

export async function updateUsuarioProfileService(
  idUsuario: number, 
  nombre: string, 
  apellido: string, 
  idioma: number, 
  apodo: string, 
  pais?: string, 
  genero?: number, 
  fecha_nacimiento?: string) {
  
  try {
    console.log("🔄 Iniciando actualización de usuario:", { idUsuario, nombre, apellido, idioma, apodo, pais, genero, fecha_nacimiento });

    const updateFields: Record<string, any> = {
      nombre,
      apellido,
      id_idioma: idioma,
      apodo,
      pais: pais ?? null,
    };

    if (genero !== undefined) updateFields.id_genero = genero;         // <--- NUEVO
    if (fecha_nacimiento !== undefined) updateFields.fecha_nacimiento = fecha_nacimiento; // <--- opcional
    
    const { data, error } = await supabaseAdmin
      .from('Usuario')
      .update({updateFields})
      .eq('id', idUsuario)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw new Error(`Error de Supabase: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Usuario con ID ${idUsuario} no encontrado`);
    }

    console.log("Usuario actualizado correctamente:", data[0]);
    return data[0]; 
  } catch (error) {
    console.error("Error en updateUsuarioProfileService:", error);
    throw error;
  }
}