
import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RawContact = Record<string, any>;
export type Contact = {
  id: number | string;
  id_usuario_contacto?: number | string | null; // ID del usuario (para llamadas)
  nombre: string;
  apellido?: string | null;
  apodo?: string | null;
  estado?: 'available' | 'busy' | 'away' | string | null;
  foto?: string | null;
};

function mapContact(c: RawContact): Contact {
  return {
    id: c.id ?? c.id_usuario ?? c.user_id ?? String(Math.random()),
    id_usuario_contacto: c.id_usuario_contacto ?? c.id_usuario ?? c.user_id ?? null,
    nombre: c.nombre ?? c.first_name ?? c.name ?? '—',
    apellido: c.apellido ?? c.last_name ?? null,
    apodo: c.apodo ?? c.nickname ?? null,
    estado: c.estado ?? c.status ?? null,
    foto: c.path_foto_perfil ?? c.avatar_url ?? c.foto ?? null,
  };
}

export function useContacts(
  supabase: SupabaseClient<any, 'public', any>,
  idUsuario: number | null
) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (q?: string) => {
    if (!idUsuario) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token ?? '';
      if (!accessToken) throw new Error('Sin sesión');

      const params = new URLSearchParams();
      params.set('id_usuario', String(idUsuario));
      if (q) params.set('busqueda', q);

      const res = await fetch(`/api/contacts/misContactos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Error ${res.status}`);
      }

      const json = await res.json();
      const arr: RawContact[] = Array.isArray(json) ? json : json?.items ?? json?.data ?? [];
      console.log('🔍 Raw contacts from API:', arr);
      const mappedContacts = arr.map(mapContact);
      console.log('🔍 Mapped contacts:', mappedContacts);
      setContacts(mappedContacts);
    } catch (e) {
      setError('Error de red al obtener contactos.');
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial (sin búsqueda)
  useEffect(() => {
    if (idUsuario) refresh();
  }, [idUsuario]); // eslint-disable-line react-hooks/exhaustive-deps

  return { contacts, loading, error, refresh, setContacts };
}
