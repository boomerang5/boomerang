import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { LanguageSelector } from '@/components/language-selector';
import { ThemeProvider } from "next-themes";
import SupabaseProvider from "../SupabaseProvider";
import CookieWarningsSuppressor from "@/components/CookieWarningsSuppressor";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Obtener mensajes para el locale actual
  const messages = await getMessages({ locale });
  const t = await getTranslations({ locale, namespace: 'Header' });

  return (
    <SupabaseProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <NextIntlClientProvider messages={messages}>
          <main className="min-h-screen flex flex-col">
            {/* Header - Estilo Duolingo */}
            <nav className="w-full h-18 md:h-20 bg-transparent shadow-sm">
              <div className="w-full h-full flex items-center px-6 md:px-12 lg:pl-24 lg:pr-6">
                <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
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
                  <Link
                    href="/sign-in"
                    className="bg-white/10 backdrop-blur-md border-2 border-white hover:bg-white hover:scale-105 text-white hover:text-orange-600 px-6 py-3 rounded-full font-bold text-base transition-all duration-300"
                  >
                    {t('signIn')}
                  </Link>
                  <Link
                    href="/sign-up"
                    className="bg-white border-2 border-white hover:bg-orange-500 text-orange-600 hover:text-white px-6 py-3 rounded-full font-bold text-base transition-all duration-300 hover:scale-105"
                  >
                    {t('signUp')}
                  </Link>
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
        </NextIntlClientProvider>
      </ThemeProvider>
    </SupabaseProvider>
  );
}
