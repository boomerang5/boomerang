import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { ThemeProvider } from "next-themes";
import ClientProviders from "@/app/ClientProviders";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Boomerang",
  description: "Videollamadas con traducción en tiempo real",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground overflow-x-hidden overflow-y-auto">
        <ClientProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="min-h-screen flex flex-col">
              <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 px-6">
                <div className="w-full max-w-7xl flex justify-between items-center text-sm">
                  <div className="flex gap-5 items-center font-semibold">
                    <Link href="/">B O O M E R A N G</Link>
                  </div>
                  {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                </div>
              </nav>

              <div className="flex-1 w-full">{children}</div>

              <footer className="w-full flex items-center justify-center border-t text-center text-xs gap-4 py-6">
                <p>2025 Boomerang.</p>
                <ThemeSwitcher />
              </footer>
            </main>
          </ThemeProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
