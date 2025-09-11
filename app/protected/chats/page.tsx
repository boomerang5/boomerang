// app/protected/chats/page.tsx
"use client";

/**
 * Chats + barra lateral (UI)
 * - Sidebar igual a la del dashboard.
 * - Lista de chats con selección y badge de no leídos.
 * - Header con acciones (llamar, video, más).
 * - Popover Más: silenciar, vaciar, archivar.
 * - Autoscroll y textarea con auto-resize.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
// @ts-ignore
import feather from "feather-icons";

/** Tipos y datos mock (reemplazar por backend real cuando corresponda) */
type Msg = { from: "me" | "them"; text: string; time: string };
type Chat = {
  id: string;
  name: string;
  initials: string;
  time: string; // hora/label en la lista
  unread?: number;
  preview: string;
  online?: boolean;
  messages: Msg[];
};

const MOCK_CHATS: Chat[] = [
  {
    id: "juan",
    name: "Juan Pérez",
    initials: "JP",
    time: "10:24",
    unread: 2,
    preview: "¿Nos conectamos ahora?",
    online: true,
    messages: [
      { from: "them", text: "¿Nos conectamos ahora?", time: "10:24" },
      { from: "me", text: "Dame 5 minutos 🙌", time: "10:25" },
      { from: "them", text: "Perfecto, te espero.", time: "10:26" },
    ],
  },
  {
    id: "maria",
    name: "María Gómez",
    initials: "MG",
    time: "09:12",
    preview: "Perfecto, gracias!",
    messages: [
      { from: "them", text: "Hola! ¿Tenés el link?", time: "09:05" },
      { from: "me", text: "Te lo mando por acá 👇", time: "09:07" },
      { from: "them", text: "Perfecto, gracias!", time: "09:12" },
    ],
  },
  {
    id: "equipo",
    name: "Equipo Boomerang",
    initials: "EB",
    time: "Ayer",
    preview: "Les pasé el link del meet.",
    messages: [
      { from: "me", text: "Mañana sincronizamos 10:00.", time: "Ayer" },
      { from: "them", text: "Les pasé el link del meet.", time: "Ayer" },
    ],
  },
  {
    id: "clientez",
    name: "Cliente Z",
    initials: "CZ",
    time: "Lun",
    preview: "Quedamos para el jueves",
    messages: [
      { from: "them", text: "¿Jueves 15:30 les sirve?", time: "Lun" },
      { from: "me", text: "Confirmado. 🙏", time: "Lun" },
      { from: "them", text: "Quedamos para el jueves", time: "Lun" },
    ],
  },
];

export default function ChatsPage() {
  // Render de íconos feather en la sidebar
  useEffect(() => {
    feather.replace();
  });

  /** id del chat seleccionado; "" = ninguno (chat cerrado) */
  const [selectedId, setSelectedId] = useState<string>(MOCK_CHATS[0].id);

  /** Estados de UI para cada chat */
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState<Record<string, boolean>>({});

  /** ✅ Estado para no leídos (para poder limpiarlos al abrir) */
  const [unreadById, setUnreadById] = useState<Record<string, number>>(
    () => Object.fromEntries(MOCK_CHATS.map((c) => [c.id, c.unread ?? 0]))
  );

  /** Mensajes por chat (para poder "vaciar" sin tocar el mock original) */
  const [messagesById, setMessagesById] = useState<Record<string, Msg[]>>(() =>
    Object.fromEntries(MOCK_CHATS.map((c) => [c.id, c.messages]))
  );

  /** Refs para UX */
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Popover "Más opciones" */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Chat activo a partir del id (o undefined si no hay selección) */
  const selectedChat = useMemo(
    () => MOCK_CHATS.find((c) => c.id === selectedId),
    [selectedId]
  );

  /** Al cambiar de chat (o al montar con uno seleccionado), scrollear al final */
  useEffect(() => {
    if (!selectedChat) return;
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [selectedChat]);

  /** Cerrar popover con click afuera o Esc */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /** Autoajuste de altura del textarea hasta 120px */
  const autoResize = () => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 120) + "px";
  };

  /** Acciones de menú */
  const toggleMute = () => {
    if (!selectedId) return;
    setMuted((m) => ({ ...m, [selectedId]: !m[selectedId] }));
    setMenuOpen(false);
  };
  const clearChat = () => {
    if (!selectedId) return;
    setMessagesById((prev) => ({ ...prev, [selectedId]: [] }));
    setMenuOpen(false);
  };
  const toggleArchive = () => {
    if (!selectedId) return;
    setArchived((a) => ({ ...a, [selectedId]: !a[selectedId] }));
    setMenuOpen(false);
  };

  /** Lista visible (archivados al final) */
  const visibleChats = useMemo(() => {
    const list = [...MOCK_CHATS];
    list.sort((a, b) => Number(!!archived[a.id]) - Number(!!archived[b.id]));
    return list;
  }, [archived]);

  /** ✅ Al seleccionar un chat, reseteamos no-leídos */
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setUnreadById((prev) => ({ ...prev, [id]: 0 }));
  };

  return (
    <main className="flex-1 px-4 py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-[320px_1fr]">
          {/* Columna izquierda: lista de chats */}
          <aside className="rounded-2xl bg-white/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
            {/* Encabezado + buscador */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#f16f24]">Mis chats</h2>
              <Link href="/protected" className="text-sm text-[#de4435] hover:underline">
                Volver
              </Link>
            </div>

            <div className="mb-4">
              <label className="sr-only" htmlFor="chat-search">
                Buscar
              </label>
              <div className="flex items-center rounded-xl border border-[#f16f24]/30 bg-white px-3">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C15.99 6.01 13.98 4 11.49 4S7 6.01 7 9s2.01 5 4.49 5c1.61 0 3.06-.66 4.1-1.73l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0c.41-.41.41-1.08 0-1.49L15.5 14Zm-4.01 0C9.01 14 7 11.99 7 9s2.01-5 4.49-5S16 6.01 16 9s-2.01 5-4.51 5Z"
                  />
                </svg>
                <input
                  id="chat-search"
                  placeholder="Buscar contacto o chat..."
                  className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-black/40"
                />
              </div>
            </div>

            {/* Lista de chats (clic para seleccionar) */}
            <ul className="space-y-2">
              {visibleChats.map((c) => {
                const isActive = c.id === selectedId;
                const isMuted = !!muted[c.id];
                const isArchived = !!archived[c.id];
                const unread = unreadById[c.id] ?? 0;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => handleSelect(c.id)}
                      type="button"
                      className={[
                        "w-full rounded-xl p-3 text-left shadow-sm transition",
                        isActive
                          ? "border border-[#f16f24]/20 bg-gradient-to-tr from-[#fff7f1] to-white hover:shadow"
                          : "border border-transparent bg-white hover:border-[#f16f24]/20 hover:shadow-md",
                        isArchived ? "opacity-70" : "",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] font-semibold">
                          {c.initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate font-medium text-[#2b2b2b] flex items-center gap-1">
                              {c.name}
                              {isArchived && (
                                <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">
                                  Archivado
                                </span>
                              )}
                              {isMuted && (
                                <span title="Silenciado" className="text-black/50">
                                  <svg width="12" height="12" viewBox="0 0 24 24" className="inline">
                                    <path
                                      fill="currentColor"
                                      d="m2 3.27l1.28-1.27l18 18l-1.27 1.27l-2.12-2.12H4v-2h1v-7a7 7 0 0 1 7-7c1.12 0 2.17.27 3.09.73l-1.5 1.5A5 5 0 0 0 12 4a5 5 0 0 0-5 5v7h9.73L2 3.27ZM20 17h2v2h-2v-2Zm-8 5a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z"
                                    />
                                  </svg>
                                </span>
                              )}
                            </p>
                            <span className="shrink-0 text-xs text-black/50">{c.time}</span>
                          </div>
                          <p className="truncate text-sm text-black/60">{c.preview}</p>
                        </div>

                        {unread > 0 ? (
                          <span className="ml-2 shrink-0 rounded-full bg-[#de4435] px-2 py-0.5 text-xs font-medium text-white">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Columna derecha: conversación o placeholder si no hay selección */}
          {selectedChat ? (
            <section className="flex min-h-[70vh] flex-col rounded-2xl bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
              {/* Header conversación */}
              <header className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] font-semibold">
                      {selectedChat.initials}
                    </div>
                    {selectedChat.online && (
                      <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#2b2b2b] flex items-center gap-2">
                      {selectedChat.name}
                      {!!archived[selectedId] && (
                        <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">
                          Archivado
                        </span>
                      )}
                      {!!muted[selectedId] && (
                        <span title="Silenciado" className="text-black/50">
                          <svg width="12" height="12" viewBox="0 0 24 24" className="inline">
                            <path
                              fill="currentColor"
                              d="m2 3.27l1.28-1.27l18 18l-1.27 1.27l-2.12-2.12H4v-2h1v-7a7 7 0 0 1 7-7c1.12 0 2.17.27 3.09.73l-1.5 1.5A5 5 0 0 0 12 4a5 5 0 0 0-5 5v7h9.73L2 3.27ZM20 17h2v2h-2v-2Zm-8 5a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z"
                            />
                          </svg>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-black/50">
                      {selectedChat.online ? "En línea" : "Desconectado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" ref={menuRef}>
                  {/* Ícono Llamar */}
                  <button
                    title="Llamar"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.6,10.8C7.9,13.3,10.2,15.6,12.7,16.9L15,14.6c0.3-0.3,0.8-0.4,1.2-0.3c1.3,0.4,2.6,0.6,4,0.6 c0.7,0,1.3,0.6,1.3,1.3v3.9c0,0.7-0.6,1.3-1.3,1.3C10.6,21.5,2.5,13.4,2.5,3.3C2.5,2.6,3.1,2,3.8,2h3.9c0.7,0,1.3,0.6,1.3,1.3 c0,1.4,0.2,2.7,0.6,4C9.8,7.9,9.7,8.4,9.4,8.7L6.6,10.8z" />
                    </svg>
                  </button>

                  {/* Ícono Videollamada */}
                  <button
                    title="Videollamada"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7c0-0.55-0.45-1-1-1H4C3.45 6 3 6.45 3 7v10c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                  </button>

                  {/* Popover "Más opciones" */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen((v) => !v)}
                      title="Más opciones"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>

                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-black/10 bg-white/95 shadow-xl backdrop-blur"
                      >
                        <button
                          role="menuitem"
                          onClick={toggleMute}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                        >
                          {muted[selectedId] ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                              <path d="m2 3.27l1.28-1.27l18 18l-1.27 1.27l-2.12-2.12H4v-2h1v-7a7 7 0 0 1 7-7c1.12 0 2.17.27 3.09.73l-1.5 1.5A5 5 0 0 0 12 4a5 5 0 0 0-5 5v7h9.73L2 3.27ZM20 17h2v2h-2v-2Zm-8 5a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                              <path d="M10 21h4a2 2 0 0 1-4 0m10-4h-2v-7a6 6 0 1 0-12 0v7H4v2h16z"/>
                            </svg>
                          )}
                          {muted[selectedId] ? "Quitar silencio" : "Silenciar"}
                        </button>

                        <button
                          role="menuitem"
                          onClick={clearChat}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                            <path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 12h12a2 2 0 0 0 2-2V9H4v10a2 2 0 0 0 2 2Z"/>
                          </svg>
                          Vaciar chat
                        </button>

                        <button
                          role="menuitem"
                          onClick={toggleArchive}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                            <path d="M3 3h18v4H3V3Zm2 6h14v12H5V9Zm2 2v8h10v-8H7Z"/>
                          </svg>
                          {archived[selectedId] ? "Desarchivar" : "Archivar"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cerrar chat */}
                  <button
                    onClick={() => {
                      setSelectedId("");
                      setMenuOpen(false);
                    }}
                    title="Cerrar chat"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black/60 hover:bg-black/5"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                      />
                    </svg>
                  </button>
                </div>
              </header>

              {/* Historial de mensajes (scroll) */}
              <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
                {/* Separador de fecha */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="text-xs text-black/50">Hoy</span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                {/* Render de mensajes */}
                {messagesById[selectedId]?.length ? (
                  messagesById[selectedId].map((m, idx) =>
                    m.from === "them" ? (
                      <div key={idx} className="flex items-end gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-[#f16f24]/10 text-center leading-9 text-[#f16f24] font-semibold">
                          {selectedChat.initials[0]}
                        </div>
                        <div className="max-w-[70%] rounded-2xl rounded-tl-md bg-white p-3 shadow-sm ring-1 ring-black/5">
                          <p className="text-sm text-[#2b2b2b]">{m.text}</p>
                          <div className="mt-1 text-right text-[11px] text-black/45">{m.time}</div>
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="flex items-end justify-end gap-3">
                        <div className="max-w-[70%] rounded-2xl rounded-tr-md bg-gradient-to-br from-[#f16f24] to-[#de4435] p-3 text-white shadow-sm">
                          <p className="text-sm">{m.text}</p>
                          <div className="mt-1 text-right text-[11px] opacity-80">{m.time}</div>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="py-12 text-center text-sm text-black/50">No hay mensajes todavía</div>
                )}
              </div>

              {/* Input de envío (solo UI) */}
              <footer className="border-t border-black/5 p-4">
                <div className="flex items-end gap-2 rounded-2xl border border-[#f16f24]/25 bg-white px-3 py-2 shadow-sm">
                  <button
                    type="button"
                    className="rounded-xl px-2 py-2 text-black/60 hover:bg-black/5"
                    aria-label="Adjuntar"
                    title="Adjuntar"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M7 17a5 5 0 0 0 5 5h1a5 5 0 0 0 5-5V7a3 3 0 0 0-6 0v9a1 1 0 0 0 2 0V7a1 1 0 0 1 2 0v10a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3V7a5 5 0 0 1 10 0v9a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7V7a1 1 0 1 1 2 0v10Z"
                      />
                    </svg>
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    onInput={autoResize}
                    placeholder={`Mensaje para ${selectedChat?.name ?? "…"}…`}
                    className="min-h-[44px] max-h-[120px] w-full resize-none bg-transparent px-2 py-2 outline-none placeholder:text-black/40"
                  />

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f16f24] to-[#de4435] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95"
                    title="Enviar"
                  >
                    Enviar
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M3.4 20.4L22 12L3.4 3.6L3 10l12 2l-12 2z" />
                    </svg>
                  </button>
                </div>
              </footer>
            </section>
          ) : (
            // Placeholder cuando el chat está "cerrado"
            <section className="flex min-h-[70vh] items-center justify-center rounded-2xl bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#f16f24]/10" />
                <p className="text-sm text-black/60">Selecciona un chat para comenzar</p>
              </div>
            </section>
          )}
        </div>
    </main>
  );
}
