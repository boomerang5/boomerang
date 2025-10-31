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
        <div className="flex gap-3">
          <span className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-full font-bold text-base shadow-lg border-2 border-orange-300 dark:border-orange-600 opacity-75 cursor-not-allowed">
            Iniciar Sesión
          </span>
          <span className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-3 rounded-full font-bold text-base shadow-xl opacity-75 cursor-not-allowed">
            Registrate
          </span>
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
    <div className="flex gap-3 items-center">
      <Link 
        href="/sign-in"
        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-full font-bold text-base shadow-lg hover:shadow-xl border-2 border-orange-300 dark:border-orange-600 hover:border-orange-500 dark:hover:border-orange-500 transition-all"
      >
        Iniciar Sesión
      </Link>
      <Link
        href="/sign-up"
        className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-6 py-3 rounded-full font-bold text-base shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
      >
        Registrate
      </Link>
    </div>
  );
}
