// components/ui/header-auth.tsx (o donde tengas AuthButton)
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import SettingsMenu from "@/components/ui/settings-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const hasEnvVars =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function AuthButton() {
  const supabase = await createClient(); 
  const { data: { user } } = await supabase.auth.getUser();

  if (!hasEnvVars) {
    return (
      <div className="flex gap-4 items-center">
        <Badge variant="default" className="font-normal pointer-events-none">
          Please update .env.local file with anon key and url
        </Badge>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" disabled className="opacity-75">
            <Link href="/sign-in">Iniciar Sesión</Link>
          </Button>
          <Button asChild size="sm" variant="default" disabled className="opacity-75">
            <Link href="/sign-up">Registrate</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Si hay usuario logueado, mostramos la ruedita con "Cerrar sesión"
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <SettingsMenu />
      </div>
    );
  }

  // Usuario no logueado → botones de acceso
  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/sign-in">Iniciar Sesión</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/sign-up">Registrate</Link>
      </Button>
    </div>
  );
}
