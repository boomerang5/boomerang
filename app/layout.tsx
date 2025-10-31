import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { ThemeProvider } from "next-themes";
import Image from "next/image";

import SupabaseProvider from "./SupabaseProvider";

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
      <body className="bg-gradient-to-b from-orange-200 via-orange-100 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 text-foreground overflow-x-hidden">
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
              <nav className="w-full border-b border-b-orange-300/30 dark:border-b-gray-700/30
                              h-18 md:h-20 bg-transparent shadow-sm">
                <div className="w-full h-full flex items-center justify-between px-6 md:px-12 lg:px-16">
                  <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                    <Image
                      src="/boomerang.png"
                      alt="Boomerang logo"
                      width={450}
                      height={300}
                      priority
                      className="h-10 md:h-14 w-auto object-contain"
                    />
                  </Link>
                  <div className="flex items-center gap-4">
                    {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                  </div>
                </div>
              </nav>

              {/* Contenido */}
              <div className="flex-1 w-full pb-24 overflow-visible">
                {children}
              </div>

              {/* Footer */}
              <footer className="w-full h-16 md:h-20 
                border-t border-t-orange-300/30 dark:border-t-gray-700/30 
                bg-transparent
                flex items-center justify-center gap-4 px-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">© 2025 Boomerang.</p>
                <ThemeSwitcher />
              </footer>
            </main>
          </ThemeProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
