// ✅ app/auth/callback/page.tsx
export const runtime = 'nodejs'; // 👈 fuerza runtime correcto

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

export default async function AuthCallbackPage() {
  const cookieStore = cookies(); // ✅ NO usar await

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name); // ✅ acá ya no da error
          return cookie?.value ?? null;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/sign-in");
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email_confirmed_at) {
    return redirect("/sign-up/verify-email");
  }

  return redirect("/protected");
}
