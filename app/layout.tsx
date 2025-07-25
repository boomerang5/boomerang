import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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

import ClientProviders from "@/app/ClientProviders";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground overflow-x-hidden overflow-y-auto">
        <ClientProviders>
          <main className="min-h-screen flex flex-col">
            <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16 px-6">
              <div className="w-full max-w-7xl flex justify-between items-center text-sm">
                <div className="flex gap-5 items-center font-semibold">
                  <Link href="/">B O O M E R A N G</Link>
                </div>
                {/* Aquí podés dejar componentes server o clientes, según cómo los importes */}
              </div>
            </nav>

            <div className="flex-1 w-full">{children}</div>

            <footer className="w-full flex items-center justify-center border-t text-center text-xs gap-4 py-6">
              <p>2025 Boomerang.</p>
              {/* ThemeSwitcher lo movés también dentro de ClientProviders si es cliente */}
            </footer>
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
