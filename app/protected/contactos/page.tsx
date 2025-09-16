'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Search, Phone, X, Check } from 'lucide-react';

// Hook centralizado para agenda confirmada
import { useContacts } from '../hooks/useContacts';

/* ================= Tipos ================= */
type ContactoAgenda = {
  id?: number | string;
  id_usuario_contacto?: number | string;
  nombre?: string;
  apellido?: string;
  apodo?: string | null;
  favorito?: boolean;
  fh_alta?: string | null;
  id_estado?: number | null;
  nombreEstado?: string | null;
  pendiente?: boolean;
  inbound?: boolean;                 // true si es una solicitud entrante (vos sos receptor)
  id_solicitante?: number | null;    // para RPC
  id_receptor?: number | null;       // para RPC
};

type UsuarioBusqueda = {
  id: number;
  nombre: string;
  apellido: string;
  apodo: string | null;
  mail: string;
  en_agenda: boolean;
  pendiente?: boolean;
};

/* ================= Helpers ================= */
async function getJwt(supabaseClient: SupabaseClient | any) {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token ?? '';
}

function fullName(n?: string, a?: string) {
  return `${n ?? ''} ${a ?? ''}`.trim();
}

function formatARDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-AR');
  } catch {
    return '—';
  }
}

/** Carga las solicitudes PENDIENTES que YO envié y las enriquece con datos del receptor */
async function fetchPendientesSalientes(supabase: any, idUsuario: number): Promise<ContactoAgenda[]> {
  const { data: outs, error } = await supabase
    .from('SolicitudContacto')
    .select('id,id_receptor,fecha_solicitud,estado')
    .eq('id_solicitante', idUsuario)
    .eq('estado', 'pendiente');

  if (error || !outs?.length) return [];

  const ids = Array.from(new Set(outs.map((o: any) => o.id_receptor)));
  const { data: usuarios } = await supabase
    .from('Usuario')
    .select('id,nombre,apellido,apodo')
    .in('id', ids);

  const byId: Record<number, any> = {};
  for (const u of usuarios ?? []) byId[u.id] = u;

  return outs.map((o: any) => ({
    id: `pending-${o.id}`,
    id_usuario_contacto: o.id_receptor,
    nombre: byId[o.id_receptor]?.nombre ?? '',
    apellido: byId[o.id_receptor]?.apellido ?? '',
    apodo: byId[o.id_receptor]?.apodo ?? null,
    fh_alta: null,
    nombreEstado: '(pendiente)',
    pendiente: true,
  }));
}

export default function ContactosPage() {
  const supabase = useSupabaseClient<any>();

  /* ====== idUsuario interno (tabla Usuario) ====== */
  const [idUsuario, setIdUsuario] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uuid = sessionData.session?.user.id;
        if (!uuid) return;
        const { data, error } = await supabase.from('Usuario').select('id').eq('User_id', uuid).single();
        if (!error && data?.id) setIdUsuario(Number(data.id));
      } catch (e) {
        console.error('No pude resolver idUsuario', e);
      }
    })();
  }, [supabase]);

  /* ====== Hook de agenda confirmada ====== */
  const {
    contacts: confirmed,          // ContactoAgenda[]
    loading: loadingAgenda,
    error: agendaError,
    refresh: refreshAgenda,
  } = useContacts(supabase, idUsuario);

  /* ====== Estado de pendientes salientes/merge ====== */
  // Set de ids (number) de usuarios con solicitud pendiente (para pintar en resultados)
  const [pendingOut, setPendingOut] = useState<Set<number>>(new Set());
  // Lista enriquecida de “outs” para mostrar como (pendiente) en la agenda mientras no están confirmados
  const [outsList, setOutsList] = useState<ContactoAgenda[]>([]);
  // Pendientes ENTRANTES (donde YO soy el receptor)
  const [inList, setInList] = useState<ContactoAgenda[]>([]);

  // ids de la agenda confirmada (para evitar duplicar outs)
  const agendaIds = useMemo(() => {
    const ids = new Set<number>();
    for (const c of confirmed ?? []) {
      const id = Number((c as any).id_usuario_contacto ?? (c as any).id);
      if (!Number.isNaN(id)) ids.add(id);
    }
    return ids;
  }, [confirmed]);

  // Cargar pendientes salientes al inicio (y setear pendingOut)
  useEffect(() => {
    if (!idUsuario) return;
    (async () => {
      const outs = await fetchPendientesSalientes(supabase, idUsuario);
      setOutsList(outs);
      const ids = new Set<number>();
      for (const o of outs) {
        const id = Number(o.id_usuario_contacto);
        if (!Number.isNaN(id)) ids.add(id);
      }
      setPendingOut(ids);
    })();
  }, [idUsuario, supabase]);

  // Cargar solicitudes PENDIENTES ENTRANTES (yo soy receptor)
  useEffect(() => {
    if (!idUsuario) return;
    (async () => {
      const { data: ins, error } = await supabase
        .from('SolicitudContacto')
        .select('id,id_solicitante,id_receptor,fecha_solicitud,estado')
        .eq('id_receptor', idUsuario)
        .eq('estado', 'pendiente')
        .order('id', { ascending: false });

      if (error || !ins?.length) { setInList([]); return; }

      const ids = Array.from(new Set(ins.map((r: any) => Number(r.id_solicitante))));
      const { data: usrs } = await supabase
        .from('Usuario')
        .select('id,nombre,apellido,apodo')
        .in('id', ids);

      const byId: Record<number, any> = {};
      for (const u of usrs ?? []) byId[Number(u.id)] = u;

      const mapped: ContactoAgenda[] = (ins ?? []).map((r: any) => ({
        id: `in-${r.id}`,
        id_usuario_contacto: r.id_solicitante, // para mostrar nombre del solicitante
        id_solicitante: r.id_solicitante,
        id_receptor: r.id_receptor,
        nombre: byId[r.id_solicitante]?.nombre ?? '',
        apellido: byId[r.id_solicitante]?.apellido ?? '',
        apodo: byId[r.id_solicitante]?.apodo ?? null,
        fh_alta: null,
        nombreEstado: '(pendiente)',
        pendiente: true,
        inbound: true,
      }));

      setInList(mapped);
    })();
  }, [idUsuario, supabase]);


  // outsList filtrada para no mostrar si ya está confirmada
  const filteredOuts = useMemo(
    () => outsList.filter(p => !agendaIds.has(Number(p.id_usuario_contacto ?? p.id))),
    [outsList, agendaIds]
  );

  /* ====== Buscador en la página ====== */
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UsuarioBusqueda[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!idUsuario) return;
      const term = q.trim();
      if (!term) { setResults([]); return; }
      try {
        setLoadingSearch(true);
        const token = await getJwt(supabase);
        const params = new URLSearchParams({ id_usuario: String(idUsuario), busqueda: term });
        const r = await fetch(`/api/users/contacts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!r.ok) {
          setResults([]);
        } else {
          const data = await r.json().catch(() => []);
          const mapped: UsuarioBusqueda[] = (data ?? []).map((u: any) => ({
            id: Number(u.id),
            nombre: u.nombre,
            apellido: u.apellido,
            apodo: u.apodo ?? null,
            mail: u.mail,
            en_agenda: agendaIds.has(Number(u.id)),
            pendiente: pendingOut.has(Number(u.id)),
          }));
          setResults(mapped);
        }
      } finally {
        setLoadingSearch(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, idUsuario, supabase, agendaIds, pendingOut]);

  /* ====== Modal “Añadir contacto” ====== */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalQ, setModalQ] = useState('');
  const [modalResults, setModalResults] = useState<UsuarioBusqueda[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UsuarioBusqueda | null>(null);

  const handleOpenModal = () => { setIsModalOpen(true); setModalQ(''); setModalResults([]); setSelectedUser(null); };
  const handleCloseModal = () => { setIsModalOpen(false); setModalQ(''); setModalResults([]); setSelectedUser(null); };

  useEffect(() => {
    if (!isModalOpen) return;
    const t = setTimeout(async () => {
      if (!idUsuario) return;
      const term = modalQ.trim();
      if (!term) { setModalResults([]); return; }
      try {
        setModalLoading(true);
        const token = await getJwt(supabase);
        const params = new URLSearchParams({ id_usuario: String(idUsuario), busqueda: term });
        const r = await fetch(`/api/users/contacts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          console.error('search (modal) error', r.status, txt);
          setModalResults([]);
        } else {
          const data = await r.json().catch(() => []);
          const mapped: UsuarioBusqueda[] = (data ?? []).map((u: any) => ({
            id: Number(u.id),
            nombre: u.nombre,
            apellido: u.apellido,
            apodo: u.apodo ?? null,
            mail: u.mail,
            en_agenda: agendaIds.has(Number(u.id)),
            pendiente: pendingOut.has(Number(u.id)),
          }));
          setModalResults(mapped);
        }
      } finally {
        setModalLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [isModalOpen, modalQ, idUsuario, supabase, agendaIds, pendingOut]);

  // Confirmar con Enter / cerrar con Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') handleCloseModal();
      if (e.key === 'Enter' && selectedUser) addContacto(selectedUser.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, selectedUser]); // addContacto es estable por useCallback

  /* ====== Crear solicitud ====== */
  const addContacto = useCallback(
    async (idUsuarioContacto: number) => {
      if (!idUsuario) return;
      try {
        const { data, error } = await supabase
          .from('SolicitudContacto')
          .insert([{
            id_solicitante: idUsuario,
            id_receptor: idUsuarioContacto,
            estado: 'pendiente',
            fecha_solicitud: new Date().toISOString(),
          }])
          .select('id')
          .single();

        if (error) throw error;

        // Marcar “pendiente” en resultados/búsqueda
        setResults(prev => prev.map(r => (r.id === idUsuarioContacto ? { ...r, pendiente: true } : r)));
        setPendingOut(prev => {
          const next = new Set(prev);
          next.add(Number(idUsuarioContacto));
          return next;
        });

        // Mostrar en agenda como pendiente si aún no existe confirmado
        setOutsList(prev => {
          const exists = prev.some(c => Number(c.id_usuario_contacto ?? c.id) === idUsuarioContacto);
          if (exists || agendaIds.has(idUsuarioContacto)) return prev;
          return [
            ...prev,
            {
              id: `pending-${data?.id ?? crypto.randomUUID()}`,
              id_usuario_contacto: idUsuarioContacto,
              nombre: '',
              apellido: '',
              fh_alta: null,
              nombreEstado: '(pendiente)',
              pendiente: true,
            },
          ];
        });

        toast.success('Solicitud enviada ✅');
        if (isModalOpen) handleCloseModal();
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'No se pudo enviar la solicitud.');
      }
    },
    [idUsuario, supabase, isModalOpen, agendaIds]
  );

  async function acceptFromContacts(c: ContactoAgenda) {
  if (!c.id_solicitante || !c.id_receptor) return;
  const { error } = await supabase.rpc('accept_contact_request_v2', {
    p_id_solicitante: Number(c.id_solicitante),
    p_id_receptor: Number(c.id_receptor),
  });
  if (error) {
    console.error(error);
    toast.error('No se pudo aceptar la solicitud.');
    return;
  }
  // Optimista: saco de la lista entrante y refresco agenda confirmada
  setInList(prev => prev.filter(x => x.id !== c.id));
  await refreshAgenda();
  toast.success('Solicitud aceptada ✅');
  }

  async function rejectFromContacts(c: ContactoAgenda) {
    if (!c.id_solicitante || !c.id_receptor) return;
    const { error } = await supabase.rpc('reject_contact_request_v2', {
      p_id_solicitante: Number(c.id_solicitante),
      p_id_receptor: Number(c.id_receptor),
    });
    if (error) {
      console.error(error);
      toast.error('No se pudo rechazar la solicitud.');
      return;
    }
    setInList(prev => prev.filter(x => x.id !== c.id));
    toast.success('Solicitud rechazada');
  }

  /* ====== Realtime: mis solicitudes enviadas + contactos aceptados ====== */
  useEffect(() => {
    if (!idUsuario) return;

    const ch = supabase
      .channel(`contactos-${idUsuario}`)
      // Cualquier cambio en solicitudes que YO envié
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'SolicitudContacto', filter: `id_solicitante=eq.${idUsuario}` },
        async (payload) => {
          const row: any = payload.new ?? payload.old;
          if (!row) return;
          const receptor = Number(row.id_receptor);

          // Set de ids para “Pendiente” (búsqueda)
          setPendingOut(prev => {
            const next = new Set(prev);
            if (row.estado === 'pendiente') next.add(receptor);
            else next.delete(receptor); // aceptada/rechazada/cancelada
            return next;
          });

          // outsList enriquecida (solo mientras esté pendiente)
          if (payload.eventType === 'INSERT' && row.estado === 'pendiente') {
            const { data: u } = await supabase
              .from('Usuario')
              .select('id,nombre,apellido,apodo')
              .eq('id', receptor)
              .maybeSingle();

            setOutsList(prev => {
              const key = String(receptor);
              const exists = prev.some(c => String(c.id_usuario_contacto ?? c.id) === key);
              if (exists || agendaIds.has(receptor)) return prev;
              return [
                ...prev,
                {
                  id: `pending-${row.id}`,
                  id_usuario_contacto: receptor,
                  nombre: u?.nombre ?? '',
                  apellido: u?.apellido ?? '',
                  apodo: u?.apodo ?? null,
                  fh_alta: null,
                  nombreEstado: '(pendiente)',
                  pendiente: true,
                },
              ];
            });
          } else if (payload.eventType === 'UPDATE' && row.estado !== 'pendiente') {
            // aceptada / rechazada -> saco de outs y refresco confirmados
            setOutsList(prev => prev.filter(c => Number(c.id_usuario_contacto) !== receptor));
            void refreshAgenda();
          }
        }
      )
      // Cuando me aceptan (se crea ContactoUsuario para mí), refresco agenda
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ContactoUsuario',   filter: `id_usuario=eq.${idUsuario}` },
        () => { void refreshAgenda(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [idUsuario, supabase, refreshAgenda, agendaIds]);

  const hayBusqueda = useMemo(() => q.trim().length > 0, [q]);

  useEffect(() => {
    if (!idUsuario) return;

    const chIn = supabase
      .channel(`sc-in:${idUsuario}`)
      .on('postgres_changes',
        { schema: 'public', table: 'SolicitudContacto', event: '*', filter: `id_receptor=eq.${idUsuario}` },
        async (payload) => {
          const row: any = payload.new ?? payload.old;
          if (!row) return;

          if (payload.eventType === 'INSERT' && row.estado === 'pendiente') {
            // Enriquecer con nombre del solicitante
            const { data: u } = await supabase
              .from('Usuario')
              .select('id,nombre,apellido,apodo')
              .eq('id', row.id_solicitante)
              .maybeSingle();

            setInList(prev => ([
              {
                id: `in-${row.id}`,
                id_usuario_contacto: row.id_solicitante,
                id_solicitante: row.id_solicitante,
                id_receptor: row.id_receptor,
                nombre: u?.nombre ?? '',
                apellido: u?.apellido ?? '',
                apodo: u?.apodo ?? null,
                fh_alta: null,
                nombreEstado: '(pendiente)',
                pendiente: true,
                inbound: true,
              },
              ...prev.filter(x => x.id !== `in-${row.id}`),
            ]));
          }

          if (payload.eventType === 'UPDATE' && row.estado !== 'pendiente') {
            // aceptada o rechazada -> quitar de la lista
            setInList(prev => prev.filter(x => x.id !== `in-${row.id}`));
            if (row.estado === 'aceptada') { await refreshAgenda(); }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(chIn); };
  }, [idUsuario, supabase, refreshAgenda]);


  /* ================= Render ================= */
const combinedAgenda = useMemo(
  () => ([...inList, ...filteredOuts, ...(confirmed ?? [])] as ContactoAgenda[]),
  [inList, filteredOuts, confirmed]
);

  return (
  <>
    <main className="flex-1 px-6 py-8 flex flex-col gap-8">
      {/* Header + botón + buscador */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Contactos</h1>

        <div className="flex w-full md:max-w-xl items-center gap-3">
          <button
            onClick={() => { setIsModalOpen(true); }}
            className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-md font-semibold hover:brightness-105 transition"
          >
            Añadir contacto
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, apellido o apodo…"
              className="w-full px-4 py-2 pr-10 rounded-md bg-white/40 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur-md"
            />
            <Search className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />
          </div>
        </div>
      </header>

      {/* Resultados de búsqueda */}
      {hayBusqueda && (
        <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col gap-2">
          {loadingSearch && <p className="text-muted-foreground">Buscando…</p>}
          {!loadingSearch && results.length === 0 && (
            <p className="text-muted-foreground">No hay resultados para “{q.trim()}”.</p>
          )}
          {!loadingSearch && results.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-white/20 dark:bg-white/5 p-3 rounded-lg">
              <div>
                <p className="font-medium">
                  {u.nombre} {u.apellido}{u.apodo ? ` (${u.apodo})` : ''}
                </p>
                <p className="text-xs text-muted-foreground">{u.mail}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.pendiente ? (
                  <span className="text-xs px-2 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-700">
                    Pendiente
                  </span>
                ) : u.en_agenda ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-700 border border-green-500/30">
                    Ya en tu lista
                  </span>
                ) : (
                  <button
                    onClick={() => addContacto(u.id)}
                    className="text-sm bg-gradient-to-r from-orange-400 to-orange-600 text-white px-3 py-1.5 rounded-full font-semibold hover:brightness-105 transition"
                  >
                    Agregar
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Agenda */}
      <section className="bg-white/30 dark:bg-white/10 rounded-xl p-6 shadow-lg backdrop-blur-md border border-white/20 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-orange-600">Mi agenda</h2>

        {loadingAgenda && <p className="text-muted-foreground">Cargando contactos…</p>}
        {!loadingAgenda && agendaError && <p className="text-red-600 dark:text-red-400">{agendaError}</p>}

        {!loadingAgenda && !agendaError && (filteredOuts.length + (confirmed?.length ?? 0)) === 0 && (
          <p className="text-muted-foreground">No tienes contactos agregados.</p>
        )}

        {/* Primero los pendientes (si no están confirmados), luego los confirmados */}
        {combinedAgenda.map((c: ContactoAgenda, idx: number) => {
          const isPending = !!c.pendiente;
          const canCall = !isPending;

          return (
            <div
              key={String(c.id ?? c.id_usuario_contacto ?? idx)}
              className="flex justify-between items-center bg-white/20 dark:bg-white/5 p-4 rounded-lg hover:bg-white/30 transition"
            >
              <div>
                <p className="font-semibold text-lg">
                  {fullName(c.nombre, c.apellido)}
                  {isPending && (
                    <span className="ml-2 text-xs text-orange-600">(pendiente)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Estado: {c.nombreEstado ?? '—'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isPending ? (
                  c.inbound ? (
                    // 👉 Es una solicitud ENTRANTE: mostrar Aceptar/Rechazar
                    <>
                      <button
                        onClick={() => acceptFromContacts(c)}
                        className="p-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-600"
                        title="Aceptar"
                      >
                        {/* Si usás este icono, importá { Check } de 'lucide-react' */}
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => rejectFromContacts(c)}
                        className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-600"
                        title="Rechazar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    // 👉 Es una solicitud SALIENTE (vos la enviaste): solo badge "Pendiente"
                    <span className="text-xs px-2 py-1 rounded-full border border-orange-300 bg-orange-50 text-orange-700">
                      Pendiente
                    </span>
                  )
                ) : (
                  // 👉 Contacto confirmado: botón de llamada habilitado
                  <button
                    onClick={() =>
                      alert(`Iniciando llamada con ${fullName(c.nombre, c.apellido)}`)
                    }
                    disabled={!canCall}
                    aria-label={canCall ? 'Llamar' : 'Solicitud pendiente'}
                    title={canCall ? 'Llamar' : 'Solicitud pendiente'}
                    className={[
                      'inline-flex h-9 w-9 items-center justify-center rounded-full transition shadow',
                      canCall
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:brightness-105'
                        : 'bg-gray-300/70 text-gray-500 cursor-not-allowed',
                    ].join(' ')}
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>

    {/* ====== Modal Añadir contacto ====== */}
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseModal} />
        <div className="relative z-10 w-[90%] max-w-xl rounded-2xl bg-white dark:bg-[#111] border border-white/20 shadow-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Añadir contacto</h3>
            <button className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" onClick={handleCloseModal} aria-label="Cerrar" title="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-4">
            <input
              autoFocus
              type="text"
              value={modalQ}
              onChange={(e) => { setModalQ(e.target.value); setSelectedUser(null); }}
              placeholder="Nombre, apellido o apodo…"
              className="w-full px-4 py-2 pr-10 rounded-md bg-white/60 dark:bg-white/10 border border-orange-300 text-foreground focus:ring-2 focus:ring-orange-400 backdrop-blur"
            />
            <Search className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />
          </div>

          <div className="max-h-72 overflow-auto space-y-2">
            {modalLoading && <p className="text-muted-foreground">Buscando…</p>}
            {!modalLoading && modalQ.trim() && modalResults.length === 0 && (<p className="text-muted-foreground">Sin resultados.</p>)}

            {!modalLoading && modalResults.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full text-left bg-white/60 dark:bg-white/5 border border-white/30 rounded-lg p-3 hover:bg-white/80 dark:hover:bg-white/10 transition ${selectedUser?.id === u.id ? 'ring-2 ring-orange-400' : ''}`}
              >
                <p className="font-medium">
                  {u.nombre} {u.apellido}{u.apodo ? ` (${u.apodo})` : ''}
                </p>
                <p className="text-xs text-muted-foreground">{u.mail}</p>
                {u.en_agenda && (
                  <span className="text-[11px] inline-block mt-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
                    Ya en tu lista
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedUser && <>¿Agregar a <span className="font-medium">{selectedUser.nombre} {selectedUser.apellido}</span>?</>}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCloseModal} className="px-4 py-2 rounded-md border border-white/30 bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 transition">
                Cancelar
              </button>
              <button
                disabled={!selectedUser || selectedUser.en_agenda}
                onClick={() => selectedUser && addContacto(selectedUser.id)}
                className={`px-4 py-2 rounded-md font-semibold transition ${
                  !selectedUser || selectedUser.en_agenda
                    ? 'bg-gray-300 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:brightness-105'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
}
