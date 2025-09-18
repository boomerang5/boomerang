// app/protected/layout.tsx  (SERVER COMPONENT)
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProtectedSidebar from '@/components/protectedSidebar';
import ClientProviders from '@/app/ClientProviders';
import CallNotificationsProvider from '@/components/CallNotificationsProvider';
import type { ReactNode } from 'react';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/sign-in');

  return (
    <ClientProviders initialSession={session}>
      <CallNotificationsProvider callRoute="/protected/videollamada">
        <div className="flex min-h-screen bg-transparent">
          <ProtectedSidebar />
          <main className="flex-1 overflow-visible">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
              {children}
            </div>
          </main>
        </div>
      </CallNotificationsProvider>
    </ClientProviders>
  );
}
