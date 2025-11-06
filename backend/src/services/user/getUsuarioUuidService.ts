import supabase from "../../lib/supabase";

export async function getUsuarioUuid(uuidUsuario: string) {
  // Buscar directamente por User_id
  const { data, error } = await supabase
    .from('Usuario')
    .select('id, nombre, apellido, apodo, mail, User_id')
    .eq('User_id', uuidUsuario)
    .single();

  if (error) {
    console.error('❌ Error al buscar usuario por UUID:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Devolver en formato array para compatibilidad
  return [data];
}