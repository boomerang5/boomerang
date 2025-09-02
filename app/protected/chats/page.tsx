"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
// @ts-ignore
import feather from "feather-icons";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/* ===== Tipos ===== */
type Msg = { from: "me" | "them"; text: string; time: string };
type Chat = {
  id: string;
  name: string;
  initials: string;
  time: string;
  unread?: number;
  preview: string;
  online?: boolean;
  messages: Msg[];
  isGroup?: boolean;
  members?: string[];
};
type RawContact = Record<string, any>;
type Contact = { id: string; name: string; initials?: string };

/* ===== Helpers ===== */
function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}
function nowHHMM() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** ====== Mapeo robusto del listado de chats ====== */
function mapRawChatToUI(r: any): Chat {
  const id = String(r?.id_chat ?? r?.chat_id ?? r?.id ?? crypto.randomUUID());
  const isGroup =
    Boolean(r?.is_group ?? r?.grupo ?? r?.es_grupo) ||
    (r?.tipo && String(r.tipo).toLowerCase() === "grupo");

  // 👇 Preferimos SIEMPRE el 'nombre' que devuelve /api/chats/user
  const fallbackName = `Chat ${id}`;
  const name =
    r?.nombre ??
    r?.name ??
    r?.titulo ??
    r?.contacto_nombre ??
    r?.contacto?.nombre ??
    fallbackName;

  const initials = initialsFromName(String(name));

  const preview =
    r?.ultimo_mensaje ??
    r?.last_message?.texto ??
    r?.lastMessage?.text ??
    r?.preview ??
    "";

  const time =
    r?.fecha_ultimo_mensaje ??
    r?.ultima_hora ??
    r?.last_message?.hora ??
    r?.lastMessage?.time ??
    r?.time ??
    "Ahora";

  const unread = Number(r?.no_leidos ?? r?.unread ?? 0) || 0;

  const members: string[] = Array.from(
    (r?.miembros ?? r?.members ?? r?.participantes ?? []) as any[]
  ).map((m: any) => String(m?.id ?? m?.id_usuario ?? m));

  return {
    id,
    name: String(name),
    initials,
    time: String(time),
    unread,
    preview: String(preview),
    online: false,
    messages: [],
    isGroup,
    members,
  };
}

export default function ChatsPage() {
  useEffect(() => {
    feather.replace();
  }, []);

  const supabase = useSupabaseClient();

  /* ===== Estado ===== */
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [unreadById, setUnreadById] = useState<Record<string, number>>({});
  const [messagesById, setMessagesById] = useState<Record<string, Msg[]>>({});
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);

  /* ===== Refs ===== */
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ===== Menús ===== */
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* ===== Modales creación ===== */
  type PickerMode = "none" | "private" | "groupName" | "groupMembers";
  const [pickerMode, setPickerMode] = useState<PickerMode>("none");
  const [contactQuery, setContactQuery] = useState("");

  /* ===== Grupo ===== */
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<Set<string>>(new Set());

  /* ===== Popup miembros ===== */
  const [showMembers, setShowMembers] = useState(false);
  const groupNameBtnRef = useRef<HTMLButtonElement>(null);
  const membersPopupRef = useRef<HTMLDivElement>(null);

  /* ===== Contactos (backend) ===== */
  const [remoteContacts, setRemoteContacts] = useState<Contact[] | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  /* ===== Derivados ===== */
  const selectedChat = useMemo(() => chats.find((c) => c.id === selectedId), [chats, selectedId]);
  const visibleChats = useMemo(() => {
    const list = [...chats];
    list.sort((a, b) => Number(!!archived[a.id]) - Number(!!archived[b.id]));
    return list;
  }, [chats, archived]);

  const contactsForSearch = remoteContacts ?? [];
  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return contactsForSearch.filter((c) => (q ? c.name.toLowerCase().includes(q) : true));
  }, [contactsForSearch, contactQuery]);
  const contactMap = useMemo(() => new Map(contactsForSearch.map((c) => [c.id, c] as const)), [contactsForSearch]);

  /* ===== Efectos ===== */
  useEffect(() => {
    if (!selectedChat) return;
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [selectedChat]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (
        membersPopupRef.current &&
        !membersPopupRef.current.contains(e.target as Node) &&
        groupNameBtnRef.current &&
        !groupNameBtnRef.current.contains(e.target as Node)
      ) {
        setShowMembers(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlusMenuOpen(false);
        setMenuOpen(false);
        setShowMembers(false);
        closeAllPickers();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ===== UI helpers ===== */
  const autoResize = () => {
    const t = textareaRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 120) + "px";
  };
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setUnreadById((p) => ({ ...p, [id]: 0 }));
    setShowMembers(false);
  };

  /* ===== Acciones header ===== */
  const toggleMute = () => {
    if (!selectedId) return;
    setMuted((m) => ({ ...m, [selectedId]: !m[selectedId] }));
    setMenuOpen(false);
  };
  const clearChat = () => {
    if (!selectedId) return;
    setMessagesById((prev) => ({ ...prev, [selectedId]: [] }));
    setChats((prev) => prev.map((c) => (c.id === selectedId ? { ...c, preview: "" } : c)));
    setMenuOpen(false);
  };
  const toggleArchive = () => {
    if (!selectedId) return;
    setArchived((a) => ({ ...a, [selectedId]: !a[selectedId] }));
    setMenuOpen(false);
  };

  /* =========================================================
     Resolver id_usuario y token desde Supabase
     ========================================================= */
  async function resolveIdUsuarioAndToken(): Promise<{ idUsuario: number; accessToken: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? "";
    if (!accessToken) throw new Error("Sin sesión de Supabase");

    const { data: uuidData } = await supabase.rpc("get_usuario_uuid");
    const uuid: string =
      (typeof uuidData === "string" && uuidData) ||
      (uuidData && (uuidData as any).uuid) ||
      (uuidData && (uuidData as any).user_uuid) ||
      sessionData?.session?.user?.id;

    if (!uuid) throw new Error("No se pudo resolver el UUID del usuario");

    const { data: row, error } = await supabase.from("Usuario").select("id").eq("User_id", uuid).maybeSingle();

    if (error) throw error;
    const idUsuario = Number(row?.id);
    if (!idUsuario) throw new Error("No se encontró el id de Usuario");

    return { idUsuario, accessToken };
  }

  /* ===== Contactos backend ===== */
  function mapContact(c: RawContact): Contact {
    const nombre = [c?.nombre, c?.apellido].filter(Boolean).join(" ").trim();
    const display = nombre || c?.apodo || `Contacto ${c?.id_usuario_contacto ?? c?.id ?? ""}`;
    const id = String(c?.id_usuario_contacto ?? c?.id ?? c?.user_id ?? crypto.randomUUID());
    return { id, name: display, initials: initialsFromName(display) };
  }
  async function loadContactsFromBackend(search?: string) {
    try {
      setContactsLoading(true);
      setContactsError(null);

      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      const params = new URLSearchParams();
      params.set("id_usuario", String(idUsuario));
      if (search && search.trim()) params.set("busqueda", search.trim());

      const url = `/api/contactos/misContactos?${params.toString()}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Error misContactos:", r.status, txt);
        throw new Error("No se pudieron cargar los contactos.");
      }

      const json = await r.json();
      const arr: RawContact[] = Array.isArray(json) ? json : json?.items ?? json?.data ?? [];
      setRemoteContacts(arr.map(mapContact));
    } catch (err: any) {
      setRemoteContacts([]);
      setContactsError(err?.message || "No se pudieron cargar los contactos.");
    } finally {
      setContactsLoading(false);
    }
  }

  /* ===== CHATS: cargar listado ===== */
  async function loadUserChatsFromBackend() {
    try {
      setChatsLoading(true);
      setChatsError(null);

      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      const url = `/api/chats/user?id_usuario=${encodeURIComponent(String(idUsuario))}`;
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Error /api/chats/user:", r.status, txt);
        throw new Error("No se pudieron cargar tus chats.");
      }

      const json = await r.json();
      const arr: any[] = Array.isArray(json) ? json : json?.items ?? json?.data ?? [];
      const mapped = arr.map(mapRawChatToUI);

      setChats(mapped);
      setMessagesById(Object.fromEntries(mapped.map((c) => [c.id, [] as Msg[]])));
      setUnreadById(Object.fromEntries(mapped.map((c) => [c.id, c.unread ?? 0])));
      setSelectedId((prev) => prev || (mapped[0]?.id ?? ""));

      // Enriquecer nombres con /api/chats/info (para privados sin nombre)
      await enrichChatsWithInfo(mapped);
    } catch (err: any) {
      setChats([]);
      setMessagesById({});
      setUnreadById({});
      setSelectedId("");
      setChatsError(err?.message || "No se pudieron cargar tus chats.");
    } finally {
      setChatsLoading(false);
    }
  }

  // ===== Enriquecer nombres/miembros con /api/chats/info =====
  async function enrichChatsWithInfo(list: Chat[]) {
    if (!list.length) return;

    const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

    const full = (o: any) => [o?.nombre, o?.apellido].filter(Boolean).join(" ").trim();
    const firstNonMe = (arr: any[]) =>
      arr.find((p) => String(p?.id_usuario ?? p?.id ?? p) !== String(idUsuario)) ?? arr[0];

    const requests = list.map(async (c) => {
      try {
        const url = `/api/chats/info?id_usuario=${encodeURIComponent(
          String(idUsuario)
        )}&id_chat=${encodeURIComponent(String(c.id))}`;

        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });

        if (!r.ok) {
          console.warn("[/api/chats/info]", c.id, r.status, await r.text());
          return { id: c.id, info: null };
        }
        const info = await r.json();
        return { id: c.id, info };
      } catch (e) {
        console.warn("[/api/chats/info] fallo", c.id, e);
        return { id: c.id, info: null };
      }
    });

    const results = await Promise.all(requests);

    setChats((prev) => {
      const byId = new Map(prev.map((x) => [x.id, x] as const));

      for (const { id, info } of results) {
        if (!info) continue;
        const current = byId.get(id);
        if (!current) continue;

        const isGroup =
          Boolean(info?.is_group ?? info?.grupo ?? info?.es_grupo) ||
          (info?.tipo && String(info.tipo).toLowerCase() === "grupo");

        const members: string[] = Array.from(
          (info?.miembros ?? info?.members ?? info?.participantes ?? []) as any[]
        ).map((m: any) => String(m?.id ?? m?.id_usuario ?? m));

        let name = "";
        if (isGroup) {
          const gName =
            info?.nombre ?? info?.titulo ?? info?.group_name ?? info?.nombre_grupo ?? "";
          name = (gName && String(gName).trim()) || current.name;
        } else {
          const contacto = info?.contacto ?? info?.peer ?? info?.otro ?? null;
          if (contacto) {
            const firstTry = contacto?.nombre_completo ?? full(contacto);
            name = (firstTry && String(firstTry).trim())
              || (contacto?.apodo && String(contacto.apodo).trim())
              || (contacto?.nombre && String(contacto.nombre).trim())
              || current.name;
          } else if (Array.isArray(info?.participantes ?? info?.members)) {
            const p = firstNonMe(info?.participantes ?? info?.members);
            if (p) {
              const firstTry = p?.nombre_completo ?? full(p);
              name = (firstTry && String(firstTry).trim())
                || (p?.apodo && String(p.apodo).trim())
                || (p?.nombre && String(p.nombre).trim())
                || current.name;
            }
          }
        }

        const initials = initialsFromName(name || current.name);
        const preview = (info?.ultimo_mensaje ?? info?.last_message?.texto) ?? current.preview;
        const time = (info?.ultima_hora ?? info?.last_message?.hora) ?? current.time;

        byId.set(id, {
          ...current,
          name: name || current.name,
          initials,
          isGroup,
          members: members.length ? members : current.members,
          preview: String(preview ?? ""),
          time: String(time ?? current.time),
        });
      }

      return Array.from(byId.values());
    });
  }

  /* ===== cargar al entrar ===== */
  useEffect(() => {
    loadUserChatsFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Menú “+” ===== */
  const startPrivateFlow = async () => {
    setPlusMenuOpen(false);
    setContactQuery("");
    await loadContactsFromBackend();
    setPickerMode("private");
  };
  const startGroupFlow = async () => {
    setPlusMenuOpen(false);
    setGroupName("");
    setGroupMembers(new Set());
    setContactQuery("");
    await loadContactsFromBackend();
    setPickerMode("groupName");
  };
  const closeAllPickers = () => {
    setPickerMode("none");
    setContactQuery("");
    setGroupName("");
    setGroupMembers(new Set());
  };

  /* ===== Crear chats ===== */
  const createOrOpenPrivateChat = async (ct: Contact) => {
    try {
      const exists = chats.find((c) => c.id === ct.id && !c.isGroup);
      if (exists) {
        handleSelect(exists.id);
        closeAllPickers();
        return;
      }

      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      const r = await fetch("/api/chats/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id_usuario: idUsuario,
          id_contacto: Number(ct.id),
        }),
      });

      let newChatId = ct.id; // fallback
      if (r.ok) {
        const json = await r.json().catch(() => ({}));
        if (json?.id_chat != null) newChatId = String(json.id_chat);
      } else {
        console.warn("[/api/chats/create] status:", r.status, await r.text());
      }

      const newChat: Chat = {
        id: newChatId,
        name: ct.name,
        initials: ct.initials ?? initialsFromName(ct.name),
        time: "Ahora",
        preview: "",
        online: true,
        messages: [],
        isGroup: false,
      };
      setChats((prev) => [...prev, newChat]);
      setMessagesById((prev) => ({ ...prev, [newChat.id]: [] }));
      setUnreadById((prev) => ({ ...prev, [newChat.id]: 0 }));
      handleSelect(newChat.id);
      closeAllPickers();
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    } catch (e) {
      console.error(e);
    }
  };

  const createGroupChat = async () => {
    const name = groupName.trim();
    if (!name || groupMembers.size === 0) return;

    try {
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      const ids = Array.from(groupMembers)
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n));

      const r = await fetch("/api/chats/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id_usuario: idUsuario,
          nombre: name,
          id_contactos: ids,
          miembros: ids,
          tipo: "grupo",
        }),
      });

      let newId = `group-${Date.now()}`;
      if (r.ok) {
        const json = await r.json().catch(() => ({}));
        if (json?.id_chat != null) newId = String(json.id_chat);
      } else {
        console.warn("[/api/chats/create] status:", r.status, await r.text());
      }

      const newChat: Chat = {
        id: newId,
        name,
        initials: initialsFromName(name),
        time: "Ahora",
        preview: "",
        online: true,
        messages: [],
        isGroup: true,
        members: Array.from(groupMembers),
      };
      setChats((prev) => [...prev, newChat]);
      setMessagesById((prev) => ({ ...prev, [newChat.id]: [] }));
      setUnreadById((prev) => ({ ...prev, [newChat.id]: 0 }));
      handleSelect(newChat.id);
      closeAllPickers();
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    } catch (e) {
      console.error(e);
    }
  };

  /* ===== Envío local ===== */
  const handleSend = () => {
    const txt = messageText.trim();
    if (!txt || !selectedId || sending) return;
    setSending(true);
    const msg: Msg = { from: "me", text: txt, time: nowHHMM() };
    setMessagesById((prev) => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), msg] }));
    setChats((prev) => prev.map((c) => (c.id === selectedId ? { ...c, preview: txt, time: msg.time } : c)));
    setMessageText("");
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
      setSending(false);
    }, 0);
  };

  return (
    <div className="flex min-h-screen bg-orange-50 dark:bg-[#0d0d0d]">
      {/* ===== Sidebar ===== */}
      <aside className="w-20 bg-white/20 dark:bg-white/10 backdrop-blur-md flex flex-col justify-between items-center py-4">
        <div className="flex flex-col items-center gap-6 mt-4">
          <Link href="/protected">
            <i data-feather="home" className="text-black dark:text-white w-5 h-5" />
          </Link>

          <Link href="/protected/perfil">
            <i data-feather="user" className="text-black dark:text-white w-5 h-5" />
          </Link>

          <i data-feather="video" className="text-black dark:text-white w-5 h-5" />

          <Link href="/protected/contactos">
            <i data-feather="users" className="text-black dark:text-white w-5 h-5" />
          </Link>

          {/* Chat (activo) */}
          <Link href="/protected/chats" aria-label="Ir a chats">
            <i data-feather="message-circle" className="text-orange-500 w-5 h-5" />
          </Link>

          <i data-feather="calendar" className="text-black dark:text-white w-5 h-5" />
        </div>
        <div className="flex flex-col items-center gap-5 mb-4">
          <i data-feather="help-circle" className="text-black dark:text-white w-5 h-5" />
          <i data-feather="settings" className="text-black dark:text-white w-5 h-5" />
        </div>
      </aside>

      {/* ===== Main ===== */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-[320px_1fr]">
          {/* ===== Lista de chats ===== */}
          <aside className="rounded-2xl bg-white/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#f16f24]">Mis chats</h2>
              <Link href="/protected" className="text-sm text-[#de4435] hover:underline">
                Volver
              </Link>
            </div>

            <div className="mb-4 relative" ref={plusMenuRef}>
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
                <button
                  type="button"
                  onClick={() => setPlusMenuOpen((v) => !v)}
                  title="Nuevo chat"
                  className="ml-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f16f24] text-white hover:opacity-95"
                  aria-label="Nuevo chat"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
                  </svg>
                </button>
              </div>

              {plusMenuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-black/10 bg-white/95 shadow-xl backdrop-blur">
                  <button onClick={startPrivateFlow} className="w-full px-3 py-2 text-sm text-left hover:bg-black/5">
                    Chat privado
                  </button>
                  <button onClick={startGroupFlow} className="w-full px-3 py-2 text-sm text-left hover:bg-black/5">
                    Chat grupal
                  </button>
                </div>
              )}
            </div>

            <ul className="space-y-2">
              {chatsLoading && <li className="px-2 py-2 text-sm text-black/60">Cargando tus chats…</li>}
              {!chatsLoading && chatsError && <li className="px-2 py-2 text-sm text-red-600">{chatsError}</li>}

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
                              {c.isGroup && (
                                <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">Grupo</span>
                              )}
                              {isArchived && (
                                <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">Archivado</span>
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

                        {unread > 0 && (
                          <span className="ml-2 shrink-0 rounded-full bg-[#de4435] px-2 py-0.5 text-xs font-medium text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
              {!chatsLoading && !chatsError && !visibleChats.length && (
                <li className="px-2 py-2 text-sm text-black/60">Todavía no tenés chats. Creá uno con el botón “+”.</li>
              )}
            </ul>
          </aside>

          {/* ===== Conversación ===== */}
          {selectedChat ? (
            <section className="relative flex min-h-[70vh] flex-col rounded-2xl bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
              {/* Header */}
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
                      {selectedChat.isGroup ? (
                        <button
                          ref={groupNameBtnRef}
                          onClick={() => setShowMembers((v) => !v)}
                          className="underline decoration-transparent hover:decoration-[#f16f24] underline-offset-4 transition text-left"
                          title="Ver participantes"
                        >
                          {selectedChat.name}
                        </button>
                      ) : (
                        <span>{selectedChat.name}</span>
                      )}
                      {selectedChat.isGroup && (
                        <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">Grupo</span>
                      )}
                    </p>
                    <p className="text-xs text-black/50">{selectedChat.online ? "En línea" : "Desconectado"}</p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2" ref={menuRef}>
                  <button
                    title="Llamar"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.6,10.8C7.9,13.3,10.2,15.6,12.7,16.9L15,14.6c0.3-0.3,0.8-0.4,1.2-0.3c1.3,0.4,2.6,0.6,4,0.6 c0.7,0,1.3,0.6,1.3,1.3v3.9c0,0.7-0.6,1.3-1.3,1.3C10.6,21.5,2.5,13.4,2.5,3.3C2.5,2.6,3.1,2,3.8,2h3.9c0.7,0,1.3,0.6,1.3,1.3 c0,1.4,0.2,2.7,0.6,4C9.8,7.9,9.7,8.4,9.4,8.7L6.6,10.8z" />
                    </svg>
                  </button>

                  <button
                    title="Videollamada"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7c0-0.55-0.45-1-1-1H4C3.45 6 3 6.45 3 7v10c0 0.55 0 1 1 1h12c0.55 0 1-0.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                  </button>

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
                          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                            <path d="M10 21h4a2 2 0 0 1-4 0m10-4h-2v-7a6 6 0 1 0-12 0v7H4v2h16z" />
                          </svg>
                          {muted[selectedId] ? "Quitar silencio" : "Silenciar"}
                        </button>

                        <button
                          role="menuitem"
                          onClick={clearChat}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                            <path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 12h12a2 2 0 0 0 2-2V9H4v10a2 2 0 0 0 2 2Z" />
                          </svg>
                          Vaciar chat
                        </button>

                        <button
                          role="menuitem"
                          onClick={toggleArchive}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-black/80 hover:bg-black/5"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                            <path d="M3 3h18v4H3V3Zm2 6h14v12H5V9Zm2 2v8h10v-8H7Z" />
                          </svg>
                          {archived[selectedId] ? "Desarchivar" : "Archivar"}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedId("");
                      setShowMembers(false);
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

              {/* Popup participantes */}
              {selectedChat.isGroup && showMembers && (
                <div
                  ref={membersPopupRef}
                  className="absolute left-5 top-[64px] z-30 w-72 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-xl backdrop-blur"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#2b2b2b]">Participantes</p>
                    <button
                      onClick={() => setShowMembers(false)}
                      className="h-7 w-7 rounded-full border border-black/10 text-black/60 hover:bg-black/5"
                      title="Cerrar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                        />
                      </svg>
                    </button>
                  </div>

                  <ul className="max-h-64 overflow-y-auto">
                    {selectedChat.members?.length ? (
                      selectedChat.members.map((id) => {
                        const ct = contactMap.get(id);
                        const name = ct?.name ?? id;
                        const ini = (ct?.initials ?? initialsFromName(name)) || "•";
                        return (
                          <li key={id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-black/5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] text-sm font-semibold">
                              {ini}
                            </div>
                            <span className="text-sm text-[#2b2b2b]">{name}</span>
                          </li>
                        );
                      })
                    ) : (
                      <li className="px-2 py-2 text-sm text-black/60">Sin miembros</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Historial */}
              <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="text-xs text-black/50">Hoy</span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                {messagesById[selectedId]?.length ? (
                  messagesById[selectedId].map((m, i) =>
                    m.from === "them" ? (
                      <div key={i} className="flex items-end gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-[#f16f24]/10 text-center leading-9 text-[#f16f24] font-semibold">
                          {selectedChat.initials[0]}
                        </div>
                        <div className="max-w-[70%] rounded-2xl rounded-tl-md bg-white p-3 shadow-sm ring-1 ring-black/5">
                          <p className="text-sm text-[#2b2b2b]">{m.text}</p>
                          <div className="mt-1 text-right text-[11px] text-black/45">{m.time}</div>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex items-end justify-end gap-3">
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

              {/* Composer */}
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
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f16f24] to-[#de4435] px-4 py-2 text-sm font-medium text-white shadow hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
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
            <section className="flex min-h-[70vh] items-center justify-center rounded-2xl bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#f16f24]/10" />
                <p className="text-sm text-black/60">Selecciona un chat para comenzar</p>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ===== MODALES ===== */}

      {/* PRIVADO */}
      {pickerMode === "private" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <h3 className="text-base font-semibold text-[#2b2b2b]">Nuevo chat privado</h3>
              <button
                onClick={closeAllPickers}
                className="h-8 w-8 rounded-full border border-black/10 text-black/60 hover:bg-black/5"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                  />
                </svg>
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="flex items-center rounded-xl border border-black/10 bg-white px-3">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C15.99 6.01 13.98 4 11.49 4S7 6.01 7 9s2.01 5 4.49 5c1.61 0 3.06-.66 4.1-1.73l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0c.41-.41.41-1.08 0-1.49L15.5 14Zm-4.01 0C9.01 14 7 11.99 7 9s2.01-5 4.49-5S16 6.01 16 9s-2.01 5-4.51 5Z"
                  />
                </svg>
                <input
                  autoFocus
                  placeholder="Buscar contacto…"
                  className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-black/40"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="px-2">
              {contactsLoading && <p className="px-2 py-2 text-sm text-black/60">Cargando contactos…</p>}
              {contactsError && !contactsLoading && <p className="px-2 py-2 text-sm text-red-600">{contactsError}</p>}
            </div>

            <ul className="max-h-[50vh] overflow-y-auto px-2 py-3">
              {filteredContacts.map((ct) => {
                const initials = ct.initials ?? initialsFromName(ct.name);
                return (
                  <li key={ct.id}>
                    <button
                      onClick={() => createOrOpenPrivateChat(ct)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-black/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] font-semibold">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2b2b2b]">{ct.name}</p>
                        <p className="text-xs text-black/50">Crear / abrir chat</p>
                      </div>
                    </button>
                  </li>
                );
              })}
              {!contactsLoading && !contactsError && filteredContacts.length === 0 && (
                <li className="px-3 py-2 text-sm text-black/60">Sin resultados</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* GRUPO: paso 1 */}
      {pickerMode === "groupName" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <h3 className="text-base font-semibold text-[#2b2b2b]">Nuevo chat grupal</h3>
              <button
                onClick={closeAllPickers}
                className="h-8 w-8 rounded-full border border-black/10 text-black/60 hover:bg-black/5"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                  />
                </svg>
              </button>
            </div>

            <div className="px-4 py-4">
              <label className="text-sm text-black/70">Nombre del grupo</label>
              <input
                autoFocus
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ej: Proyecto Boomerang"
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 outline-none focus:ring-2 focus:ring-[#f16f24]/30"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={closeAllPickers} className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5">
                  Cancelar
                </button>
                <button
                  onClick={() => setPickerMode("groupMembers")}
                  disabled={!groupName.trim()}
                  className="rounded-lg bg-[#f16f24] px-3 py-2 text-sm text-white disabled:opacity-60"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRUPO: paso 2 */}
      {pickerMode === "groupMembers" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <h3 className="text-base font-semibold text-[#2b2b2b]">
                Agregar miembros • <span className="text-black/60">{groupName}</span>
              </h3>
              <button
                onClick={closeAllPickers}
                className="h-8 w-8 rounded-full border border-black/10 text-black/60 hover:bg-black/5"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                  />
                </svg>
              </button>
            </div>

            <div className="px-4 pt-3">
              <div className="flex items-center rounded-xl border border-black/10 bg-white px-3">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C15.99 6.01 13.98 4 11.49 4S7 6.01 7 9s2.01 5 4.49 5c1.61 0 3.06-.66 4.1-1.73l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0c.41-.41.41-1.08 0-1.49L15.5 14Zm-4.01 0C9.01 14 7 11.99 7 9s2.01-5 4.49-5S16 6.01 16 9s-2.01 5-4.51 5Z"
                  />
                </svg>
                <input
                  placeholder="Buscar contacto…"
                  className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-black/40"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                />
              </div>
            </div>

            <ul className="max-h-[45vh] overflow-y-auto px-2 py-3">
              {filteredContacts.map((ct) => {
                const initials = ct.initials ?? initialsFromName(ct.name);
                const checked = groupMembers.has(ct.id);
                return (
                  <li key={ct.id}>
                    <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-black/5">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => {
                          setGroupMembers((prev) => {
                            const next = new Set(prev);
                            if (next.has(ct.id)) next.delete(ct.id);
                            else next.add(ct.id);
                            return next;
                          });
                        }}
                      />
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] font-semibold">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2b2b2b]">{ct.name}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between border-t border-black/10 px-4 py-3">
              <span className="text-sm text-black/60">
                {groupMembers.size} seleccionado{groupMembers.size === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPickerMode("groupName")} className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5">
                  Atrás
                </button>
                <button
                  onClick={createGroupChat}
                  disabled={!groupName.trim() || groupMembers.size === 0}
                  className="rounded-lg bg-[#f16f24] px-3 py-2 text-sm text-white disabled:opacity-60"
                >
                  Crear grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
