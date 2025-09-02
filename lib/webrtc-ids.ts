import type { SupabaseClient } from '@supabase/supabase-js'

export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

/** Acepta peer numérico o UUID y devuelve siempre el UUID (Usuario.User_id) */
export async function resolvePeerUuid(sb: SupabaseClient, peer: string | number): Promise<string> {
  const s = String(peer).trim()
  if (isUuid(s)) return s
  if (!/^\d+$/.test(s)) throw new Error('Peer inválido (ni UUID ni ID numérico)')

  const { data, error } = await sb
    .from('Usuario')
    .select('User_id')
    .eq('id', Number(s))
    .maybeSingle()

  if (error) throw error
  if (!data?.User_id) throw new Error('No se encontró el UUID para ese ID numérico')
  return data.User_id as string
}
