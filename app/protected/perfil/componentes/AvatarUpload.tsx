'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function AvatarUpload({ url, onUploaded }: { url?: string | null; onUploaded: (path: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      onUploaded(data.path);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10">
        <Image
          src={url ? url : '/avatar-placeholder.png'}
          alt="Foto de perfil"
          width={80}
          height={80}
          className="h-20 w-20 object-cover"
        />
      </div>
      <div>
        <button
          type="button"
          className="rounded-xl px-3 py-2 text-sm font-medium shadow border border-white/10 bg-white/10 hover:bg-white/20 transition
                     dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Subiendo…' : 'Cambiar foto'}
        </button>
        <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={handleFile} />
      </div>
    </div>
  );
}
