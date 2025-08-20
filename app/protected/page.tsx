'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
// @ts-ignore
import feather from 'feather-icons';
import Link from 'next/link';

type Perfil = { nombre: string | null; apellido: string | null; mail: string | null };

// ----- Tipos y helpers para Contactos (REST) -----
type RawContact = Record<string, any>;
type Contact = {
  id: number | string;
  nombre: string;
  apellido?: string | null;
  apodo?: string | null;
  estado?: 'available' | 'busy' | 'away' | string | null;
  foto?: string | null;
};

function stateDot(estado: string) {
  const color =
    /busy|ocupado/i.test(estado) ? 'bg-red-500' :
    /away|ausente/i.test(estado) ? 'bg-yellow-500' :
    'bg-green-500';
  return <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${color}`} />;
}
function labelEstado(estado: string) {
  if (/busy|ocupado/i.test(estado)) return 'Ocupado';
  if (/away|ausente/i.test(estado)) return 'Ausente';
  return 'Disponible';
}

// Debounce helper
function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setV(value), delay);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [value, delay]);
  return v;
}

export default function DashboardPage() {
  const supabase = useSupabaseClient();
  const [estado, setEstado] = useState('available');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  // ---- ID de usuario (para Swagger) ----
  const [idUsuario, setIdUsuario] = useState<number | null>(null);

  // ---- Estado Contactos (REST) ----
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const qDebounced = useDebouncedValue(q, 350);

  // Render de íconos
  useEffect(() => { feather.replace(); });

  // Perfil + resolvemos id_usuario desde Supabase (uuid -> Usuario.id)
  useEffect(() => {
    const fetchPerfil = async () => {
      setCargando(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUuid = sessionData?.session?.user?.id ?? null;

      const { data: uuidData } = await supabase.rpc('get_usuario_uuid');
      const uuid =
        (typeof uuidData === 'string' && uuidData) ||
        (uuidData && (uuidData as any).uuid) ||
        (uuidData && (uuidData as any).user_uuid) ||
        sessionUuid;

      if (!uuid) { setCargando(false); return; }

      const { data: row } = await supabase
        .from('Usuario')
        .select('id')
        .eq('User_id', uuid)
        .maybeSingle();

      if (!row?.id) { setCargando(false); return; }
      setIdUsuario(row.id);

      const { data: userData } = await supabase.rpc('get_user_by_id_usuario', { p_id_usuario: row.id });
      const u = Array.isArray(userData) ? userData[0] : userData;
      if (u) {
        setPerfil({ nombre: u.nombre ?? null, apellido: u.apellido ?? null, mail: u.mail ?? null });
      }
      setCargando(false);
    };
    fetchPerfil();
  }, [supabase]);

  // Contactos desde tu backend vía PROXY
  useEffect(() => {
    const ctrl = new AbortController();

    function mapContact(c: RawContact): Contact {
      return {
        id: c.id ?? c.id_usuario ?? c.user_id ?? String(Math.random()),
        nombre: c.nombre ?? c.first_name ?? c.name ?? '—',
        apellido: c.apellido ?? c.last_name ?? null,
        apodo: c.apodo ?? c.nickname ?? null,
        estado: c.estado ?? c.status ?? null,
        foto: c.path_foto_perfil ?? c.avatar_url ?? c.foto ?? null,
      };
    }

    (async () => {
      if (!idUsuario) {
        setContacts([]);
        setContactsLoading(false);
        return;
      }

      setContactsLoading(true);
      setContactsError(null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess.session?.access_token ?? '';
        if (!accessToken) throw new Error('Sin sesión');

        const params = new URLSearchParams();
        params.set('id_usuario', String(idUsuario));
        if (qDebounced) params.set('busqueda', qDebounced);

        const url = `/api/contactos/misContactos?` + params.toString();
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: ctrl.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Error ${res.status}`);
        }

        const json = await res.json();
        const arr: RawContact[] = Array.isArray(json) ? json : (json?.items ?? json?.data ?? []);
        setContacts(arr.map(mapContact));
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setContactsError('Error de red al obtener contactos.');
        }
      } finally {
        if (!ctrl.signal.aborted) setContactsLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [idUsuario, qDebounced, supabase]);

  const filteredContacts = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) => {
      const full = `${c.nombre ?? ''} ${c.apellido ?? ''} ${c.apodo ?? ''}`.toLowerCase();
      return full.includes(needle);
    });
  }, [contacts, q]);

  function handleCall(c: Contact)  { console.log('Llamar a', c); }
  function handleVideo(c: Contact) { console.log('Videollamar a', c); }
  function handleChat(c: Contact)  { console.log('Chat con', c); }

  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d]">
      {/* Sidebar */}
      <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
        <div className="flex flex-col items-center gap-6 mt-4">
          <Link href="/protected">
            <i data-feather="home" className="text-orange-500 hover:text-orange-400 w-5 h-5" />
          </Link>

          <Link href="/protected/perfil">
            <i data-feather="user" className="text-black dark:text-white w-5 h-5" />
          </Link>

          <i data-feather="video" className="text-black dark:text-white w-5 h-5" />

          <Link href="/protected/contactos">
            <i data-feather="users" className="text-black dark:text-white w-5 h-5" />
          </Link>

          {/* 👇 Chat con Link */}
          <Link href="/protected/chats" aria-label="Ir a chats">
            <i data-feather="message-circle" className="text-black dark:text-white w-5 h-5" />
          </Link>

          <i data-feather="calendar" className="text-black dark:text-white w-5 h-5" />
        </div>
        <div className="flex flex-col items-center gap-5 mb-4">
          <i data-feather="help-circle" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="settings" className="text-black dark:text-white w-5 h-5" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-6 py-8 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-foreground">
              {cargando ? 'Cargando…' : `¡Bienvenido, ${perfil?.nombre ?? 'Usuario'}!`}
            </h1>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="bg-white/30 dark:bg-white/10 border border-orange-400 text-orange-600 font-semibold text-sm px-3 py-1.5 rounded-md backdrop-blur-sm"
            >
              <option value="available">Disponible</option>
              <option value="busy">Ocupado</option>
              <option value="away">Ausente</option>
            </select>
          </div>

          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Buscar contactos, reuniones..."
              className="w-full px-4 py-2 pr-10 rounded-md bg-white/40 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur-md"
            />
            <i data-feather="search" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500" />
          </div>
        </header>

        {/* Cards */}
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Iniciar reunión" description="Crea una sala e invita a otros." buttonText="Crear reunión" />
          <Card title="Unirse con código" inputPlaceholder="Código de reunión" buttonText="Unirse" />

          {/* Contactos */}
          <Card
            title="Contactos"
            content={
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por nombre, apellido o apodo…"
                    className="w-full px-3 py-2 pr-8 rounded-md bg-white/20 border border-white/30 text-foreground backdrop-blur-sm"
                  />
                  <i data-feather="search" className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 w-4 h-4" />
                </div>

                {contactsLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : contactsError ? (
                  <p className="text-sm text-red-500">Error de red al obtener contactos.</p>
                ) : filteredContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin resultados.</p>
                ) : (
                  <ul className="divide-y divide-white/20 max-h-72 overflow-auto pr-1">
                    {filteredContacts.map((c) => (
                      <li key={c.id} className="py-2 flex items-center gap-3">
                        {c.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.foto} alt={c.apodo ?? c.nombre} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs">👤</div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {c.nombre} {c.apellido ?? ''}
                            {c.apodo ? <span className="opacity-70"> · {c.apodo}</span> : null}
                          </div>
                          {c.estado ? (
                            <span className="text-xs opacity-70">
                              {stateDot(c.estado)} {labelEstado(c.estado)}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            title="Llamar"
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                            onClick={() => handleCall(c)}
                          >
                            <i data-feather="phone" className="w-4 h-4" />
                          </button>
                          <button
                            title="Videollamada"
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                            onClick={() => handleVideo(c)}
                          >
                            <i data-feather="video" className="w-4 h-4" />
                          </button>
                          <button
                            title="Chat"
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
                            onClick={() => handleChat(c)}
                          >
                            <i data-feather="message-circle" className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            }
          />

          <Card
            title="Reuniones programadas"
            list={['🗓 5 julio - Reunión equipo 10:00', '🗓 6 julio - Cliente Z 15:30']}
            buttonText="Ver calendario"
          />

          {/* Perfil con links */}
          <Card
            title="Perfil"
            content={
              <>
                {cargando ? (
                  <p className="text-sm text-muted-foreground">Cargando perfil...</p>
                ) : perfil ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Nombre: {perfil.nombre ?? '—'} {perfil.apellido ?? ''}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">Correo: {perfil.mail ?? '—'}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No se encontró el perfil.</p>
                )}
              </>
            }
            buttonText={
              <div className="flex gap-2 mt-3">
                <Link
                  href="/protected/perfil"
                  className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:brightness-105 transition"
                >
                  Ver perfil
                </Link>
                <Link
                  href="/protected/perfil/editar"
                  className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:brightness-105 transition"
                >
                  Editar perfil
                </Link>
              </div>
            }
          />

          {/* 👇 Chat reciente con Link */}
          <Card
            title="Chat reciente"
            content={
              <div className="bg-white/30 dark:bg-white/10 p-3 rounded-md text-sm text-muted-foreground backdrop-blur-md">
                <p><strong>Juan:</strong> ¿Nos conectamos ahora?</p>
                <p><strong>Vos:</strong> Dame 5 minutos 🙌</p>
              </div>
            }
            buttonText={
              <Link
                href="/protected/chats"
                className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold w-fit mt-3 hover:brightness-105 transition"
              >
                Ir al chat
              </Link>
            }
          />
        </section>
      </main>
    </div>
  );
}

/* Card component */
function Card({
  title,
  description,
  inputPlaceholder,
  list,
  content,
  buttonText,
}: {
  title: string;
  description?: string;
  inputPlaceholder?: string;
  list?: string[];
  content?: React.ReactNode;
  buttonText?: string | React.ReactNode;
}) {
  return (
    <div className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col justify-between">
      <div>
        <h2 className="text-orange-500 font-semibold text-lg mb-2">{title}</h2>
        {description && <p className="text-muted-foreground mb-4">{description}</p>}
        {inputPlaceholder && (
          <input
            type="text"
            placeholder={inputPlaceholder}
            className="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 text-foreground mb-4 backdrop-blur-sm"
          />
        )}
        {list && (
          <ul className="list-disc list-inside text-muted-foreground text-sm mb-4">
            {list.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        )}
        {content}
      </div>

      {buttonText &&
        (typeof buttonText === 'string' ? (
          <button className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-full font-semibold w-fit mt-3 hover:brightness-105 transition">
            {buttonText}
          </button>
        ) : (
          buttonText
        ))}
    </div>
  );
}
