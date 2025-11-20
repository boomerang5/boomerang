// app/protected/layout.tsx  (SERVER COMPONENT)
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProtectedSidebar from '@/components/protectedSidebar';
import ProtectedHeader from '@/components/ProtectedHeader';
import ClientProviders from '@/app/ClientProviders';
import CallNotificationsProvider from '@/components/CallNotificationsProvider';
import ProfileChecker from '@/components/ProfileChecker';
import { UserUuidProvider } from '@/contexts/UserUuidContext';
import { ThemeSwitcher } from '@/components/theme-switcher';
import type { ReactNode } from 'react';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/sign-in');

  return (
    <ClientProviders initialSession={session}>
      <UserUuidProvider>
        <CallNotificationsProvider callRoute="/protected/videollamada">
          <ProfileChecker>
            <div className="min-h-screen flex flex-col bg-orange-50 dark:bg-gray-700 overflow-x-hidden">
              <ProtectedHeader />
              <div className="flex-1 flex overflow-hidden">
                <ProtectedSidebar />
                <main className="flex-1 overflow-y-auto flex flex-col bg-orange-50 dark:bg-gray-700">
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
            </div>
          </ProfileChecker>
        </CallNotificationsProvider>
      </UserUuidProvider>
    </ClientProviders>
  );
}
