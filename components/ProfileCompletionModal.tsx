'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface ProfileData {
  nombre: string;
  apellido: string;
  apodo: string;
  genero: number | null;
  fecha_nacimiento: string;
  idioma: number;
}

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface Idioma {
  id_idioma: number;
  nombre_idioma: string;
  codigo_iso: string;
}

interface Genero {
  id_genero: number;
  nombre_genero: string;
}

export default function ProfileCompletionModal({ isOpen, onComplete }: ProfileCompletionModalProps) {
  const supabase = useSupabaseClient();
  const [profile, setProfile] = useState<ProfileData>({
    nombre: '',
    apellido: '',
    apodo: '',
    genero: null,
    fecha_nacimiento: '',
    idioma: 1
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [idiomas, setIdiomas] = useState<Idioma[]>([]);
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [loadingIdiomas, setLoadingIdiomas] = useState(true);
  const [loadingGeneros, setLoadingGeneros] = useState(true);

  // Animación de entrada
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      loadIdiomas();
      loadGeneros();
    }
  }, [isOpen]);

  const loadIdiomas = async () => {
    try {
      setLoadingIdiomas(true);
      const response = await fetch('/api/users/idiomas', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIdiomas(data);
        // Si hay idiomas disponibles, usar el primero como default
        if (data.length > 0) {
          setProfile(prev => ({ ...prev, idioma: data[0].id_idioma }));
        }
      } else {
        console.error('Error cargando idiomas:', await response.text());
        // Fallback con idiomas hardcodeados
        setIdiomas([
          { id_idioma: 1, nombre_idioma: 'Español', codigo_iso: 'es-ES' },
          { id_idioma: 2, nombre_idioma: 'Inglés', codigo_iso: 'en-US' }
        ]);
      }
    } catch (error) {
      console.error('Error cargando idiomas:', error);
      // Fallback con idiomas hardcodeados
      setIdiomas([
        { id_idioma: 1, nombre_idioma: 'Español', codigo_iso: 'es-ES' },
        { id_idioma: 2, nombre_idioma: 'Inglés', codigo_iso: 'en-US' }
      ]);
    } finally {
      setLoadingIdiomas(false);
    }
  };

  const loadGeneros = async () => {
    try {
      setLoadingGeneros(true);
      const response = await fetch('/api/users/generos', {
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneros(data);
      } else {
        console.error('Error cargando géneros:', await response.text());
        // Fallback con géneros hardcodeados
        setGeneros([
          { id_genero: 1, nombre_genero: 'Masculino' },
          { id_genero: 2, nombre_genero: 'Femenino' },
          { id_genero: 3, nombre_genero: 'Prefiero no decirlo' }
        ]);
      }
    } catch (error) {
      console.error('Error cargando géneros:', error);
      // Fallback con géneros hardcodeados
      setGeneros([
        { id_genero: 1, nombre_genero: 'Masculino' },
        { id_genero: 2, nombre_genero: 'Femenino' },
        { id_genero: 3, nombre_genero: 'Prefiero no decirlo' }
      ]);
    } finally {
      setLoadingGeneros(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!profile.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido';
    }

    if (!profile.apodo.trim()) {
      newErrors.apodo = 'El apodo es requerido';
    }

    if (!profile.genero) {
      newErrors.genero = 'Selecciona un género';
    }

    if (!profile.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida';
    } else {
      const fechaNacimiento = new Date(profile.fecha_nacimiento);
      const hoy = new Date();
      if (fechaNacimiento >= hoy) {
        newErrors.fecha_nacimiento = 'La fecha debe ser anterior a hoy';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.session?.access_token ? {
            'Authorization': `Bearer ${session.session.access_token}`
          } : {})
        },
        body: JSON.stringify({
          nombre: profile.nombre.trim(),
          apellido: profile.apellido.trim(),
          apodo: profile.apodo.trim(),
          user_id: session.session.user.id,
          email: session.session.user.email,
          genero: profile.genero,
          fecha_nacimiento: profile.fecha_nacimiento,
          idioma: profile.idioma
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al crear el perfil');
      }

      // Perfil creado exitosamente
      onComplete();
    } catch (error: any) {
      console.error('Error al completar perfil:', error);
      setErrors({ submit: error.message || 'Error inesperado' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">👤</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Completá tu perfil
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Necesitamos algunos datos para personalizar tu experiencia
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={profile.nombre}
                onChange={(e) => updateField('nombre', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors ${
                  errors.nombre 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } text-gray-900 dark:text-white`}
                placeholder="Tu nombre"
              />
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
              )}
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                value={profile.apellido}
                onChange={(e) => updateField('apellido', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors ${
                  errors.apellido 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } text-gray-900 dark:text-white`}
                placeholder="Tu apellido"
              />
              {errors.apellido && (
                <p className="text-red-500 text-xs mt-1">{errors.apellido}</p>
              )}
            </div>

            {/* Apodo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apodo *
              </label>
              <input
                type="text"
                value={profile.apodo}
                onChange={(e) => updateField('apodo', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors ${
                  errors.apodo 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } text-gray-900 dark:text-white`}
                placeholder="¿Cómo te gusta que te llamen?"
              />
              {errors.apodo && (
                <p className="text-red-500 text-xs mt-1">{errors.apodo}</p>
              )}
            </div>

            {/* Género */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Género *
              </label>
              <select
                value={profile.genero || ''}
                onChange={(e) => updateField('genero', e.target.value ? Number(e.target.value) : null)}
                disabled={loadingGeneros}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors ${
                  errors.genero 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } text-gray-900 dark:text-white disabled:opacity-50`}
              >
                {loadingGeneros ? (
                  <option value="">Cargando géneros...</option>
                ) : (
                  <>
                    <option value="">Seleccionar género</option>
                    {generos.map((genero) => (
                      <option key={genero.id_genero} value={genero.id_genero}>
                        {genero.nombre_genero}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.genero && (
                <p className="text-red-500 text-xs mt-1">{errors.genero}</p>
              )}
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de nacimiento *
              </label>
              <input
                type="date"
                value={profile.fecha_nacimiento}
                onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors ${
                  errors.fecha_nacimiento 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                } text-gray-900 dark:text-white`}
              />
              {errors.fecha_nacimiento && (
                <p className="text-red-500 text-xs mt-1">{errors.fecha_nacimiento}</p>
              )}
            </div>

            {/* Idioma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Idioma preferido *
              </label>
              <select
                value={profile.idioma}
                onChange={(e) => updateField('idioma', Number(e.target.value))}
                disabled={loadingIdiomas}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors text-gray-900 dark:text-white disabled:opacity-50"
              >
                {loadingIdiomas ? (
                  <option value="">Cargando idiomas...</option>
                ) : (
                  idiomas.map((idioma) => (
                    <option key={idioma.id_idioma} value={idioma.id_idioma}>
                      {idioma.nombre_idioma}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Error de envío */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Completando...
                </div>
              ) : (
                'Completar perfil'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 rounded-b-2xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            * Campos obligatorios. Esta información es necesaria para usar Boomerang.
          </p>
        </div>
      </div>
    </div>
  );
}