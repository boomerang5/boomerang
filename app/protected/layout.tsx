// app/protected/layout.tsx  (SERVER COMPONENT)
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProtectedSidebar from '@/components/protectedSidebar';
import ClientProviders from '@/app/ClientProviders';
import CallNotificationsProvider from '@/components/CallNotificationsProvider';
import ProfileChecker from '@/components/ProfileChecker';
import { ThemeSwitcher } from '@/components/theme-switcher';
import type { ReactNode } from 'react';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/sign-in');

  return (
    <ClientProviders initialSession={session}>
      <CallNotificationsProvider callRoute="/protected/videollamada">
        <ProfileChecker>
          <div className="protected-layout flex min-h-screen bg-transparent">
            <ProtectedSidebar />
            <main className="flex-1 overflow-visible flex flex-col bg-white dark:bg-gray-700">
              <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 w-full">
                {children}
              </div>
              {/* Footer con selector de tema solo en páginas protegidas */}
              <footer className="w-full h-16 bg-transparent flex items-center justify-center gap-4 px-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">© 2025 Boomerang.</p>
                <ThemeSwitcher />
              </footer>
            </main>
          </div>
        </ProfileChecker>
      </CallNotificationsProvider>
    </ClientProviders>
  );
}
