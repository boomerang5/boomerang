'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface EventNotificationProps {
  id: number;
  title: string;
  message: string;
  eventId: number;
  organizador: string;
  when: string;
  onRespond?: (response: 'accept' | 'decline') => void;
}

export function EventNotificationCard({ 
  id, 
  title, 
  message, 
  eventId, 
  organizador, 
  when, 
  onRespond 
}: EventNotificationProps) {
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);
  const supabase = useSupabaseClient();

  const handleResponse = async (response: 'accept' | 'decline') => {
    if (responding || responded) return;
    
    setResponding(true);
    try {
      // Obtener usuario actual
      const { data: session } = await supabase.auth.getSession();
      const uuid = session.session?.user.id;
      if (!uuid) return;
      
      const { data: userData } = await supabase
        .from('Usuario')
        .select('id')
        .eq('User_id', uuid)
        .single();
      
      if (!userData?.id) return;

      // Llamar al endpoint para responder a la notificación
      const responseResult = await fetch(`/api/notifications/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          id_usuario: userData.id
        }),
      });

      if (responseResult.ok) {
        setResponded(true);
        onRespond?.(response);
      }
    } catch (error) {
      console.error('Error al responder a la notificación:', error);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-700 mb-2">{message}</p>
          <div className="text-sm text-gray-500">
            <p>Organizador: {organizador}</p>
            <p>Recibido: {formatDate(when)}</p>
          </div>
        </div>
        
        <div className="ml-4 flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        </div>
      </div>

      {!responded && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleResponse('accept')}
            disabled={responding}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {responding ? 'Procesando...' : 'Aceptar'}
          </button>
          <button
            onClick={() => handleResponse('decline')}
            disabled={responding}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {responding ? 'Procesando...' : 'Rechazar'}
          </button>
        </div>
      )}

      {responded && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-600">Ya respondiste a esta invitación</p>
        </div>
      )}
    </div>
  );
}

interface EventNotificationsListProps {
  userId: number;
}

export function EventNotificationsList({ userId }: EventNotificationsListProps) {
  const supabase = useSupabaseClient();
  
  // Aquí usarías el hook useNotifications para obtener las notificaciones
  // const { notifications, loading, error, markAsRead } = useNotifications(supabase, userId);
  
  // Por ahora, un placeholder
  const notifications: any[] = [];
  const loading = false;

  const eventNotifications = notifications.filter(n => n.type === 'meeting_invite');

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (eventNotifications.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        No tienes notificaciones de eventos pendientes
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {eventNotifications.map((notification) => {
        const meta = notification.meta || {};
        return (
          <EventNotificationCard
            key={notification.id}
            id={notification.id}
            title={notification.title}
            message={notification.message || ''}
            eventId={meta.id_evento || 0}
            organizador={meta.organizador || 'Desconocido'}
            when={notification.when || new Date().toISOString()}
            onRespond={(response) => {
              console.log(`Respondió ${response} a la notificación ${notification.id}`);
              // markAsRead(notification.id);
            }}
          />
        );
      })}
    </div>
  );
}