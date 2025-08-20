'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Link from 'next/link';
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

export default function EditarPerfilPage() {
  const supabase = useSupabaseClient();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Render de íconos Feather
  useEffect(() => {
    feather.replace();
  }, []);

  // Cargar datos actuales (via proxy interno)
  useEffect(() => {
    (async () => {
      try {
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
    })();
  }, [supabase]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSaving(true);
    setMsg(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      // 🔴 PUT /api/users/update SOLO acepta estas 5 claves:
      const payload = {
        id: Number(perfil.id),                                  // requerido
        nombre: (perfil.nombre ?? '').trim(),                   // requerido
        apellido: (perfil.apellido ?? '').trim(),               // requerido
        idioma: Number(perfil.idioma ?? 1),                     // requerido (número)
        apodo: (perfil.apodo ?? '').trim(),                     // requerido
      };

      // Validación rápida antes de enviar
      if (!payload.id || !payload.nombre || !payload.apellido || !payload.apodo) {
        setMsg('Completá nombre, apellido y apodo.'); setSaving(false); return;
      }

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
    } catch (e: any) {
      setMsg(e?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6">Cargando…</main>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido */}
      <main className="flex-1 mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-3xl font-bold text-transparent">
              Editar perfil
            </h1>
            <p className="text-sm opacity-75">Actualizá tus datos personales</p>
          </div>
          <Link
            href="/protected/perfil"
            className="rounded-xl px-3 py-2 border border-white/10 bg-white/10 hover:bg-white/20"
          >
            Volver
          </Link>
        </div>

        {!perfil ? (
          <p className="text-red-500 text-sm">{msg ?? 'No se pudo cargar el perfil.'}</p>
        ) : (
          <form
            onSubmit={onSave}
            className="space-y-6 rounded-2xl border border-white/10 bg-white/5 dark:bg-neutral-900/30 backdrop-blur p-5 shadow-md"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Nombre" value={perfil.nombre ?? ''} onChange={(v) => setPerfil(p => p ? { ...p, nombre: v } : p)} />
              <Input label="Apellido" value={perfil.apellido ?? ''} onChange={(v) => setPerfil(p => p ? { ...p, apellido: v } : p)} />
              <Input label="Apodo" value={perfil.apodo ?? ''} onChange={(v) => setPerfil(p => p ? { ...p, apodo: v } : p)} />
              <Input label="Email" type="email" value={perfil.mail ?? ''} onChange={(v) => setPerfil(p => p ? { ...p, mail: v } : p)} />
              <Input label="País" value={perfil.pais ?? ''} onChange={(v) => setPerfil(p => p ? { ...p, pais: v } : p)} />
              <Select
                label="Género (solo visual)"
                value={String(perfil.id_genero ?? '')}
                onChange={(v) => setPerfil(p => p ? { ...p, id_genero: v ? Number(v) : null } : p)}
                options={[
                  { label: 'Seleccionar…', value: '' },
                  { label: 'Masculino', value: '1' },
                  { label: 'Femenino', value: '2' },
                  { label: 'Otro', value: '3' },
                ]}
              />
              <Input
                label="Fecha de nacimiento (solo visual)"
                type="date"
                value={toISODateUI(perfil.fecha_nacimiento) ?? ''}
                onChange={(v) => setPerfil(p => p ? { ...p, fecha_nacimiento: v || null } : p)}
              />
              <Select
                label="Idioma (requerido por backend)"
                value={String(perfil.idioma ?? 1)}
                onChange={(v) => setPerfil(p => p ? { ...p, idioma: v ? Number(v) : 1 } : p)}
                options={[
                  { label: 'Español (1)', value: '1' },
                  { label: 'Inglés (2)', value: '2' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">{msg}</div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-4 py-2 font-semibold text-white shadow bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

/* Sidebar (igual a tu home) */
function Sidebar() {
  return (
    <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
      <div className="flex flex-col items-center gap-6 mt-4">
        <Link href="/protected">
          <i data-feather="home" className="text-orange-500 hover:text-orange-400 w-5 h-5" />
        </Link>

        {/* Usuario → Ver perfil (rutas en español) */}
        <Link href="/protected/perfil">
          <i data-feather="user" className="text-black dark:text-white w-5 h-5" />
        </Link>

        <i data-feather="video" className="text-black dark:text-white w-5 h-5" />
        <Link href="/protected/contactos">
          <i data-feather="users" className="text-black dark:text-white w-5 h-5" />
        </Link>
        <i data-feather="message-circle" className="text-black dark:text-white w-5 h-5" />
        <i data-feather="calendar" className="text-black dark:text-white w-5 h-5" />
      </div>
      <div className="flex flex-col items-center gap-5 mb-4">
        <i data-feather="help-circle" className="text-black dark:text-white w-5 h-5" />
        <i data-feather="settings" className="text-black dark:text-white w-5 h-5" />
      </div>
    </aside>
  );
}

/* UI helpers */
function Input({
  label, value, onChange, type = 'text',
}: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs opacity-70">{label}</span>
      <input
        type={type}
        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500/60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
      <span className="mb-1 block text-xs opacity-70">{label}</span>
      <select
        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500/60"
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
