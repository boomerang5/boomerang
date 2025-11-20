'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import ProfileCompletionModal from './ProfileCompletionModal';

interface ProfileCheckerProps {
  children: React.ReactNode;
}

export default function ProfileChecker({ children }: ProfileCheckerProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      setLoading(true);
      
      // Verificar si hay sesión activa
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.session.user);

      // Verificar si el usuario ya tiene perfil usando get_usuario_uuid
      const response = await fetch(`/api/users/uuid/${session.session.user.id}`);
      
      if (response.status === 404) {
        // Usuario no encontrado = no tiene perfil = mostrar modal
        setShowModal(true);
      } else if (response.ok) {
        const data = await response.json();
        // Si no hay data o está vacío, mostrar modal
        if (!data || Object.keys(data).length === 0) {
          setShowModal(true);
        }
      } else {
        console.error('Error verificando perfil:', await response.text());
      }
    } catch (error) {
      console.error('Error en checkUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    setShowModal(false);
    // Recargar para actualizar el estado
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50 dark:bg-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-400">Verificando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ProfileCompletionModal 
        isOpen={showModal} 
        onComplete={handleProfileComplete}
      />
    </>
  );
}