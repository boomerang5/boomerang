'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// @ts-ignore - feather no trae tipos
import feather from 'feather-icons';

type Perfil = {
  id?: number | null;
  user_id?: string | null; // uuid (no se envía en PUT)
  nombre?: string | null;
  apellido?: string | null;
  apodo?: string | null;
  fecha_nacimiento?: string | null; // solo UI
  id_genero?: number | null;        // solo UI
  idioma?: number | null;           // requerido en PUT
  pais?: string | null;             // solo UI
  mail?: string | null;             // solo UI
  path_foto_perfil?: string | null; // solo UI
};

interface Genero {
  id: number;
  nombregenero: string;
}

interface Idioma {
  id_idioma: number;
  nombre_idioma: string;
  codigo_iso: string;
}

export default function EditarPerfilPage() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  
  // Estados para géneros y idiomas dinámicos
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [loadingGeneros, setLoadingGeneros] = useState(true);
  const [idiomas, setIdiomas] = useState<Idioma[]>([]);
  const [loadingIdiomas, setLoadingIdiomas] = useState(true);

  // Render de íconos Feather
  useEffect(() => {
    feather.replace();
  }, []);

  // Cargar géneros dinámicamente desde el stored procedure
  const loadGeneros = async () => {
    try {
      setLoadingGeneros(true);
      const response = await fetch('/api/users/generos', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneros(data);
      } else {
        console.error('❌ Error cargando géneros:', await response.text());
        // Fallback con géneros hardcodeados
        const fallbackGeneros = [
          { id: 1, nombregenero: 'Masculino' },
          { id: 2, nombregenero: 'Femenino' },
          { id: 3, nombregenero: 'Prefiero no decirlo' }
        ];
        setGeneros(fallbackGeneros);
      }
    } catch (error) {
      console.error('❌ Error cargando géneros:', error);
      // Fallback con géneros hardcodeados
      const fallbackGeneros = [
        { id: 1, nombregenero: 'Masculino' },
        { id: 2, nombregenero: 'Femenino' },
        { id: 3, nombregenero: 'Prefiero no decirlo' }
      ];
      setGeneros(fallbackGeneros);
    } finally {
      setLoadingGeneros(false);
    }
  };

  // Cargar idiomas dinámicamente desde el stored procedure
  const loadIdiomas = async () => {
    try {
      setLoadingIdiomas(true);
      const response = await fetch('/api/users/idiomas', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIdiomas(data);
      } else {
        console.error('❌ Error cargando idiomas:', await response.text());
        // Fallback con idiomas hardcodeados
        const fallbackIdiomas = [
          { id_idioma: 1, nombre_idioma: 'Español', codigo_iso: 'es-ES' },
          { id_idioma: 2, nombre_idioma: 'Inglés', codigo_iso: 'en-US' }
        ];
        setIdiomas(fallbackIdiomas);
      }
    } catch (error) {
      console.error('❌ Error cargando idiomas:', error);
      // Fallback con idiomas hardcodeados
      const fallbackIdiomas = [
        { id_idioma: 1, nombre_idioma: 'Español', codigo_iso: 'es-ES' },
        { id_idioma: 2, nombre_idioma: 'Inglés', codigo_iso: 'en-US' }
      ];
      setIdiomas(fallbackIdiomas);
    } finally {
      setLoadingIdiomas(false);
    }
  };

  // Cargar datos actuales (via proxy interno)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar géneros e idiomas primero
        await Promise.all([loadGeneros(), loadIdiomas()]);
        
        const { data: sess } = await supabase.auth.getSession();
        const uuid = sess.session?.user?.id;
        if (!uuid) throw new Error('Sin sesión');
        const token = sess.session?.access_token;

        // 1) uuid -> id
        const r1 = await fetch(`/api/users/uuid/${uuid}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        if (!r1.ok) throw new Error(await r1.text());
        const j1 = await r1.json();
        const id = Number((Array.isArray(j1) ? j1[0]?.id : j1?.id) ?? j1);
        if (!id) throw new Error('No se pudo resolver el ID del usuario');

        // 2) id -> datos para completar el form
        const r2 = await fetch(`/api/users/${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        if (!r2.ok) throw new Error(await r2.text());
        const raw = await r2.json();

        setPerfil({
          id,
          user_id: uuid,
          nombre: raw?.nombre ?? '',
          apellido: raw?.apellido ?? '',
          apodo: raw?.apodo ?? '',
          mail: raw?.mail ?? '',
          pais: raw?.pais ?? '',
          id_genero: typeof raw?.id_genero === 'number' ? raw.id_genero : null,
          idioma: typeof raw?.id_idioma === 'number' ? raw.id_idioma : 1,
          fecha_nacimiento: raw?.fecha_nacimiento ?? '',
          path_foto_perfil: raw?.path_foto_perfil ?? null,
        });
      } catch (e: any) {
        setMsg(e?.message ?? 'Error cargando perfil');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [supabase]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSaving(true);
    setMsg(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      // Construir payload usando las claves que el backend espera.
      // Backend /api/users/update requiere: id, nombre, apellido, apodo, pais, genero, fecha_nacimiento, idioma
      const payload = {
        id: Number(perfil.id),                                  // requerido
        nombre: (perfil.nombre ?? '').trim(),                   // requerido
        apellido: (perfil.apellido ?? '').trim(),               // requerido
        idioma: Number(perfil.idioma ?? 1),                     // requerido (número)
        apodo: (perfil.apodo ?? '').trim(),                     // requerido
        pais: (perfil.pais ?? '').trim(),                       // requerido por el backend
        // El frontend mantiene `id_genero` en el state; el backend espera `genero`.
        genero: perfil.id_genero != null ? Number(perfil.id_genero) : null,
        // Fecha en formato yyyy-mm-dd (el input date ya lo provee así)
        fecha_nacimiento: perfil.fecha_nacimiento ?? null,
      };

      // Validación rápida antes de enviar (coincide con lo que exige el backend)
      if (!payload.id || !payload.nombre || !payload.apellido || !payload.apodo) {
        setMsg('Completá nombre, apellido y apodo.'); setSaving(false); return;
      }
      if (!payload.pais) { setMsg('Completá el país.'); setSaving(false); return; }
      if (payload.genero == null) { setMsg('Seleccioná el género.'); setSaving(false); return; }
      if (!payload.fecha_nacimiento) { setMsg('Completá la fecha de nacimiento.'); setSaving(false); return; }

      const res = await fetch(`/api/perfil/update`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `Error ${res.status}`);
      setMsg('¡Guardado!');
      
      // Redirigir a la página de perfil después de 1.5 segundos
      setTimeout(() => {
        router.push('/protected/perfil');
      }, 1500);
    } catch (e: any) {
      setMsg(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <main className="flex-1 pl-2 pr-6 py-6">Cargando…</main>
  );

  return (
    <main className="flex-1 mx-auto max-w-4xl pl-2 pr-6 py-6">
      {/* Header mejorado */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: '#EA580C' }}>
          Editar perfil
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Actualizá tus datos personales</p>
      </div>

      {!perfil ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <i data-feather="alert-circle" className="w-5 h-5 text-red-500" />
            <p className="text-red-700 dark:text-red-300">{msg ?? 'No se pudo cargar el perfil.'}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <form onSubmit={onSave} className="p-8">
            {/* Grid de campos */}
            <div className="grid gap-6 md:grid-cols-2">
              <Input 
                label="Nombre" 
                value={perfil.nombre ?? ''} 
                onChange={(v) => setPerfil(p => p ? { ...p, nombre: v } : p)} 
              />
              <Input 
                label="Apellido" 
                value={perfil.apellido ?? ''} 
                onChange={(v) => setPerfil(p => p ? { ...p, apellido: v } : p)} 
              />
              <Input 
                label="Apodo" 
                value={perfil.apodo ?? ''} 
                onChange={(v) => setPerfil(p => p ? { ...p, apodo: v } : p)} 
              />
              <Input 
                label="Email" 
                type="email" 
                value={perfil.mail ?? ''} 
                onChange={(v) => setPerfil(p => p ? { ...p, mail: v } : p)} 
              />
              <Input 
                label="País" 
                value={perfil.pais ?? ''} 
                onChange={(v) => setPerfil(p => p ? { ...p, pais: v } : p)} 
              />
              <Select
                label="Género"
                value={String(perfil.id_genero ?? '')}
                onChange={(v) => setPerfil(p => p ? { ...p, id_genero: v ? Number(v) : null } : p)}
                options={(() => {
                  return [
                    { label: 'Seleccionar…', value: '' },
                    ...generos.map(g => ({ 
                      label: g.nombregenero, 
                      value: String(g.id) 
                    }))
                  ];
                })()}
              />
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={toISODateUI(perfil.fecha_nacimiento) ?? ''}
                onChange={(v) => setPerfil(p => p ? { ...p, fecha_nacimiento: v || null } : p)}
              />
              <Select
                label="Idioma"
                value={String(perfil.idioma ?? 1)}
                onChange={(v) => setPerfil(p => p ? { ...p, idioma: v ? Number(v) : 1 } : p)}
                options={(() => {
                  return idiomas.map(i => ({ 
                    label: i.nombre_idioma, 
                    value: String(i.id_idioma) 
                  }));
                })()}
              />
            </div>

            {/* Mensaje de estado */}
            {msg && (
              <div className={`mt-6 p-4 rounded-xl ${
                msg.includes('¡Guardado!') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  <i data-feather={msg.includes('¡Guardado!') ? 'check-circle' : 'alert-circle'} className="w-4 h-4" />
                  {msg}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/protected/perfil"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <i data-feather="arrow-left" className="w-4 h-4" />
                Volver
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando…
                  </>
                ) : (
                  <>
                    <i data-feather="save" className="w-4 h-4" />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

/* UI helpers */
function Input({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        type={type}
        className="w-full rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/20 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-600 transition-all duration-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Ingresa tu ${label.toLowerCase()}`}
      />
    </label>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <select
        className="w-full rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/20 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400 dark:focus:border-orange-600 transition-all duration-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/* Data helpers */
function toISODateUI(v?: string | null): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
