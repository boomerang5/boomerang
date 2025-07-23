"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const supabase = createClient();

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        clearInterval(interval);
        router.push(`/sign-up/complete-profile?userId=${user.id}`);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [router, supabase]);

  return (
    <main className="h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-white">Verificá tu correo electrónico</h1>
        <p className="text-neutral-400 text-sm">
          Te enviamos un enlace para confirmar tu cuenta. Una vez confirmado, serás redirigido automáticamente.
        </p>
      </div>
    </main>
  );
}
