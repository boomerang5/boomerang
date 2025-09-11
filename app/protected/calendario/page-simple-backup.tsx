'use client';

import { useEffect } from 'react';
// @ts-ignore
import feather from 'feather-icons';

export default function CalendarioPage() {
  useEffect(() => {
    feather.replace();
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Calendario</h1>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <i data-feather="plus" className="w-4 h-4"></i>
            Nueva Reunión
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Calendario funcionando! 🎉
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Esta es una versión simplificada para verificar que la página carga correctamente.
          </p>
        </div>
      </div>
    </div>
  );
}
