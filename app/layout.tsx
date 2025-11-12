import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LanguageSelector } from "@/components/language-selector";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { ThemeProvider } from "next-themes";
import Image from "next/image";

import SupabaseProvider from "./SupabaseProvider";
import CookieWarningsSuppressor from "@/components/CookieWarningsSuppressor";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Boomerang",
  description: "Videollamadas con traducción en tiempo real",
  icons: {
    icon: '/favicon.ico',
  },
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>
      <body className="text-foreground overflow-x-hidden bg-gradient-to-br from-orange-400 via-orange-500 to-red-600 animate-gradient-flow">
        {/* 👇 Toda la app envuelta con el SessionContextProvider */}
        <SupabaseProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="min-h-screen flex flex-col">
              {/* Header - Estilo Duolingo */}
              <nav className="w-full h-18 md:h-20 bg-transparent shadow-sm">
                <div className="w-full h-full flex items-center px-6 md:px-12 lg:pl-24 lg:pr-6">
                  <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                    <Image
                      src="/boomerang.png"
                      alt="Boomerang logo"
                      width={450}
                      height={300}
                      priority
                      className="h-10 md:h-14 w-auto object-contain brightness-0 invert"
                    />
                  </Link>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-3">
                    <LanguageSelector />
                    {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                  </div>
                </div>
              </nav>

              {/* Contenido */}
              <div className="flex-1 w-full pb-4 overflow-visible">
                {children}
              </div>
            </main>
            {/* Suprimir warnings de cookies sin afectar funcionalidad */}
            <CookieWarningsSuppressor />
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
