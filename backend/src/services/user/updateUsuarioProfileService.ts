import { supabaseAdmin } from "../../lib/supabase";

export async function updateUsuarioProfileService(idUsuario: number, nombre: string, apellido: string, idioma: number, apodo: string, pais?: string) {
  try {
    console.log("🔄 Iniciando actualización de usuario:", { idUsuario, nombre, apellido, idioma, apodo, pais });
    
    // Incluir el campo 'pais' ahora que existe la columna
    const { data, error } = await supabaseAdmin
      .from('Usuario')
      .update({
        nombre: nombre,
        apellido: apellido,
        id_idioma: idioma,
        apodo: apodo,
        pais: pais || null
      })
      .eq('id', idUsuario)
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      throw new Error(`Error de Supabase: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Usuario con ID ${idUsuario} no encontrado`);
    }

    console.log("✅ Usuario actualizado correctamente:", data[0]);
    return data[0]; 
  } catch (error) {
    console.error("❌ Error en updateUsuarioProfileService:", error);
    throw error;
  }
}