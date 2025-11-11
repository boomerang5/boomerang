"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useUserUuid } from '@/contexts/UserUuidContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { createClient } from "../../../utils/supabase/client";

const supabase = createClient();

// Componentes de íconos SVG
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

// Tipos explícitos
type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
  createdAt?: string | Date;
}

interface SessionRow {
  id: number;
  id_usuario: number;
  titulo: string;
  id_transcripcion: number;
  created_at: string;
  updated_at: string;
  eliminado: boolean | null;
  deleted_at: string | null;
}

interface TranscriptRPC {
  id_transcripcion?: number;
  titulo: string;
  path_archivo: string;
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  avatar: string;
  lastMessage: string;
  messages: ChatMessage[];
  path_archivo?: string;
}

// Funciones utilitarias
function fmtTime(dt?: string | Date) {
  if (!dt) return "";
  const d = typeof dt === "string" ? new Date(dt) : dt;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ChatBotPage() {
  const { uuid: cachedUuid, isLoading: uuidLoading } = useUserUuid();

  // Estados principales
  const [userId, setUserId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [selectedTranscriptPath, setSelectedTranscriptPath] = useState<string>("");

  // Panel creación
  const [showCreator, setShowCreator] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptRPC[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);

  // Chat (UI)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Edición de títulos
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState("");

  // Ref para scroll automático
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canChat = useMemo(
    () => !!selectedTranscriptPath && !!selectedSession && !!userId,
    [selectedTranscriptPath, selectedSession, userId]
  );

  // ---------- RPC loaders ----------
  async function loadSessions(uid: number) {
    const { data, error } = await supabase.rpc("get_chatbot_sessions_usuario", {
      p_id_usuario: uid,
      p_id_transcripcion: null,
      p_limit: 100,
      p_offset: 0,
    });
    if (error) {
      console.error("get_chatbot_sessions_usuario error:", error);
      setSessions([]);
      return;
    }
    const filtered = (data || []).filter((s: any) => s.eliminado !== true);
    setSessions(filtered);
  }

  async function loadTranscripts(uid: number) {
    setLoadingTranscripts(true);
    const { data, error } = await supabase.rpc("get_transcripciones_usuario", {
      p_id_usuario: uid,
    });
    setLoadingTranscripts(false);
    if (error) {
      console.error("get_transcripciones_usuario error:", error);
      setTranscripts([]);
      return;
    }
    setTranscripts(data || []);
  }

  async function fetchTranscriptPathById(id_transcripcion: number) {
    const { data, error } = await supabase
      .from("Transcripcion")
      .select("path_archivo")
      .eq("id", id_transcripcion)
      .single();
    if (error) {
      console.error("fetchTranscriptPathById error:", error);
      return "";
    }
    return data?.path_archivo as string;
  }

  async function loadMessages(sessionId: number, uid: number) {
    const { data, error } = await supabase.rpc("get_chatbot_messages", {
      p_id_session: sessionId,
      p_id_usuario: uid,
      p_limit: 500,
      p_offset: 0,
    });
    if (error) {
      console.error("get_chatbot_messages error:", error);
      setMessages([]);
      return;
    }
    const mapped: ChatMessage[] = (data || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.texto ?? "",
      createdAt: m.created_at,
    }));
    setMessages(mapped);
  }

  // ---------- Autenticación ----------
  async function resolveIdUsuarioAndToken(): Promise<{ idUsuario: number; accessToken: string }> {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session?.access_token) {
      throw new Error("No hay sesión activa");
    }

    // Usar UUID del contexto cacheado en lugar de RPC
    const userUuid = cachedUuid || sessionData?.session?.user?.id;

    if (!userUuid) {
      throw new Error("No se pudo resolver el UUID del usuario");
    }

    const { data: userData, error } = await supabase
      .from("Usuario")
      .select("id")
      .eq("User_id", userUuid)
      .maybeSingle();

    if (error) throw error;

    const idUsuario = Number(userData?.id);
    if (!idUsuario) {
      throw new Error(`No se encontró el id de Usuario con UUID: ${userUuid}`);
    }

    return {
      idUsuario,
      accessToken: sessionData.session.access_token,
    };
  }

  // ---------- Selección / Creación ----------
  async function onSelectSession(s: SessionRow) {
    setSelectedSession(s);
    setMessages([]);
    const path = await fetchTranscriptPathById(s.id_transcripcion);
    setSelectedTranscriptPath(path || "");
    if (userId != null) await loadMessages(s.id, userId);
  }

  async function createSessionFromTranscript(t: TranscriptRPC) {
    if (!userId) return;
    let idTrans = t.id_transcripcion;
    if (!idTrans) {
      const { data, error } = await supabase
        .from("Transcripcion")
        .select("id")
        .eq("id_usuario", userId)
        .eq("path_archivo", t.path_archivo)
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        alert("No pude resolver id_transcripcion para " + t.titulo);
        return;
      }
      idTrans = data.id as number;
    }

    const { data, error } = await supabase.rpc("create_chatbot_session", {
      p_id_usuario: userId,
      p_id_transcripcion: idTrans,
      p_titulo: t.titulo,
    });
    if (error) {
      console.error("create_chatbot_session error:", error);
      alert("No se pudo crear la conversación: " + error.message);
      return;
    }
    await loadSessions(userId);
    setSelectedSession(data as SessionRow);
    setSelectedTranscriptPath(t.path_archivo);
    setShowCreator(false);
    setMessages([]);
  }

  // ---------- Efectos ----------
  useEffect(() => {
    async function initUser() {
      // Esperar a que el UUID del contexto esté disponible
      if (uuidLoading) return;

      try {
        const { idUsuario } = await resolveIdUsuarioAndToken();
        setUserId(idUsuario);
      } catch (error) {
        console.error("Error al obtener usuario:", error);
      }
    }
    initUser();
  }, [cachedUuid, uuidLoading]); // Dependencias actualizadas

  useEffect(() => {
    if (userId == null) return;
    loadSessions(userId);
    loadTranscripts(userId);
  }, [userId]);

  // Scroll automático cuando cambian los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- Editar título ----------
  function startEditing(session: SessionRow) {
    setEditingSessionId(session.id);
    setEditingTitle(session.titulo);
  }

  function cancelEditing() {
    setEditingSessionId(null);
    setEditingTitle("");
  }

  async function saveTitle() {
    if (!editingSessionId || !editingTitle.trim() || !userId) return;

    try {
      const { error } = await supabase
        .from("ChatbotSession")
        .update({ titulo: editingTitle.trim() })
        .eq("id", editingSessionId)
        .eq("id_usuario", userId);

      if (error) {
        console.error("Error actualizando título:", error);
        alert("Error al actualizar el título: " + error.message);
        return;
      }

      // Actualizar la lista local
      setSessions(prev =>
        prev.map(s =>
          s.id === editingSessionId
            ? { ...s, titulo: editingTitle.trim() }
            : s
        )
      );

      // Actualizar la sesión seleccionada si es la que se está editando
      if (selectedSession?.id === editingSessionId) {
        setSelectedSession(prev =>
          prev ? { ...prev, titulo: editingTitle.trim() } : prev
        );
      }

      cancelEditing();
    } catch (error: any) {
      console.error("Error actualizando título:", error);
      alert("Error al actualizar el título: " + error.message);
    }
  }

  // ---------- Eliminar conversación ----------
  async function handleDeleteSession(session: SessionRow) {
    if (!userId) return;
    const ok = confirm(`¿Eliminar la conversación "${session.titulo}"?`);
    if (!ok) return;
    try {
      const { error } = await supabase
        .from("ChatbotSession")
        .update({ eliminado: true, deleted_at: new Date().toISOString() })
        .eq("id", session.id)
        .eq("id_usuario", userId);
      if (error) {
        console.error("Error al eliminar conversación:", error);
        alert("No se pudo eliminar: " + error.message);
        return;
      }
      // quitar de la lista local
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      // si era la seleccionada, limpiar
      if (selectedSession?.id === session.id) {
        setSelectedSession(null);
        setMessages([]);
      }
    } catch (e: any) {
      console.error("Eliminar conversación ex:", e);
      alert("No se pudo eliminar: " + (e?.message || e));
    }
  }

  // ---------- Enviar mensaje ----------
  async function send() {
    const text = input.trim();
    if (!text || isSending || !canChat || !selectedSession || !userId) return;

    setInput("");
    setIsSending(true);

    // UI + persist user
    const now = new Date();
    setMessages((prev) => [...prev, { role: "user", content: text, createdAt: now }]);
    try {
      const insUser = await supabase.rpc("add_chatbot_message", {
        p_id_session: selectedSession.id,
        p_id_usuario: userId,
        p_role: "user",
        p_texto: text,
      });
      if (insUser.error) console.error("add_chatbot_message (user) error:", insUser.error);
    } catch (e) {
      console.error("add_chatbot_message (user) ex:", e);
    }

    // LLM
    try {
      console.log("🚀 Enviando mensaje al chatbot:", {
        message: text,
        transcriptPath: selectedTranscriptPath,
        sessionId: selectedSession.id
      });

      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          transcriptPath: selectedTranscriptPath,
        }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply ?? "(Sin respuesta)" : `(Error) ${data?.error || res.status}`;

      const now2 = new Date();
      setMessages((prev) => [...prev, { role: "assistant", content: reply, createdAt: now2 }]);

      try {
        const insAsst = await supabase.rpc("add_chatbot_message", {
          p_id_session: selectedSession.id,
          p_id_usuario: userId,
          p_role: "assistant",
          p_texto: reply,
        });
        if (insAsst.error) console.error("add_chatbot_message (assistant) error:", insAsst.error);
      } catch (e) {
        console.error("add_chatbot_message (assistant) ex:", e);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `(Falló la solicitud) ${e?.message || e}`, createdAt: new Date() },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d] items-start justify-center">
      <div className="grid grid-cols-[360px_1fr] gap-8 w-full max-w-5xl mt-12">
        {/* Lista de conversaciones */}
        <aside className="bg-white/70 dark:bg-gray-800 p-6 flex flex-col gap-4 shadow-lg rounded-2xl h-[600px]">
          <h2 className="text-lg font-bold text-orange-500 mb-1 text-center">
            ¡Hola!
          </h2>
          <p className="text-base text-gray-500 text-center mb-2">
            ¿En qué puedo ayudarte hoy?
          </p>
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-12 py-2 rounded-full border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm"
                placeholder="Buscar conversaciones..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow transition"
              title="Nueva conversación"
              onClick={() => setShowCreator(!showCreator)}
            >
              <PlusIcon />
            </button>
          </div>

          {/* Panel de creación */}
          {showCreator && (
            <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="mb-2">
                <strong className="text-orange-700">Crear nueva conversación</strong>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Elegí una transcripción:
              </p>

              {!userId && (
                <p className="text-sm text-gray-500">Cargando usuario...</p>
              )}
              {userId && (
                <>
                  {loadingTranscripts && (
                    <p className="text-sm text-gray-500">Cargando transcripciones…</p>
                  )}
                  {!loadingTranscripts && (transcripts?.length ?? 0) === 0 && (
                    <p className="text-sm text-gray-500">No hay transcripciones.</p>
                  )}
                  <div className="max-h-32 overflow-y-auto">
                    {transcripts.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between mb-1 text-sm"
                      >
                        <div className="truncate pr-2" title={t.titulo}>
                          {t.titulo}
                        </div>
                        <button
                          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
                          onClick={() => createSessionFromTranscript(t)}
                        >
                          Crear
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Lista de conversaciones */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Conversaciones</h3>
            <ul className="flex flex-col gap-2">
              {userId == null && (
                <p className="text-sm text-gray-500">Cargando...</p>
              )}
              {userId != null && sessions.length === 0 && (
                <p className="text-sm text-gray-500">
                  No hay conversaciones. Tocá "+" para crear una.
                </p>
              )}
              {(() => {
                // Filtrar conversaciones por término de búsqueda
                const filteredSessions = searchTerm.trim()
                  ? sessions.filter(session =>
                    session.titulo.toLowerCase().includes(searchTerm.toLowerCase().trim())
                  )
                  : sessions;

                if (searchTerm.trim() && filteredSessions.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No se encontraron conversaciones para "{searchTerm}"
                    </p>
                  );
                }

                return filteredSessions.map((session) => {
                  const isActive = selectedSession?.id === session.id;
                  const isEditing = editingSessionId === session.id;

                  return (
                    <li key={session.id}>
                      <div
                        className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-orange-100 bg-white hover:bg-orange-50 transition font-medium shadow-sm ${isActive
                            ? "bg-orange-100 text-orange-600"
                            : "text-gray-700"
                          }`}
                      >
                        {/* Avatar y título */}
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => !isEditing && onSelectSession(session)}
                        >
                          <Image
                            src="/mascota.png"
                            alt={session.titulo}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                          <div className="flex flex-col items-start flex-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    saveTitle();
                                  } else if (e.key === "Escape") {
                                    cancelEditing();
                                  }
                                }}
                                className="font-semibold bg-white border border-orange-300 rounded px-2 py-1 text-sm w-full"
                                autoFocus
                                onBlur={saveTitle}
                              />
                            ) : (
                              <span className="font-semibold truncate" title={session.titulo}>
                                {session.titulo}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botón de editar */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveTitle}
                              className="p-1 hover:bg-green-100 rounded text-green-600"
                              title="Guardar"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="Cancelar"
                            >
                              <XIcon />
                            </button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                aria-label="Opciones"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-orange-600"
                                title="Opciones"
                              >
                                <MoreIcon />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white">
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  startEditing(session);
                                }}
                                className="cursor-pointer"
                              >
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleDeleteSession(session);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-700"
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </li>
                  );
                })
              })()}
            </ul>
          </div>
        </aside>

        {/* Área de chat */}
        <main className="flex flex-col items-center justify-center bg-white/70 rounded-2xl shadow p-6 h-[600px]">
          {selectedSession ? (
            <div className="w-full h-full flex flex-col">
              {/* Header del chat */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Image
                    src="/mascota.png"
                    alt={selectedSession.titulo}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span className="font-bold text-lg text-gray-700 dark:text-white">
                    {selectedSession.titulo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full p-2 hover:bg-gray-100"
                    title="Cerrar"
                    onClick={() => setSelectedSession(null)}
                  >
                    <XIcon />
                  </button>
                </div>
              </div>
              {/* Línea superior */}
              <div className="border-t border-gray-200 mb-2" />
              {/* Mensajes */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                {messages.length === 0 && !isSending && (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <Image
                        src="/mascota.png"
                        alt="Mascota"
                        width={80}
                        height={80}
                        className="mx-auto opacity-50"
                      />
                    </div>
                    <p className="text-gray-400">
                      Escribí un mensaje para empezar a conversar sobre "{selectedSession.titulo}"
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-xl font-medium shadow ${msg.role === "user"
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
                          : "bg-orange-100 text-orange-700"
                        }`}
                    >
                      {msg.content}
                      <div className="text-xs text-white/80 mt-1 text-right">
                        {fmtTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {/* Línea inferior */}
              <div className="border-t border-gray-200 mt-4" />
              {/* Input para escribir mensajes */}
              <form
                className="w-full flex items-center gap-2 mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  type="text"
                  className="flex-1 rounded-full border border-orange-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  placeholder={`Mensaje para ${selectedSession.titulo}...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!canChat}
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-2 rounded-full font-semibold shadow hover:opacity-90 transition"
                  disabled={!canChat || isSending}
                >
                  {isSending ? "Enviando…" : "Enviar"}
                </button>
              </form>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              {userId && (
                <div className="mb-6">
                  <Image
                    src="/mascota.png"
                    alt="Mascota Boomerang"
                    width={120}
                    height={120}
                    className="mx-auto object-contain"
                  />
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                {userId ? "¡Hola! Soy tu asistente de transcripciones" : "Cargando..."}
              </h3>
              {userId && (
                <p className="text-gray-500 max-w-md">
                  Selecciona una conversación existente o crea una nueva basada en tus transcripciones para comenzar a chatear
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
