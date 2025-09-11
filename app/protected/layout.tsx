import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ClientProviders from '@/app/ClientProviders';
import ProtectedSidebar from '@/components/protectedSidebar';
import type { ReactNode } from 'react';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/sign-in');

  return (
    <ClientProviders initialSession={session}>
      <div className="flex h-screen bg-white dark:bg-black">
        <ProtectedSidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </ClientProviders>
  );
}
