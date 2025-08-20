// lib/api/users.ts
export type Usuario = {
  id: number;
  nombre: string | null;
  apellido: string | null;
  apodo: string | null;
  fecha_nacimiento: string | null;
  id_genero: number | null;
  pais: string | null;
  mail: string | null;
  path_foto_perfil: string | null;
  user_id: string; // el UUID que viene de Supabase
};

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Obtener usuario por UUID (Supabase user.id)
export async function getUsuarioByUuid(uuid: string): Promise<Usuario> {
  return fetchJson(`${BASE}/api/users/uuid/${uuid}`);
}

// Actualizar perfil
export async function updateUsuario(body: Partial<Usuario>) {
  return fetchJson(`${BASE}/api/users/update`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
