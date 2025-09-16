"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
// @ts-ignore
import feather from "feather-icons";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

/* ===== Tipos ===== */
type Msg = {
  id?: number; // id fila de Mensaje
  from: "me" | "them";
  text: string;
  time: string;
  eliminado?: boolean | null;
};
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
  /** 1 = privado, 2 = grupal (preferido) */
  idTipoChat?: number;
  members?: string[];
};
type RawContact = Record<string, any>;
type Contact = { id: string; name: string; initials?: string };
type Participant = { id: string; name: string; initials?: string };

// Fila cruda de DB (Mensaje)
type DBMessage = {
  id: number;
  id_chat: number;
  id_emisor: number;
  fecha: string;
  texto: string;
  eliminado: boolean | null;
  id_archivo?: number | null;
};

/* ===== Helpers ===== */
function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}
function nowHHMM(ts?: string | number | Date) {
  try {
    return new Date(ts ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function toMillis(s: string | number | Date | undefined) {
  const t = s ? new Date(s).getTime() : NaN;
  return Number.isFinite(t) ? t : Date.now();
}

/** ====== Mapeo robusto del listado de chats (usa id_tipo_chat si viene) ====== */
function mapRawChatToUI(r: any): Chat {
  const id = String(r?.id_chat ?? r?.chat_id ?? r?.id ?? crypto.randomUUID());

  // Normalizamos id_tipo_chat desde distintas claves
  const idTipoChatRaw = r?.id_tipo_chat ?? r?.tipo_chat_id ?? r?.tipo_chat ?? r?.idTipoChat;
  const idTipoChat = Number.isFinite(Number(idTipoChatRaw)) ? Number(idTipoChatRaw) : undefined;

  const isGroup =
    (idTipoChat === 2) ||
    Boolean(r?.is_group ?? r?.grupo ?? r?.es_grupo) ||
    (r?.tipo && String(r.tipo).toLowerCase() === "grupo");

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
    idTipoChat,
    members,
  };
}

/* ===== Heurística para detectar/grabar "grupal" incluso en chats viejos ===== */
function groupFlagFromInfoLike(obj: any): boolean {
  // Si viene id_tipo_chat del /info, es la fuente de verdad
  const idTipoChatRaw = obj?.id_tipo_chat ?? obj?.tipo_chat_id ?? obj?.tipo_chat ?? obj?.idTipoChat;
  const idTipoChat = Number.isFinite(Number(idTipoChatRaw)) ? Number(idTipoChatRaw) : undefined;

  return Boolean(
    (idTipoChat === 2) ||
      obj?.is_group ||
      obj?.grupo ||
      obj?.es_grupo ||
      (obj?.tipo && String(obj.tipo).toLowerCase() === "grupo") ||
      obj?.id_grupo ||
      obj?.group_id
  );
}
function isGroupLike(c?: Chat | null): boolean {
  if (!c) return false;
  if (c.idTipoChat === 2) return true;           // preferimos dato oficial
  if (c.idTipoChat === 1) return false;
  if (c.isGroup) return true;
  if (Array.isArray(c.members) && c.members.length >= 3) return true;
  return false;
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

  // Para mapear me/them
  const [myUserId, setMyUserId] = useState<number | null>(null);

  // Solo mensajes no eliminados
  const ONLY_ACTIVE = true;

  // Última actividad por chat (para ordenar por "reciente primero")
  const [lastActivityById, setLastActivityById] = useState<Record<string, number>>({});

  /* ===== Refs ===== */
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const globalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Estado de participantes (cargados desde /api/chats/info)
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  /* ===== Contactos (backend) ===== */
  const [remoteContacts, setRemoteContacts] = useState<Contact[] | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  /* ===== Derivados ===== */
  const [search, setSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"all" | "private" | "group">("all");
  const selectedChat = useMemo(() => chats.find((c) => c.id === selectedId), [chats, selectedId]);

  // Orden visible de chats + filtro por búsqueda
  const visibleChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = query
      ? chats.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            (c.preview || "").toLowerCase().includes(query)
        )
      : [...chats];

    if (chatFilter !== "all") {
      const wantGroup = chatFilter === "group";
      list = list.filter((c) =>
        wantGroup
          ? (c.idTipoChat === 2 || isGroupLike(c))
          : (c.idTipoChat === 1 || (!c.idTipoChat && !isGroupLike(c)))
      );
    }

    list.sort((a, b) => {
      const archCmp = Number(!!archived[a.id]) - Number(!!archived[b.id]);
      if (archCmp !== 0) return archCmp;
      const la = lastActivityById[a.id] ?? 0;
      const lb = lastActivityById[b.id] ?? 0;
      return lb - la;
    });
    return list;
  }, [search, chats, archived, lastActivityById, chatFilter]);

  const contactsForSearch = remoteContacts ?? [];
  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return contactsForSearch.filter((c) => (q ? c.name.toLowerCase().includes(q) : true));
  }, [contactsForSearch, contactQuery]);
  const contactMap = useMemo(() => new Map(contactsForSearch.map((c) => [c.id, c] as const)), [contactsForSearch]);

  /* ===== Efectos UI ===== */
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
    // limpiar estado de participantes al cambiar de chat
    setParticipants([]);
    setParticipantsError(null);
    setParticipantsLoading(false);
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

      const url = `/api/contacts/misContactos?${params.toString()}`;
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

      // Inicializamos "última actividad"
      const base = Date.now();
      const initLA = Object.fromEntries(mapped.map((c, i) => [c.id, base - i])) as Record<string, number>;
      setLastActivityById(initLA);

      // Enriquecer nombres/miembros
      await enrichChatsWithInfo(mapped);

      // Guardar mi id_usuario
      setMyUserId(idUsuario);
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

  // ===== Enriquecer nombres/miembros con /api/chats/info (bulk) =====
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

      const updatesLA: Record<string, number> = {};

      for (const { id, info } of results) {
        if (!info) continue;
        const current = byId.get(id);
        if (!current) continue;

        const idTipoChatRaw = info?.id_tipo_chat ?? info?.tipo_chat_id ?? info?.tipo_chat ?? info?.idTipoChat;
        const idTipoChat = Number.isFinite(Number(idTipoChatRaw)) ? Number(idTipoChatRaw) : current.idTipoChat;

        const isGroup =
          (idTipoChat === 2) ||
          Boolean(info?.is_group ?? info?.grupo ?? info?.es_grupo) ||
          (info?.tipo && String(info.tipo).toLowerCase() === "grupo") ||
          (Array.isArray(info?.participantes ?? info?.members) &&
            (info?.participantes ?? info?.members).length >= 3);

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
            name =
              (firstTry && String(firstTry).trim()) ||
              (contacto?.apodo && String(contacto.apodo).trim()) ||
              (contacto?.nombre && String(contacto.nombre).trim()) ||
              current.name;
          } else if (Array.isArray(info?.participantes ?? info?.members)) {
            const p = firstNonMe(info?.participantes ?? info?.members);
            if (p) {
              const firstTry = p?.nombre_completo ?? full(p);
              name =
                (firstTry && String(firstTry).trim()) ||
                (p?.apodo && String(p.apodo).trim()) ||
                (p?.nombre && String(p.nombre).trim()) ||
                current.name;
            }
          }
        }

        const initials = initialsFromName(name || current.name);
        const preview = (info?.ultimo_mensaje ?? info?.last_message?.texto) ?? current.preview;
        const time = (info?.ultima_hora ?? info?.last_message?.hora) ?? current.time;

        if (info?.ultima_hora || info?.last_message?.hora) {
          updatesLA[id] = toMillis(info?.ultima_hora ?? info?.last_message?.hora);
        }

        byId.set(id, {
          ...current,
          name: name || current.name,
          initials,
          isGroup,
          idTipoChat,
          members: members.length ? members : current.members,
          preview: String(preview ?? ""),
          time: String(time ?? current.time),
        });
      }

      if (Object.keys(updatesLA).length) {
        setLastActivityById((prev) => ({ ...prev, ...updatesLA }));
      }

      return Array.from(byId.values());
    });
  }

  /* ===== Nuevo: refrescar info del chat seleccionado (para grupos antiguos) ===== */
  async function refreshSingleChatInfo(chatId: string) {
    try {
      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      const url = `/api/chats/info?id_usuario=${encodeURIComponent(
        String(idUsuario)
      )}&id_chat=${encodeURIComponent(String(chatId))}`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!r.ok) {
        return;
      }
      const info = await r.json();

      const idTipoChatRaw = info?.id_tipo_chat ?? info?.tipo_chat_id ?? info?.tipo_chat ?? info?.idTipoChat;
      const idTipoChat = Number.isFinite(Number(idTipoChatRaw)) ? Number(idTipoChatRaw) : undefined;

      const isGroup =
        (idTipoChat === 2) ||
        Boolean(info?.is_group ?? info?.grupo ?? info?.es_grupo) ||
        (info?.tipo && String(info.tipo).toLowerCase() === "grupo") ||
        (Array.isArray(info?.participantes ?? info?.members) &&
          (info?.participantes ?? info?.members).length >= 3);

      const members: string[] = Array.from(
        (info?.miembros ?? info?.members ?? info?.participantes ?? []) as any[]
      ).map((m: any) => String(m?.id ?? m?.id_usuario ?? m));

      const full = (o: any) => [o?.nombre, o?.apellido].filter(Boolean).join(" ").trim();
      let newName = "";
      if (isGroup) {
        newName =
          info?.nombre ??
          info?.titulo ??
          info?.group_name ??
          info?.nombre_grupo ??
          "";
      } else {
        const contacto = info?.contacto ?? info?.peer ?? info?.otro ?? null;
        if (contacto) {
          newName =
            contacto?.nombre_completo ??
            full(contacto) ??
            contacto?.apodo ??
            contacto?.nombre ??
            "";
        }
      }

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                isGroup,
                idTipoChat: idTipoChat ?? c.idTipoChat,
                members: members.length ? members : c.members,
                name: newName ? String(newName).trim() : c.name,
                initials: initialsFromName(newName ? String(newName).trim() : c.name),
              }
            : c
        )
      );
    } catch {
      // Silencioso
    }
  }

  /* ====== Carga de participantes para el pop-up ====== */
  async function loadParticipants(chatId: string) {
    try {
      setParticipantsLoading(true);
      setParticipantsError(null);

      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();
      const url = `/api/chats/info?id_usuario=${encodeURIComponent(
        String(idUsuario)
      )}&id_chat=${encodeURIComponent(String(chatId))}`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.warn("Error /api/chats/info:", r.status, txt);
        throw new Error("No se pudieron cargar los participantes.");
      }

      const info = await r.json();
      const arr: any[] = Array.isArray(info?.miembros ?? info?.members ?? info?.participantes)
        ? (info?.miembros ?? info?.members ?? info?.participantes)
        : [];

      const list: Participant[] = arr.map((m: any) => {
        const id = String(m?.id_usuario ?? m?.id ?? m?.user_id ?? m);
        const nameCandidate =
          m?.nombre_completo ||
          [m?.nombre, m?.apellido].filter(Boolean).join(" ").trim() ||
          m?.apodo ||
          m?.nombre ||
          `Usuario ${id}`;
        return { id, name: String(nameCandidate), initials: initialsFromName(String(nameCandidate)) };
      });

      setParticipants(list);
    } catch (e: any) {
      setParticipants([]);
      setParticipantsError(e?.message || "No se pudieron cargar los participantes.");
    } finally {
      setParticipantsLoading(false);
    }
  }

  /* ===== cargar al entrar ===== */
  useEffect(() => {
    loadUserChatsFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Suscripción Realtime por chat seleccionado ===== */
  useEffect(() => {
    // Heurística + fetch perezoso: si no detectamos grupo, tratamos de completarlo.
    // Si ya viene idTipoChat, lo respetamos.
    if (selectedId) {
      const sc = chats.find((c) => c.id === selectedId);
      if (sc) {
        if (sc.idTipoChat === 2 && !sc.isGroup) {
          // Marcar como grupo en base al dato oficial
          setChats((prev) => prev.map((c) => (c.id === sc.id ? { ...c, isGroup: true } : c)));
        } else if (sc.idTipoChat !== 1 && !isGroupLike(sc)) {
          (async () => {
            try {
              const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();
              const url = `/api/chats/info?id_usuario=${encodeURIComponent(
                String(idUsuario)
              )}&id_chat=${encodeURIComponent(String(sc.id))}`;
              const r = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: "no-store",
              });
              if (!r.ok) return;
              const info = await r.json();
              const members: string[] = Array.from(
                (info?.miembros ?? info?.members ?? info?.participantes ?? []) as any[]
              ).map((m: any) => String(m?.id ?? m?.id_usuario ?? m));
              const idTipoChatRaw = info?.id_tipo_chat ?? info?.tipo_chat_id ?? info?.tipo_chat ?? info?.idTipoChat;
              const idTipoChat = Number.isFinite(Number(idTipoChatRaw)) ? Number(idTipoChatRaw) : sc.idTipoChat;
              const flag = (idTipoChat === 2) || groupFlagFromInfoLike(info) || members.length >= 3;

              if (flag || members.length || idTipoChat) {
                setChats((prev) =>
                  prev.map((c) =>
                    c.id === sc.id
                      ? {
                          ...c,
                          idTipoChat: idTipoChat ?? c.idTipoChat,
                          isGroup: flag || c.isGroup,
                          members: members.length ? members : c.members,
                        }
                      : c
                  )
                );
              }
            } catch {}
          })();
        }
      }
    }

    const unsubscribe = async () => {
      const ch = channelRef.current;
      if (ch) {
        try {
          await ch.unsubscribe();
        } catch {}
        channelRef.current = null;
      }
    };

    if (!selectedId) {
      unsubscribe();
      return;
    }

    (async () => {
      try {
        const { idUsuario } = await resolveIdUsuarioAndToken();
        setMyUserId(idUsuario);

        await loadHistoryFromDB(selectedId, idUsuario);

        const chatNum = Number(selectedId);
        const ch = supabase
          .channel(`mensaje-chat-${chatNum}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "Mensaje", filter: `id_chat=eq.${chatNum}` },
            (payload) => {
              const row = payload.new as DBMessage;
              if (ONLY_ACTIVE && row.eliminado === true) return;
              appendIncomingRow(row, idUsuario);
            }
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "Mensaje", filter: `id_chat=eq.${chatNum}` },
            (payload) => {
              const row = payload.new as DBMessage;
              if (ONLY_ACTIVE && row.eliminado === true) {
                setMessagesById((prev) => ({
                  ...prev,
                  [selectedId]: (prev[selectedId] ?? []).filter((m) => m.id !== row.id),
                }));
                return;
              }
              setMessagesById((prev) => {
                const list = prev[selectedId] ?? [];
                const idx = list.findIndex((m) => m.id === row.id);
                const msg = dbRowToMsg(row, idUsuario);
                if (idx === -1) return { ...prev, [selectedId]: [...list, msg] };
                const next = [...list];
                next[idx] = msg;
                return { ...prev, [selectedId]: next };
              });
              setLastActivityById((prev) => ({ ...prev, [String(row.id_chat)]: toMillis(row.fecha) }));
            }
          )
          .subscribe();

        channelRef.current = ch;
      } catch (e) {
        console.error("Realtime subscribe error:", e);
      }
    })();

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, chats]);

  /* ===== Suscripción global a nuevos mensajes ===== */
  useEffect(() => {
    let active = true;

    (async () => {
      if (globalChannelRef.current) {
        try {
          await globalChannelRef.current.unsubscribe();
        } catch {}
        globalChannelRef.current = null;
      }

      const ch = supabase
        .channel("mensaje-global")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Mensaje" },
          (payload) => {
            if (!active) return;
            const row = payload.new as DBMessage;
            if (ONLY_ACTIVE && row.eliminado === true) return;

            const chatId = String(row.id_chat);

            setLastActivityById((prev) => ({ ...prev, [chatId]: toMillis(row.fecha) }));

            setChats((prev) => {
              const exists = prev.some((c) => c.id === chatId);
              if (!exists) return prev;
              return prev.map((c) =>
                c.id === chatId ? { ...c, preview: row.texto ?? c.preview, time: nowHHMM(row.fecha) } : c
              );
            });

            setUnreadById((prev) => {
              if (chatId === selectedId) return prev;
              const nextVal = (prev[chatId] ?? 0) + 1;
              return { ...prev, [chatId]: nextVal };
            });
          }
        )
        .subscribe();

      globalChannelRef.current = ch;
    })();

    return () => {
      active = false;
      (async () => {
        if (globalChannelRef.current) {
          try {
            await globalChannelRef.current.unsubscribe();
          } catch {}
          globalChannelRef.current = null;
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, selectedId, ONLY_ACTIVE]);

  /* ===== Helpers de mensajes (DB <-> UI) ===== */
  function dbRowToMsg(row: DBMessage, myId: number): Msg {
    return {
      id: row.id,
      from: row.id_emisor === myId ? "me" : "them",
      text: row.texto ?? "",
      time: nowHHMM(row.fecha),
      eliminado: row.eliminado,
    };
  }

  async function loadHistoryFromDB(chatId: string, myId: number) {
    const chatNum = Number(chatId);
    let query = supabase
      .from("Mensaje")
      .select("*")
      .eq("id_chat", chatNum)
      .order("fecha", { ascending: true })
      .limit(50);

    if (ONLY_ACTIVE) query = query.is("eliminado", false);

    const { data, error } = await query;
    if (error) {
      console.error("loadHistoryFromDB:", error);
      return;
    }
    const mapped = (data ?? []).map((r) => dbRowToMsg(r as DBMessage, myId));
    setMessagesById((prev) => ({ ...prev, [chatId]: mapped }));
    const last = (data ?? [])[data!.length - 1] as DBMessage | undefined;
    if (last) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, preview: last.texto ?? "", time: nowHHMM(last.fecha) }
            : c
        )
      );
      setLastActivityById((prev) => ({ ...prev, [chatId]: toMillis(last.fecha) }));
    }
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 0);
  }

  function appendIncomingRow(row: DBMessage, myId: number) {
    const msg = dbRowToMsg(row, myId);
    const chatKey = String(row.id_chat);

    setMessagesById((prev) => ({ ...prev, [chatKey]: [...(prev[chatKey] ?? []), msg] }));

    // actualizar preview/hora
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatKey ? { ...c, preview: row.texto ?? "", time: nowHHMM(row.fecha) } : c
      )
    );

    // actualizar última actividad
    setLastActivityById((prev) => ({ ...prev, [chatKey]: toMillis(row.fecha) }));

    // si no está seleccionado, sumar no leídos
    if (chatKey !== selectedId) {
      setUnreadById((prev) => ({ ...prev, [chatKey]: (prev[chatKey] ?? 0) + 1 }));
    }

    if (chatKey === selectedId) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 0);
    }
  }

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
      const exists = chats.find((c) => c.id === ct.id && !isGroupLike(c));
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
        idTipoChat: 1,
      };
      setChats((prev) => [...prev, newChat]);
      setMessagesById((prev) => ({ ...prev, [newChat.id]: [] }));
      setUnreadById((prev) => ({ ...prev, [newChat.id]: 0 }));

      // actividad reciente
      setLastActivityById((prev) => ({ ...prev, [newChat.id]: Date.now() }));

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

      // endpoint para crear grupo + chat
      const r = await fetch("/api/chats/create-group-with-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id_usuario_creador: idUsuario,
          nombre: name,
          descripcion: "",
          participantes: ids,
        }),
      });

      let newId = `group-${Date.now()}`;
      if (r.ok) {
        const json = await r.json().catch(() => ({}));
        if (json?.id_chat != null) newId = String(json.id_chat);
      } else {
        console.warn("[/api/chats/create-group-with-chat] status:", r.status, await r.text());
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
        idTipoChat: 2,
        members: Array.from(groupMembers),
      };
      setChats((prev) => [...prev, newChat]);
      setMessagesById((prev) => ({ ...prev, [newChat.id]: [] }));
      setUnreadById((prev) => ({ ...prev, [newChat.id]: 0 }));

      // actividad reciente
      setLastActivityById((prev) => ({ ...prev, [newChat.id]: Date.now() }));

      handleSelect(newChat.id);
      closeAllPickers();
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    } catch (e) {
      console.error(e);
    }
  };

  /* ===== SALIR DEL GRUPO ===== */
  const leaveCurrentGroup = async () => {
    try {
      if (!selectedId) return;
      const sc = chats.find((c) => c.id === selectedId);
      if (!sc || !isGroupLike(sc)) return;

      const ok = confirm(`¿Seguro que querés salir del grupo "${sc.name}"?`);
      if (!ok) return;

      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      // Intento principal: POST con JSON
      let r = await fetch("/api/chats/leave", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id_emisor: idUsuario, id_chat: Number(selectedId) }),
      });

      // Fallback
      if (!r.ok && (r.status === 405 || r.status === 404)) {
        const qs = new URLSearchParams({
          id_emisor: String(idUsuario),
          id_chat: String(selectedId),
        });
        r = await fetch(`/api/chats/leave?${qs.toString()}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Error /api/chats/leave:", r.status, txt);
        alert("No se pudo salir del grupo. Revisa la consola para más detalle.");
        return;
      }

      try {
        await channelRef.current?.unsubscribe();
      } catch {}
      channelRef.current = null;

      setChats((prev) => prev.filter((c) => c.id !== selectedId));
      setMessagesById((prev) => {
        const copy = { ...prev };
        delete copy[selectedId];
        return copy;
      });
      setUnreadById((prev) => {
        const copy = { ...prev };
        delete copy[selectedId];
        return copy;
      });
      setMuted((prev) => {
        const copy = { ...prev };
        delete copy[selectedId];
        return copy;
      });
      setArchived((prev) => {
        const copy = { ...prev };
        delete copy[selectedId];
        return copy;
      });
      setLastActivityById((prev) => {
        const copy = { ...prev };
        delete copy[selectedId];
        return copy;
      });

      setSelectedId("");
      setShowMembers(false);
    } catch (err) {
      console.error(err);
      alert("No se pudo salir del grupo.");
    }
  };

  /* ===== ELIMINAR CHAT PRIVADO ===== */
  const deleteCurrentChat = async () => {
    try {
      if (!selectedId) return;
      const sc = chats.find((c) => c.id === selectedId);
      if (!sc) return;

      if (isGroupLike(sc)) {
        alert("La eliminación es solo para chats privados. En grupos usá 'Salir'.");
        return;
      }

      const ok = confirm(`¿Eliminar el chat con "${sc.name}"? Esta acción no se puede deshacer.`);
      if (!ok) return;

      const { idUsuario, accessToken } = await resolveIdUsuarioAndToken();

      const body = { id_emisor: idUsuario, id_chat: Number(selectedId) };
      let r = await fetch("/api/chats/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!r.ok && (r.status === 405 || r.status === 404)) {
        const qs = new URLSearchParams({ id_emisor: String(idUsuario), id_chat: String(selectedId) });
        r = await fetch(`/api/chats/delete?${qs.toString()}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Error /api/chats/delete:", r.status, txt);
        alert("No se pudo eliminar el chat (sin respuesta OK del backend). Revisa la consola para más detalle.");
        return;
      }

      try {
        await channelRef.current?.unsubscribe();
      } catch {}
      channelRef.current = null;

      setChats((prev) => prev.filter((c) => c.id !== selectedId));
      setMessagesById((prev) => {
        const clone = { ...prev };
        delete clone[selectedId];
        return clone;
      });
      setUnreadById((prev) => {
        const clone = { ...prev };
        delete clone[selectedId];
        return clone;
      });
      setMuted((prev) => {
        const clone = { ...prev };
        delete clone[selectedId];
        return clone;
      });
      setArchived((prev) => {
        const clone = { ...prev };
        delete clone[selectedId];
        return clone;
      });
      setLastActivityById((prev) => {
        const clone: Record<string, number> = { ...prev };
        delete clone[selectedId];
        return clone;
      });

      setSelectedId("");
      setShowMembers(false);
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el chat.");
    }
  };

  /* ===== Envío a DB (realtime lo agrega) ===== */
  const sendMessageToDB = async () => {
    const txt = messageText.trim();
    if (!txt || !selectedId || sending) return;

    try {
      setSending(true);
      const { idUsuario } = await resolveIdUsuarioAndToken();

      const { error } = await supabase
        .from("Mensaje")
        .insert({
          id_chat: Number(selectedId),
          id_emisor: idUsuario,
          texto: txt,
        })
        .select()
        .single();

      if (error) {
        console.error("insert Mensaje:", error);
      } else {
        setMessageText("");
        setLastActivityById((prev) => ({ ...prev, [selectedId]: Date.now() }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  /* ===== Envío (acción de UI) ===== */
  const handleSend = () => {
    void sendMessageToDB();
  };

  /* ===== Click en el nombre del grupo: abrir popup + cargar en bg ===== */
  const onGroupNameClick = () => {
    if (!selectedChat) return;

    if (!showMembers) {
      setShowMembers(true);

      if (participants.length === 0) {
        if (!remoteContacts) {
          loadContactsFromBackend().catch(() => {});
        }
        loadParticipants(selectedChat.id).catch(() => {});
      }
    } else {
      setShowMembers(false);
    }
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
        {/* AUMENTAMOS EL ANCHO DE LA COLUMNA IZQUIERDA: 360px */}
        <div className="mx-auto grid max-w-[1260px] grid-cols-1 gap-6 md:grid-cols-[360px_1fr]">
          {/* ===== Lista de chats ===== */}
          <aside className="flex h-[72vh] min-h-[72vh] flex-col overflow-hidden rounded-2xl bg-white/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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

              
              <div className="mt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setChatFilter((f) => (f === "private" ? "all" : "private"))}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-sm transition",
                    chatFilter === "private"
                      ? "border-[#f16f24] bg-[#f16f24] text-white"
                      : "border-black/15 bg-white text-black/70 hover:bg-black/5"
                  ].join(" ")}
                  aria-pressed={chatFilter === "private"}
                  title="Mostrar solo chats privados"
                >
                  Chats
                </button>
                <button
                  type="button"
                  onClick={() => setChatFilter((f) => (f === "group" ? "all" : "group"))}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-sm transition",
                    chatFilter === "group"
                      ? "border-[#f16f24] bg-[#f16f24] text-white"
                      : "border-black/15 bg-white text-black/70 hover:bg-black/5"
                  ].join(" ")}
                  aria-pressed={chatFilter === "group"}
                  title="Mostrar solo chats grupales"
                >
                  Grupos
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

            {/* scroll interno de la lista */}
            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              <ul className="space-y-2">
                {chatsLoading && <li className="px-2 py-2 text-sm text-black/60">Cargando tus chats…</li>}
                {!chatsLoading && chatsError && <li className="px-2 py-2 text-sm text-red-600">{chatsError}</li>}

                {visibleChats.map((c) => {
                  const isActive = c.id === selectedId;
                  const isMuted = !!muted[c.id];
                  const isArchived = !!archived[c.id];
                  const unread = unreadById[c.id] ?? 0;
                  const badgeLabel = c.idTipoChat === 2 ? "Grupo" : (c.idTipoChat === 1 ? "Privado" : (isGroupLike(c) ? "Grupo" : ""));
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
                                {badgeLabel && (
                                  <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">
                                    {badgeLabel}
                                  </span>
                                )}
                                {isArchived && (
                                  <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">Archivado</span>
                                )}
                                {isMuted && (
                                  <span title="Silenciado" className="text-black/50">
                                    <svg width="12" height="12" viewBox="0 0 24 24" className="inline">
                                      <path
                                        fill="currentColor"
                                        d="m2 3.27l1.28-1.27l18 18l-1.27 1.27l-2.12-2.12H4v-2h1v-7a7 7 0 0 1 7-7c1.12 0 2.17.27 3.09.73l-1.5 1.5A5 5 0 0 0 12 4a5 5 0 0 0-5 5v7h9.73L2 3.27ZM20 17h2v2h-2v-2Zm-8 5a2 2 0 0 1-2-2h4a2 2 0 0 1-4 0Z"
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
            </div>
          </aside>

          {/* ===== Conversación ===== */}
          {selectedChat ? (
            <section className="relative flex h-[72vh] flex-col overflow-hidden rounded-2xl bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
              {/* Header */}
              <header className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] font-semibold">
                      {selectedChat.initials}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-[#2b2b2b] flex items-center gap-2">
                      {isGroupLike(selectedChat) ? (
                        <button
                          ref={groupNameBtnRef}
                          onClick={onGroupNameClick}
                          className="underline decoration-transparent hover:decoration-[#f16f24] underline-offset-4 transition text-left"
                          title="Ver participantes"
                          type="button"
                        >
                          {selectedChat.name}
                        </button>
                      ) : (
                        <span>{selectedChat.name}</span>
                      )}
                      {selectedChat.idTipoChat === 2 && (
                        <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">Grupo</span>
                      )}
                      {selectedChat.idTipoChat === 1 && (
                        <span className="rounded-md border border-black/10 px-1.5 text-[10px] text-black/60">Privado</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Acciones: Participantes + Salir/Eliminar + Cerrar */}
                <div className="flex items-center gap-2" ref={menuRef}>
                  {isGroupLike(selectedChat) && (
                    <button
                      title="Participantes"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                      type="button"
                      onClick={onGroupNameClick}
                    >
                      {/* Ícono "users" */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5S5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.38 13.74 18 14.68 18 16.5V19h6v-2.5c0-2.33-4.67-3.5-6-3.5z"/>
                      </svg>
                    </button>
                  )}

                  {isGroupLike(selectedChat) ? (
                    <button
                      onClick={leaveCurrentGroup}
                      title="Salir del grupo"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                      type="button"
                    >
                      {/* Ícono "logout / salir" */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17 7l-1.41 1.41L17.17 10H8v2h9.17l-1.58 1.59L17 15l4-4-4-4z"></path>
                        <path d="M3 5h8V3H3a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H3V5z"></path>
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={deleteCurrentChat}
                      title="Eliminar chat privado"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/70 hover:bg-black/5"
                      type="button"
                    >
                      {/* Ícono tacho (solo privados) */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 12h12a2 2 0 0 0 2-2V9H4v10a2 2 0 0 0 2 2Z" />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedId("");
                      setShowMembers(false);
                      setMenuOpen(false);
                    }}
                    title="Cerrar chat"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black/60 hover:bg-black/5"
                    type="button"
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
              {isGroupLike(selectedChat) && showMembers && (
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
                      type="button"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59L7.11 5.7a1 1 0 1 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Estados: cargando / error */}
                  {participantsLoading && (
                    <div className="px-2 py-2 text-sm text-black/60">Cargando participantes…</div>
                  )}
                  {participantsError && !participantsLoading && (
                    <div className="px-2 py-2 text-sm text-red-600">{participantsError}</div>
                  )}

                  {/* Lista */}
                  <ul className="max-h-64 overflow-y-auto">
                    {(participants.length
                      ? participants.map((p) => ({ id: p.id, name: p.name, initials: p.initials ?? initialsFromName(p.name) }))
                      : (selectedChat.members ?? []).map((id) => {
                          const ct = contactMap.get(id);
                          const name = ct?.name ?? `Usuario ${id}`;
                          return { id, name, initials: initialsFromName(name) };
                        })
                    ).map((p) => (
                      <li key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-black/5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f16f24]/10 text-[#f16f24] text-sm font-semibold">
                          {p.initials}
                        </div>
                        <span className="text-sm text-[#2b2b2b]">{p.name}</span>
                      </li>
                    ))}

                    {!participantsLoading &&
                      !participantsError &&
                      participants.length === 0 &&
                      (!selectedChat.members || selectedChat.members.length === 0) && (
                        <li className="px-2 py-2 text-sm text-black/60">Sin miembros</li>
                      )}
                  </ul>
                </div>
              )}

              {/* Historial (scroll) */}
              <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-black/10" />
                  <span className="text-xs text-black/50">Hoy</span>
                  <div className="h-px flex-1 bg-black/10" />
                </div>

                {messagesById[selectedId]?.length ? (
                  messagesById[selectedId].map((m, i) =>
                    m.from === "them" ? (
                      <div key={m.id ?? i} className="flex items-end gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-[#f16f24]/10 text-center leading-9 text-[#f16f24] font-semibold">
                          {selectedChat.initials[0]}
                        </div>
                        <div className="max-w-[70%] rounded-2xl rounded-tl-md bg-white p-3 shadow-sm ring-1 ring-black/5">
                          <p className="text-sm text-[#2b2b2b]">{m.text}</p>
                          <div className="mt-1 text-right text-[11px] text-black/45">{m.time}</div>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id ?? i} className="flex items-end justify-end gap-3">
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
            <section className="flex h-[72vh] items-center justify-center rounded-2xl bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
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
              <h3 className="textbase font-semibold text-[#2b2b2b]">Nuevo chat privado</h3>
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
