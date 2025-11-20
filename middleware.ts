import createIntlMiddleware from "next-intl/middleware";
import { updateSession } from "./utils/supabase/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware({
  locales: ["en", "es"],
  defaultLocale: "es",
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar i18n a la landing page (/, /es, /en)
  const shouldUseIntl =
    pathname === "/" ||
    pathname === "/es" ||
    pathname === "/en" ||
    (pathname.startsWith("/es/") && pathname.split("/").length === 2) ||
    (pathname.startsWith("/en/") && pathname.split("/").length === 2);

  if (shouldUseIntl) {
    // Ejecutar el middleware de i18n
    const intlResponse = intlMiddleware(request);

    // Si i18n hace un redirect (ej: / -> /es), lo devolvemos inmediatamente
    if (intlResponse.headers.get("location")) {
      return intlResponse;
    }

    // Actualizar sesión de Supabase
    const supabaseResponse = await updateSession(request);
    if (supabaseResponse && supabaseResponse.headers.get("location")) {
      return supabaseResponse;
    }

    return intlResponse;
  }

  // Para todas las demás rutas, solo ejecutar middleware de Supabase
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/(en|es)/:path*",
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
