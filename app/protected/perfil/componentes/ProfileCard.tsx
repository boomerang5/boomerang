'use client';

import { ReactNode } from 'react';

export default function ProfileCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 dark:bg-neutral-900/30 backdrop-blur p-5 shadow-md">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight"> {title} </h2>
        {actions}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
