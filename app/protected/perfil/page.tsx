'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// @ts-ignore
import feather from 'feather-icons';

type Usuario = {
  id?: number | null;
  user_id?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  apodo?: string | null;
  mail?: string | null;
  pais?: string | null;
  id_genero?: number | null;
  fecha_nacimiento?: string | null; // YYYY-MM-DD
  path_foto_perfil?: string | null;
};

export default function VerPerfilPage() {
  const supabase = useSupabaseClient();
  const pathname = usePathname();

  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 👇 Reemplaza íconos de Feather al montar y en cada cambio de ruta
  useEffect(() => {
    feather.replace();
  }, [pathname]);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uuid = sess.session?.user?.id;
        if (!uuid) throw new Error('Sin sesión');
        const token = sess.session?.access_token;

        // Paso 1: uuid -> id
        const r1 = await fetch(`/api/users/uuid/${uuid}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        if (!r1.ok) throw new Error(await r1.text());
        const j1 = await r1.json();
        const id = Number((Array.isArray(j1) ? j1[0]?.id : j1?.id) ?? j1);
        if (!id) throw new Error('No se pudo resolver el ID del usuario');

        // Paso 2: id -> datos
        const r2 = await fetch(`/api/users/${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        if (!r2.ok) throw new Error(await r2.text());
        const raw = await r2.json();

        setUser({
          id: raw?.id ?? null,
          user_id: uuid,
          nombre: raw?.nombre ?? null,
          apellido: raw?.apellido ?? null,
          apodo: raw?.apodo ?? null,
          mail: raw?.mail ?? raw?.email ?? null,
          pais: raw?.pais ?? null,
          id_genero: typeof raw?.id_genero === 'number' ? raw.id_genero : null,
          fecha_nacimiento: toISO(raw?.fecha_nacimiento),
          path_foto_perfil: raw?.path_foto_perfil ?? raw?.avatar_url ?? null,
        });
      } catch (e: any) {
        setErr(e?.message ?? 'Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido */}
      <main className="flex-1 mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-3xl font-bold text-transparent">
              Mi perfil
            </h1>
            <p className="text-sm opacity-75">Información de tu cuenta</p>
          </div>
          <Link
            href="/protected/perfil/editar"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white shadow bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95"
          >
            Editar
          </Link>
        </div>

        {loading ? (
          <p>Cargando…</p>
        ) : err ? (
          <p className="text-red-500 text-sm">{err}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Información básica">
              <GridField label="Nombre" value={user?.nombre} />
              <GridField label="Apellido" value={user?.apellido} />
              <GridField label="Apodo" value={user?.apodo} />
              <GridField label="Email" value={user?.mail} />
              <GridField label="País" value={user?.pais} />
              <GridField label="Género" value={mapGenero(user?.id_genero)} />
              <GridField label="Nacimiento" value={fmtDate(user?.fecha_nacimiento)} />
            </Card>

            <Card title="Foto">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user?.path_foto_perfil || '/avatar-placeholder.png'}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full border border-white/10 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/avatar-placeholder.png';
                  }}
                />
                <div className="text-sm opacity-70">Podés actualizarla desde “Editar”.</div>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/protected"
            className="rounded-xl px-3 py-2 text-sm border border-white/10 bg-white/10 hover:bg-white/20"
          >
            Volver al dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

/* Sidebar component */
function Sidebar() {
  return (
    <aside className="w-20 shrink-0 border-r border-white/10 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
      <div className="flex flex-col items-center gap-6 mt-4">
        <Link href="/protected" title="Inicio">
          <i data-feather="home" className="w-5 h-5 text-orange-500 hover:text-orange-400" />
        </Link>
        <Link href="/protected/perfil" title="Perfil">
          <i data-feather="user" className="w-5 h-5 text-black dark:text-white" />
        </Link>
        <i data-feather="video" className="w-5 h-5 text-black dark:text-white" />
        <Link href="/protected/contactos" title="Contactos">
          <i data-feather="users" className="w-5 h-5 text-black dark:text-white" />
        </Link>
        <i data-feather="message-circle" className="w-5 h-5 text-black dark:text-white" />
        <i data-feather="calendar" className="w-5 h-5 text-black dark:text-white" />
      </div>
      <div className="flex flex-col items-center gap-5 mb-4">
        <i data-feather="help-circle" className="w-5 h-5 text-black dark:text-white" />
        <i data-feather="settings" className="w-5 h-5 text-black dark:text-white" />
      </div>
    </aside>
  );
}

/* helpers iguales a tu código */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 dark:bg-neutral-900/30 backdrop-blur p-5 shadow-md">
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </header>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}
function GridField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 dark:bg-neutral-900/40 p-3">
      <div className="text-xs opacity-60">{label}</div>
      <div className="truncate font-medium">{value ?? '—'}</div>
    </div>
  );
}
function mapGenero(id?: number | null) {
  if (id === 1) return 'Masculino';
  if (id === 2) return 'Femenino';
  if (id === 3) return 'Otro';
  return '—';
}
function toISO(v?: string | null): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}
