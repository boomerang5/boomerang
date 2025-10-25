import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { ThemeProvider } from "next-themes";
import ClientProviders from "@/app/ClientProviders";
import Image from "next/image";

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
      <body className="bg-orange-50 dark:bg-gray-700 text-foreground overflow-x-hidden">
        <ClientProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="min-h-screen flex flex-col">
              {/* Header */}
              <nav className="w-full flex justify-center border-b border-b-orange-200 dark:border-b-orange-800
                              h-13 md:h-16 px-5 bg-orange-50 dark:bg-gray-600">
                <div className="w-full max-w-7xl flex justify-between items-center text-sm">
                  <Link href="/" className="flex items-center gap-2 shrink-0">
                    <Image
                      src="/boomerang.png"
                      alt="Boomerang logo"
                      width={450}
                      height={300}
                      priority
                      className="h-8 md:h-12 w-auto object-contain"
                    />
                  </Link>
                  {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                </div>
              </nav>

              {/* Contenido */}
              <div className="flex-1 w-full pb-24 overflow-visible">
                {children}
              </div>

              {/* Footer (sticky, finito) */}
              <footer className="w-full h-13 md:h-16 
             border-t border-t-orange-200 dark:border-t-orange-800 
             bg-orange-50 dark:bg-gray-600
             flex items-center justify-center gap-4 px-5">
                <p className="text-orange-600 dark:text-orange-400 text-sm">2025 Boomerang.</p>
                <ThemeSwitcher />
              </footer>
            </main>
          </ThemeProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
