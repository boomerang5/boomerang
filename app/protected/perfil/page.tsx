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

  // Idioma
  id_idioma?: number | null;
  nombre_idioma?: string | null;

  // Género
  id_genero?: number | null;
  nombre_genero?: string | null;

  // Otros
  fecha_nacimiento?: string | null; // YYYY-MM-DD
  path_foto_perfil?: string | null;
};

export default function VerPerfilPage() {
  const supabase = useSupabaseClient();
  const pathname = usePathname();

  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Reemplaza íconos de Feather al montar y en cada cambio de ruta
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

        // 1) uuid -> id
        const r1 = await fetch(`/api/users/uuid/${uuid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!r1.ok) {
          const msg = await readErrorMessage(r1);
          throw new Error(`No se pudo resolver tu usuario. ${msg}`);
        }
        const j1 = await r1.json();
        const id = Number((Array.isArray(j1) ? j1[0]?.id : j1?.id) ?? j1);
        if (!id) throw new Error('No se pudo resolver el ID del usuario');

        // 2) id -> datos completos
        const r2 = await fetch(`/api/users/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!r2.ok) {
          const msg = await readErrorMessage(r2);
          throw new Error(`No se pudieron cargar los datos del perfil. ${msg}`);
        }
        const raw = await r2.json();

        setUser({
          id: raw?.id ?? null,
          user_id: uuid,
          nombre: raw?.nombre ?? null,
          apellido: raw?.apellido ?? null,
          apodo: raw?.apodo ?? null,
          mail: raw?.mail ?? raw?.email ?? null,
          pais: raw?.pais ?? null,

          id_idioma: typeof raw?.id_idioma === 'number' ? raw.id_idioma : null,
          nombre_idioma: raw?.nombre_idioma ?? null,

          id_genero: typeof raw?.id_genero === 'number' ? raw.id_genero : null,
          nombre_genero: raw?.nombre_genero ?? null,

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

  const avatarSrc =
    user?.path_foto_perfil
      ? buildAvatarUrl(user.path_foto_perfil)
      : '/avatar-placeholder.png';

  return (
    <main className="flex-1 mx-auto max-w-6xl p-6">
      {/* Header mejorado */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: '#EA580C' }}>
            Mi perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Información de tu cuenta</p>
        </div>
        <Link
          href="/protected/perfil/editar"
          className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-md font-semibold hover:brightness-105 transition flex items-center gap-2"
        >
          <i data-feather="edit-3" className="w-4 h-4" />
          Editar perfil
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600">Cargando perfil...</span>
        </div>
      ) : err ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <i data-feather="alert-circle" className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-800 dark:text-red-200">Error al cargar el perfil</h3>
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">
            Ocurrió un error al cargar tu información.
          </p>
          <details className="text-xs text-red-600 dark:text-red-400">
            <summary className="cursor-pointer hover:underline">Detalles técnicos</summary>
            <pre className="whitespace-pre-wrap mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded">{err}</pre>
          </details>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Avatar y info principal */}
          <div className="lg:col-span-1">
            <ProfileAvatarCard user={user} />
          </div>

          {/* Información detallada */}
          <div className="lg:col-span-2">
            <ProfileInfoCard user={user} />
          </div>
        </div>
      )}

    </main>
  );
}

/* Componentes mejorados */
function ProfileAvatarCard({ user }: { user: Usuario | null }) {
  const getInitials = (nombre?: string | null, apellido?: string | null) => {
    const n = (nombre ?? "").trim();
    const a = (apellido ?? "").trim();
    if (n || a) {
      const i1 = n ? n[0] : "";
      const i2 = a ? a[0] : "";
      return (i1 + i2).toUpperCase() || "?";
    }
    return "?";
  };

  const initials = getInitials(user?.nombre, user?.apellido);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
      <div className="text-center">
        {/* Avatar con iniciales */}
        <div className="relative inline-block mb-4">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white dark:border-gray-800">
            {initials}
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
            <i data-feather="check" className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Nombre completo */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {user?.nombre} {user?.apellido}
        </h2>
        
        {/* Apodo si existe */}
        {user?.apodo && (
          <p className="text-orange-600 dark:text-orange-400 font-medium mb-2">
            @{user.apodo}
          </p>
        )}

        {/* Email completo */}
        <p className="text-gray-600 dark:text-gray-400 text-sm break-all">
          {user?.mail || 'Sin email'}
        </p>

        {/* Estado de cuenta */}
        <div className="mt-4 flex items-center justify-center gap-2 px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
          <i data-feather="shield-check" className="w-3 h-3" />
          Cuenta verificada
        </div>
      </div>
    </div>
  );
}

function ProfileInfoCard({ user }: { user: Usuario | null }) {
  return (
    <div className="space-y-6">
      {/* Información personal */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Información personal</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <InfoField 
            icon="user" 
            label="Nombre" 
            value={user?.nombre} 
          />
          <InfoField 
            icon="user" 
            label="Apellido" 
            value={user?.apellido} 
          />
          <InfoField 
            icon="at-sign" 
            label="Apodo" 
            value={user?.apodo} 
          />
          <InfoField 
            icon="globe" 
            label="País" 
            value={user?.pais} 
          />
          <InfoField 
            icon="mail" 
            label="Email" 
            value={user?.mail} 
            fullWidth 
          />
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Información adicional</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <InfoField 
            icon="globe" 
            label="Idioma" 
            value={user?.nombre_idioma} 
          />
          <InfoField 
            icon="users" 
            label="Género" 
            value={user?.nombre_genero ?? mapGenero(user?.id_genero)} 
          />
          <InfoField 
            icon="calendar" 
            label="Fecha de nacimiento" 
            value={fmtDate(user?.fecha_nacimiento)} 
            fullWidth 
          />
        </div>
      </div>
    </div>
  );
}

function InfoField({ 
  icon, 
  label, 
  value, 
  fullWidth = false 
}: { 
  icon: string; 
  label: string; 
  value?: string | null; 
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className={`text-gray-900 dark:text-white font-semibold ${fullWidth ? 'break-all' : 'truncate'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

/* Domain helpers */
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
  // Evitar el problema de parsear 'YYYY-MM-DD' como UTC y que al convertir a
  // local timezone termine mostrando el día anterior. Si recibimos el formato
  // exacto 'YYYY-MM-DD', construimos la fecha usando el constructor local
  // (año, mesIndex, día) para mantener la misma fecha en la zona del usuario.
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(iso);
  if (m) {
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const d = new Date(y, mm - 1, dd); // constructor local
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
    return iso;
  }
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  } catch {
    return iso;
  }
}

/** Construye URL pública si te llega un path de Storage como 'avatars/uuid.png' */
function buildAvatarUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path; // ya es URL completa
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  return `${base}/storage/v1/object/public/${path}`;
}

/** Lee errores sin volcar HTML enorme en la UI */
async function readErrorMessage(res: Response) {
  const ct = res.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const j = await res.json();
      return j?.message || j?.error || `Error ${res.status}`;
    } else {
      const t = await res.text();
      const snippet = t.replace(/\s+/g, ' ').slice(0, 200);
      return `Error ${res.status} ${res.statusText} – ${snippet}${t.length > 200 ? '…' : ''}`;
    }
  } catch {
    return `Error ${res.status} ${res.statusText}`;
  }
}
