import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ClientProviders from '@/app/ClientProviders';
import type { ReactNode } from 'react';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/sign-in');

  return (
    <section>
      <ClientProviders initialSession={session}>{children}</ClientProviders>
    </section>
  );
}
