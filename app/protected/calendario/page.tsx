'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
// @ts-ignore
import feather from 'feather-icons';

// Tipos
type Evento = {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha_programada: string;
  invitados?: Contact[];
  color?: string;
  creador?: {
    id: number;
    nombre: string;
  };
  miConfirmacion?: 'pendiente' | 'confirmado' | 'rechazado';
  usuarioEsCreador?: boolean;
  // Campos adicionales del backend
  creado_por?: number;
  usuario_id?: number;
  created_by?: number;
  mi_confirmacion?: 'pendiente' | 'confirmado' | 'rechazado';
  confirmacion?: 'pendiente' | 'confirmado' | 'rechazado';
  confirmation_status?: 'pendiente' | 'confirmado' | 'rechazado';
  user_confirmation?: 'pendiente' | 'confirmado' | 'rechazado';
  participant_status?: 'pendiente' | 'confirmado' | 'rechazado';
  my_status?: 'pendiente' | 'confirmado' | 'rechazado';
};

// Colores disponibles para eventos
const COLORES_EVENTO = [
  { nombre: 'Azul', valor: 'blue', clase: 'bg-blue-500' },
  { nombre: 'Verde', valor: 'green', clase: 'bg-green-500' },
  { nombre: 'Rojo', valor: 'red', clase: 'bg-red-500' },
  { nombre: 'Naranja', valor: 'orange', clase: 'bg-orange-500' },
  { nombre: 'Púrpura', valor: 'purple', clase: 'bg-purple-500' },
  { nombre: 'Rosa', valor: 'pink', clase: 'bg-pink-500' },
  { nombre: 'Amarillo', valor: 'yellow', clase: 'bg-yellow-500' },
  { nombre: 'Gris', valor: 'gray', clase: 'bg-gray-500' },
];

type Contact = {
  id: number;
  id_usuario?: number; // ID real del usuario para enviar al backend
  nombre: string;
  apellido?: string;
  apodo?: string | null;
  estado?: string;
  favorito?: boolean;
  confirmacion?: 'pendiente' | 'confirmado' | 'rechazado';
};

type VistaCalendario = 'dia' | 'semana' | 'mes';

export default function CalendarioPage() {
  // Estados
  const [vista, setVista] = useState<VistaCalendario>('mes');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [fechaPredefinida, setFechaPredefinida] = useState<Date | null>(null);
  
  // Estados para modal de detalles de evento
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [eventoDetalles, setEventoDetalles] = useState<Evento | null>(null);
  
  // Estados para autenticación y carga
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para contactos
  const [contactos, setContactos] = useState<Contact[]>([]);
  const [cargandoContactos, setCargandoContactos] = useState(false);
  
  // Estados para modal de confirmación de eliminación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [eventoAEliminar, setEventoAEliminar] = useState<number | null>(null);

  const supabase = createClient();

  // Función para obtener el ID numérico del usuario
  const obtenerUsuarioId = async (): Promise<number> => {
    const { data: sess } = await supabase.auth.getSession();
    const uuid = sess.session?.user?.id;
    const accessToken = sess.session?.access_token;
    
    if (!uuid) throw new Error('Sin sesión');
    if (!accessToken) throw new Error('Sin token de acceso');

    // Obtener ID numérico desde la tabla Usuario
    const { data: row, error } = await supabase
      .from("Usuario")
      .select("id")
      .eq("User_id", uuid)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener usuario: ${error.message}`);
    if (!row) throw new Error('Usuario no encontrado en la base de datos');

    return row.id;
  };

  // Función para cargar contactos reales
  const cargarContactos = async () => {
    try {
      setCargandoContactos(true);
      
      const usuarioIdNum = await obtenerUsuarioId();
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      const url = `/api/contacts/misContactos?id_usuario=${usuarioIdNum}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Mapear la respuesta del backend al formato esperado por el frontend
      const contactosRaw = Array.isArray(data) ? data : (data.contacts || data);
      
      const contactosMapeados = Array.isArray(contactosRaw) 
        ? contactosRaw.map((contacto: any) => {
            return {
              id: contacto.id,
              id_usuario: contacto.id_usuario_contacto,
              nombre: contacto.nombre || contacto.name || 'Sin nombre',
              apellido: contacto.apellido || contacto.last_name || '',
              apodo: contacto.apodo || contacto.nickname || null,
              estado: contacto.estado || contacto.status || 'available',
              favorito: contacto.favorito || contacto.favorite || false
            };
          })
        : [];

      setContactos(contactosMapeados);
    } catch (error: any) {
      console.error('❌ Error detallado al cargar contactos:', {
        message: error.message,
        stack: error.stack,
        error: error
      });
      setContactos([]);
    } finally {
      setCargandoContactos(false);
    }
  };

  // Función para cargar eventos desde la API
  const cargarEventos = async (usuarioId: number, fechaDesde?: Date, fechaHasta?: Date) => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      const params = new URLSearchParams({
        id_usuario: usuarioId.toString(),
      });
      
      if (fechaDesde) params.append('fecha_inicio', fechaDesde.toISOString());
      if (fechaHasta) params.append('fecha_fin', fechaHasta.toISOString());

      const response = await fetch(`/api/calendar?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Error al cargar eventos: ${response.status}`);
      }

      const eventosData = await response.json();
      
      
      // Log detallado de cada evento
      eventosData.forEach((evento: any, index: number) => {
        
      });
      
      // Mapear campos del backend al formato esperado por el frontend
      const eventosMapeados = Array.isArray(eventosData) 
        ? await Promise.all(eventosData.map(async (evento: any) => {
            // Determinar estado de confirmación con lógica robusta
            let miConfirmacion = 'pendiente';
            
            if (evento.creado_por === usuarioId) {
              // Si soy el creador, siempre confirmado
              miConfirmacion = 'confirmado';
            } else if (evento.mi_confirmacion) {
              // Usar el campo del backend si existe
              miConfirmacion = evento.mi_confirmacion;
            } else {
              // FALLBACK: Consultar directamente la confirmación desde el frontend
              try {
                const { data: sess } = await supabase.auth.getSession();
                const { data: confirmacion } = await supabase
                  .from('EventoInvitado')
                  .select('confirmado')
                  .eq('id_evento', evento.id)
                  .eq('id_usuario', usuarioId)
                  .single();
                
                if (confirmacion) {
                  if (confirmacion.confirmado === true) {
                    miConfirmacion = 'confirmado';
                  } else if (confirmacion.confirmado === false) {
                    miConfirmacion = 'rechazado';
                  } else {
                    miConfirmacion = 'pendiente';
                  }
                } 
              } catch (error) {
                console.error(`❌ Error consultando confirmación evento ${evento.id}:`, error);
              }
            }


            return {
              ...evento,
              fecha_programada: evento.fecha || evento.fecha_programada,
              invitados: [], // Se carga cuando sea necesario
              creador: evento.creado_por ? {
                id: evento.creado_por,
                nombre: 'Usuario ' + evento.creado_por
              } : undefined,
              usuarioEsCreador: evento.creado_por === usuarioId,
              miConfirmacion: miConfirmacion
            };
          }))
        : [];
      
      setEventos(eventosMapeados);
    } catch (err: any) {
      console.error('Error cargando eventos:', err);
      setError(err.message);
    }
  };

  // Configurar feather icons
  useEffect(() => {
    feather.replace();
  }, [vista, eventos, mostrarModal]);

  // Inicializar usuario y cargar eventos
  useEffect(() => {
    const inicializar = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const id = await obtenerUsuarioId();
        setUsuarioId(id);
        
        // Calcular rango de fechas basado en la vista actual
        const { fechaInicio, fechaFin } = calcularRangoFechas(fechaActual, vista);
        
        // Cargar solo eventos al inicializar (contactos se cargan al abrir modal)
        await cargarEventos(id, new Date(fechaInicio), new Date(fechaFin));
      } catch (err: any) {
        console.error('Error al inicializar:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, [fechaActual, vista]);

  // Recargar eventos cuando cambie la fecha o vista
  useEffect(() => {
    if (usuarioId) {
      const { fechaInicio, fechaFin } = calcularRangoFechas(fechaActual, vista);
      cargarEventos(usuarioId, new Date(fechaInicio), new Date(fechaFin));
    }
  }, [usuarioId, fechaActual, vista]);

  // Funciones de utilidad para fechas
  const calcularRangoFechas = (fecha: Date, vista: VistaCalendario) => {
    const inicio = new Date(fecha);
    const fin = new Date(fecha);

    switch (vista) {
      case 'dia':
        inicio.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'semana': {
        // Obtener el lunes de la semana
        const diaActual = fecha.getDay();
        const diasParaLunes = diaActual === 0 ? 6 : diaActual - 1;
        inicio.setDate(fecha.getDate() - diasParaLunes);
        inicio.setHours(0, 0, 0, 0);
        fin.setDate(inicio.getDate() + 6);
        fin.setHours(23, 59, 59, 999);
        break;
      }
      case 'mes': {
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        fin.setMonth(fecha.getMonth() + 1, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      }
    }

    return {
      fechaInicio: inicio.toISOString(),
      fechaFin: fin.toISOString(),
    };
  };

  const navegarFecha = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(fechaActual);
    
    switch (vista) {
      case 'dia':
        nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 1 : -1));
        break;
      case 'semana':
        nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'siguiente' ? 7 : -7));
        break;
      case 'mes':
        nuevaFecha.setMonth(nuevaFecha.getMonth() + (direccion === 'siguiente' ? 1 : -1));
        break;
    }
    
    setFechaActual(nuevaFecha);
  };

  const formatearFecha = (fecha: Date) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    switch (vista) {
      case 'dia':
        return `${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      case 'semana': {
        const inicioSemana = new Date(fecha);
        const diaActual = fecha.getDay();
        const diasParaLunes = diaActual === 0 ? 6 : diaActual - 1;
        inicioSemana.setDate(fecha.getDate() - diasParaLunes);
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        
        return `${inicioSemana.getDate()} - ${finSemana.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      }
      case 'mes':
        return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      default:
        return '';
    }
  };

  const abrirModal = async (evento?: Evento, fechaPredefinida?: Date) => {
    setEventoSeleccionado(evento || null);
    setFechaPredefinida(fechaPredefinida || null);
    setMostrarModal(true);
    
    // Cargar contactos actuales cada vez que se abre el modal
    try {
      await cargarContactos();
    } catch (error) {
      console.error('❌ Error al cargar contactos en abrirModal:', error);
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEventoSeleccionado(null);
    setFechaPredefinida(null);
  };

  const guardarEvento = async (eventoData: any) => {
    if (!usuarioId) {
      setError('No hay usuario autenticado');
      return;
    }

    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      if (eventoSeleccionado) {
        // Editar evento existente
        
        // 1. Actualizar datos básicos del evento
    

        const response = await fetch('/api/calendar', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_evento: eventoSeleccionado.id,
            id_editor: usuarioId,
            titulo: eventoData.titulo,
            descripcion: eventoData.descripcion,
            fecha: eventoData.fecha_programada,
            color: eventoData.color,
          }),
        });

       

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error al actualizar evento:', errorText);
          throw new Error(`Error al actualizar evento: ${response.status} - ${errorText}`);
        }

        // 2. Actualizar invitados del evento
        const invitadosIds = eventoData.invitados || [];
        
        const invitadosResponse = await fetch('/api/calendar/invitados', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_evento: eventoSeleccionado.id,
            id_editor: usuarioId,
            participantes: invitadosIds,
          }),
        });

        if (!invitadosResponse.ok) {
          const errorText = await invitadosResponse.text();
          console.error('❌ Error al actualizar invitados:', errorText);
          throw new Error(`Error al actualizar invitados: ${invitadosResponse.status} - ${errorText}`);
        }

        // Recargar todos los eventos desde el servidor para tener datos completos
        await cargarEventos(usuarioId);
      } else {
        // Crear nuevo evento
        
        // Los invitados ya vienen como IDs de usuario del frontend
        const invitadosIds = Array.isArray(eventoData.invitados) ? eventoData.invitados : [];
        
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_creador: usuarioId,
            titulo: eventoData.titulo,
            descripcion: eventoData.descripcion,
            fecha: eventoData.fecha_programada,
            color: eventoData.color,
            invitados: invitadosIds.length > 0 ? invitadosIds : null,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error detallado del servidor:', errorText);
          throw new Error(`Error al crear evento: ${response.status} - ${errorText}`);
        }
        const resultado = await response.json();
        
        // Recargar todos los eventos desde el servidor para tener datos completos
        await cargarEventos(usuarioId);
      }
      
      cerrarModal();
    } catch (err: any) {
      console.error('Error al guardar evento:', err);
      setError(err.message);
    }
  };

  // Función para manejar click en evento existente
  const manejarClickEvento = async (evento: Evento) => {
    try {
      // Cargar detalles completos del evento incluyendo invitados
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      
      const usuarioIdNum = await obtenerUsuarioId();
      
      const detallesUrl = `/api/calendar/details?id_evento=${evento.id}&id_usuario=${usuarioIdNum}`;
      
      const detallesResponse = await fetch(detallesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      let eventoCompleto = evento;
      
      if (detallesResponse.ok) {
        const detalles = await detallesResponse.json();
        
        let eventoBase = {};
        let invitadosMapeados: Contact[] = [];
        
        if (Array.isArray(detalles) && detalles.length > 0) {
          // El primer elemento contiene los datos base del evento
          eventoBase = {
            id: detalles[0].id,
            titulo: detalles[0].titulo,
            descripcion: detalles[0].descripcion,
            color: detalles[0].color,
            fecha: detalles[0].fecha,
            creado_por: detalles[0].creado_por,
            rol: detalles[0].rol
          };
          
          // Extraer invitados de cada elemento del array
          invitadosMapeados = detalles
            .filter(item => item.id_invitado) // Solo elementos que tienen invitado
            .map((item) => {
              return {
                id: item.id_invitado,
                nombre: item.nombre || 'Sin nombre',
                apellido: item.apellido || '',
                apodo: item.apodo || null,
                estado: 'available',
                favorito: false,
                confirmacion: item.confirmado === true ? 'confirmado' : 
                             item.confirmado === false ? 'rechazado' : 'pendiente'
              };
            });
          
        } else if (detalles && typeof detalles === 'object') {
          eventoBase = detalles;
          
          // Si es objeto único, verificar otros campos para invitados
          const invitadosRaw = detalles.invitados || 
                              detalles.guests || 
                              detalles.participants || 
                              detalles.invited_users || 
                              detalles.attendees || 
                              [];
          
          invitadosMapeados = Array.isArray(invitadosRaw) 
            ? invitadosRaw.map((invitado: any) => {
                return {
                  id: invitado.id,
                  nombre: invitado.nombre || invitado.name || 'Sin nombre',
                  apellido: invitado.apellido || invitado.last_name || '',
                  apodo: invitado.apodo || invitado.nickname || null,
                  estado: invitado.estado || invitado.status || 'available',
                  favorito: invitado.favorito || invitado.favorite || false,
                  confirmacion: invitado.confirmacion || invitado.confirmation_status || 'pendiente'
                };
              })
            : [];
        }
        
        // 🆕 AGREGAR AL CREADOR COMO PARTICIPANTE CONFIRMADO
        if (eventoBase) {
          // Verificar si el creador ya está en la lista de invitados
          const creadorId = (eventoBase as any).creado_por;
          const creadorYaEnLista = invitadosMapeados.some(inv => inv.id === creadorId);
          
          if (!creadorYaEnLista && creadorId) {
            // Intentar obtener el nombre del creador de múltiples fuentes
            let nombreCreador = 'Organizador'; // Valor por defecto
            let apellidoCreador = '';
            let apodoCreador = null;
            
            // Revisar diferentes campos que podrían contener el nombre del creador
            if ((eventoBase as any).creador_nombre) {
              nombreCreador = (eventoBase as any).creador_nombre;
              apellidoCreador = (eventoBase as any).creador_apellido || '';
              apodoCreador = (eventoBase as any).creador_apodo || null;
            } else if ((eventoBase as any).creator_name) {
              nombreCreador = (eventoBase as any).creator_name;
              apellidoCreador = (eventoBase as any).creator_last_name || '';
              apodoCreador = (eventoBase as any).creator_nickname || null;
            } else if ((eventoBase as any).nombre_creador) {
              nombreCreador = (eventoBase as any).nombre_creador;
              apellidoCreador = (eventoBase as any).apellido_creador || '';
              apodoCreador = (eventoBase as any).apodo_creador || null;
            } else {
              // Si no tenemos información del creador en el evento, buscar en contactos o datos del usuario actual
              
              // Si el creador es el usuario actual, obtener su información desde la sesión
              if (creadorId === usuarioId) {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user?.user_metadata) {
                    nombreCreador = user.user_metadata.nombre || user.user_metadata.name || 'Tú';
                    apellidoCreador = user.user_metadata.apellido || user.user_metadata.last_name || '';
                    apodoCreador = user.user_metadata.apodo || user.user_metadata.nickname || null;
                  }
                } catch (error) {
                  console.error('Error al obtener información del usuario actual:', error);
                }
              }
              
              // Si aún no tenemos información, buscar en contactos
              if (nombreCreador === 'Organizador') {
                const contactoCreador = contactos.find(contact => contact.id === creadorId);
                if (contactoCreador) {
                  nombreCreador = contactoCreador.nombre || 'Usuario';
                  apellidoCreador = contactoCreador.apellido || '';
                  apodoCreador = contactoCreador.apodo || null;
                } else {
                  // Como último recurso, consultar directamente la base de datos
                  try {
                    const { data: userData, error } = await supabase
                      .from('Usuario')
                      .select('nombre, apellido, apodo')
                      .eq('id', creadorId)
                      .single();
                    
                    if (userData && !error) {
                      nombreCreador = userData.nombre || 'Usuario';
                      apellidoCreador = userData.apellido || '';
                      apodoCreador = userData.apodo || null;
                    } else {
                      nombreCreador = `Usuario ${creadorId}`;
                    }
                  } catch (dbError) {
                    console.error('Error al consultar base de datos para información del creador:', dbError);
                    nombreCreador = `Usuario ${creadorId}`;
                  }
                }
              }
            }
            
            // Agregar al creador al inicio de la lista como confirmado
            const creadorComoParticipante = {
              id: creadorId,
              nombre: nombreCreador,
              apellido: apellidoCreador,
              apodo: apodoCreador,
              estado: 'available' as const,
              favorito: false,
              confirmacion: 'confirmado' as const, // El creador siempre está confirmado
              esCreador: true // Marca especial para identificarlo
            };
            
            invitadosMapeados = [creadorComoParticipante, ...invitadosMapeados];
          }
        }
        
        // Combinar datos del evento con los detalles completos
        eventoCompleto = {
          ...evento,
          ...eventoBase,
          invitados: invitadosMapeados
        };
      } else {
        const errorText = await detallesResponse.text();
        console.error('📋 ❌ Error al cargar detalles:', {
          status: detallesResponse.status,
          statusText: detallesResponse.statusText,
          errorText: errorText
        });
      }
      
      // Cargar confirmación del usuario para este evento
      const confirmacion = await cargarConfirmacionUsuario(evento.id);
      
      // Agregar la confirmación al evento
      const eventoConConfirmacion = {
        ...eventoCompleto,
        miConfirmacion: confirmacion
      };
      
      setEventoDetalles(eventoConConfirmacion);
      setMostrarDetalles(true);
      
    } catch (error) {
      console.error('📋 ❌ Error en manejarClickEvento:', error);
      console.error('📋 ❌ Stack trace:', error instanceof Error ? error.stack : 'No stack available');
      // Mostrar el evento sin confirmación si hay error
      setEventoDetalles(evento);
      setMostrarDetalles(true);
    }
  };

  // Función para manejar click en espacio vacío (crear nuevo evento)
  const manejarClickEspacio = (fechaPredefinida: Date) => {
    abrirModal(undefined, fechaPredefinida);
  };

  // Función para cerrar modal de detalles
  const cerrarDetalles = () => {
    setMostrarDetalles(false);
    setEventoDetalles(null);
  };

  // Función para mostrar confirmación de eliminación
  const confirmarEliminacion = (eventoId: number) => {
    setEventoAEliminar(eventoId);
    setMostrarConfirmacion(true);
  };

  // Función para borrar evento (sin confirmación, ya confirmado por modal)
  const borrarEvento = async () => {
    if (!usuarioId || !eventoAEliminar) {
      setError('No hay usuario autenticado o evento seleccionado');
      return;
    }

    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      const response = await fetch('/api/calendar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_evento: eventoAEliminar,
          id_editor: usuarioId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al eliminar evento: ${response.status}`);
      }

      // Actualizar estado local
      setEventos(prev => prev.filter(e => e.id !== eventoAEliminar));
      cerrarDetalles();
      
      // Cerrar modal de confirmación
      setMostrarConfirmacion(false);
      setEventoAEliminar(null);
    } catch (err: any) {
      console.error('Error al borrar evento:', err);
      setError(err.message);
    }
  };

  // Función para cancelar eliminación
  const cancelarEliminacion = () => {
    setMostrarConfirmacion(false);
    setEventoAEliminar(null);
  };

  // Función para editar evento desde el modal de detalles
  const editarEvento = async (evento: Evento) => {
    cerrarDetalles(); // Cerrar modal de detalles
    setEventoSeleccionado(evento); // Setear el evento a editar
    
    // Cargar contactos antes de abrir el modal de edición
    try {
      await cargarContactos();
    } catch (error) {
      console.error('❌ Error al cargar contactos para edición:', error);
    }
    
    setMostrarModal(true); // Abrir modal de edición
  };

  // Función para cargar confirmación del usuario para un evento
  const cargarConfirmacionUsuario = async (eventoId: number): Promise<'pendiente' | 'confirmado' | 'rechazado'> => {
    try {
      if (!usuarioId) return 'pendiente';

      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      const response = await fetch(`/api/calendar/confirmacion?evento_id=${eventoId}&usuario_id=${usuarioId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return 'pendiente';
      }

      const data = await response.json();
      return data.confirmacion || 'pendiente';
    } catch (error) {
      console.error('Error cargando confirmación:', error);
      return 'pendiente';
    }
  };

  // Función para actualizar confirmación del usuario
  const actualizarConfirmacion = async (confirmacion: 'confirmado' | 'rechazado') => {
    try {
      if (!usuarioId || !eventoDetalles) return;

      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      const response = await fetch('/api/calendar/confirmacion', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento_id: eventoDetalles.id,
          usuario_id: usuarioId,
          confirmacion
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al actualizar confirmación: ${response.status}`);
      }
      
      // 🚀 ACTUALIZACIÓN EN TIEMPO REAL: Actualizar el estado local sin recargar
      setEventos(eventosAnteriores => eventosAnteriores.map(evento => {
        if (evento.id === eventoDetalles.id) {
          return {
            ...evento,
            miConfirmacion: confirmacion
          };
        }
        return evento;
      }));
      
      // También actualizar los detalles del evento si está abierto
      setEventoDetalles(detallesAnteriores => {
        if (detallesAnteriores && detallesAnteriores.id === eventoDetalles.id) {
          // Actualizar también mi confirmación en la lista de invitados
          const invitadosActualizados = detallesAnteriores.invitados?.map(invitado => {
            if (invitado.id === usuarioId) {
              return {
                ...invitado,
                confirmacion: confirmacion
              };
            }
            return invitado;
          }) || [];

          return {
            ...detallesAnteriores,
            miConfirmacion: confirmacion,
            invitados: invitadosActualizados
          };
        }
        return detallesAnteriores;
      });
      
    } catch (error) {
      console.error('Error actualizando confirmación:', error);
      throw error;
    }
  };

  // Función para obtener la clase CSS del color
  const obtenerClaseColor = (color?: string) => {
    const colorConfig = COLORES_EVENTO.find(c => c.valor === color);
    return colorConfig ? colorConfig.clase : 'bg-blue-500';
  };

  // Función para obtener estilos según estado de confirmación
  const obtenerEstilosEvento = (color?: string, miConfirmacion?: 'pendiente' | 'confirmado' | 'rechazado', esOrganizador?: boolean) => {
    const baseColor = obtenerClaseColor(color);
    
    // Si soy el organizador, siempre mostrar como confirmado
    const estadoFinal = esOrganizador ? 'confirmado' : miConfirmacion;
    
    switch (estadoFinal) {
      case 'pendiente':
        // Borde punteado con fondo semi-transparente
        return {
          className: `border-2 border-dashed ${baseColor.replace('bg-', 'border-')} bg-opacity-30 ${baseColor}`,
          estiloTexto: 'text-gray-800 dark:text-gray-200',
          patronRechazado: false
        };
        
      case 'rechazado':
        // Fondo con patrón diagonal para indicar rechazo
        return {
          className: `${baseColor} bg-opacity-50 relative overflow-hidden`,
          estiloTexto: 'text-white relative z-10',
          patronRechazado: true
        };
        
      case 'confirmado':
      default:
        // Estilo normal sólido
        return {
          className: baseColor,
          estiloTexto: 'text-white',
          patronRechazado: false
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header del calendario */}
      <div className="p-4">
        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: '#EA580C' }}>Calendario</h1>
          <button
            onClick={() => abrirModal()}
            className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-2 rounded-md font-semibold hover:brightness-105 transition flex items-center gap-2"
          >
            <i data-feather="plus" className="w-4 h-4"></i>{' '}
            Nueva reunión
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Navegación de fechas */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navegarFecha('anterior')}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <i data-feather="chevron-left" className="w-5 h-5"></i>
            </button>
            
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white min-w-[200px] text-center">
              {formatearFecha(fechaActual)}
            </h2>
            
            <button
              onClick={() => navegarFecha('siguiente')}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <i data-feather="chevron-right" className="w-5 h-5"></i>
            </button>

            <button
              onClick={() => setFechaActual(new Date())}
              className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm"
            >
              Hoy
            </button>
          </div>

          {/* Selector de vista */}
          <div className="flex bg-white/20 rounded-lg p-1">
            {['dia', 'semana', 'mes'].map((v) => (
              <button
                key={v}
                onClick={() => setVista(v as VistaCalendario)}
                className={`px-3 py-1 rounded-md text-sm capitalize transition ${
                  vista === v
                    ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/20'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del calendario */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando eventos...</p>
            </div>
          </div>
        ) : (
          <>
            {vista === 'dia' && <VistaDia eventos={eventos} fecha={fechaActual} onEventoClick={manejarClickEvento} onClickEspacio={manejarClickEspacio} obtenerClaseColor={obtenerClaseColor} obtenerEstilosEvento={obtenerEstilosEvento} />}
            {vista === 'semana' && <VistaSemana eventos={eventos} fecha={fechaActual} onEventoClick={manejarClickEvento} onClickEspacio={manejarClickEspacio} obtenerClaseColor={obtenerClaseColor} obtenerEstilosEvento={obtenerEstilosEvento} />}
            {vista === 'mes' && <VistaMes eventos={eventos} fecha={fechaActual} onEventoClick={manejarClickEvento} onClickEspacio={manejarClickEspacio} obtenerClaseColor={obtenerClaseColor} obtenerEstilosEvento={obtenerEstilosEvento} />}
          </>
        )}
      </div>

        {/* Modal para crear/editar evento */}
        {mostrarModal && (
          <ModalEvento
            evento={eventoSeleccionado}
            contactos={contactos}
            cargandoContactos={cargandoContactos}
            onGuardar={guardarEvento}
            onCerrar={cerrarModal}
            fechaPredefinida={fechaPredefinida}
          />
        )}

        {/* Modal para ver detalles del evento */}
        {mostrarDetalles && eventoDetalles && (
          <ModalDetallesEvento
            evento={eventoDetalles}
            usuarioId={usuarioId}
            onCerrar={cerrarDetalles}
            onEditar={() => editarEvento(eventoDetalles)}
            onBorrar={() => confirmarEliminacion(eventoDetalles.id)}
            onConfirmar={actualizarConfirmacion}
            obtenerClaseColor={obtenerClaseColor}
            obtenerEstilosEvento={obtenerEstilosEvento}
          />
        )}

        {/* Modal de confirmación de eliminación */}
        {mostrarConfirmacion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirmar eliminación
              </h3>
              <p className="text-gray-700 mb-6">
                ¿Está seguro que quiere eliminar este evento?
              </p>
              <div className="flex gap-3 justify-between">
                <button
                  onClick={cancelarEliminacion}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={borrarEvento}
                  className="flex-1 px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// Componentes de vistas
function VistaDia({ eventos, fecha, onEventoClick, onClickEspacio, obtenerClaseColor, obtenerEstilosEvento }: { 
  eventos: Evento[], 
  fecha: Date, 
  onEventoClick: (evento: Evento) => void, 
  onClickEspacio: (fechaPredefinida: Date) => void, 
  obtenerClaseColor: (color?: string) => string,
  obtenerEstilosEvento: (color?: string, miConfirmacion?: 'pendiente' | 'confirmado' | 'rechazado', esOrganizador?: boolean) => any
}) {
  const eventosDia = eventos.filter(evento => {
    const fechaEvento = new Date(evento.fecha_programada);
    return fechaEvento.toDateString() === fecha.toDateString();
  });

  const horas = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="grid grid-cols-[60px_1fr] gap-0 h-full">
      {/* Columna de horas */}
      <div className="border-r border-gray-200 dark:border-gray-700">
        {horas.map(hora => (
          <div key={hora} className="h-16 flex items-start justify-end pr-2 pt-1 text-xs text-gray-500">
            {hora.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Columna de eventos */}
      <div className="relative">
        {horas.map(hora => (
          <div 
            key={hora} 
            className="h-16 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            onClick={() => {
              const nuevaFecha = new Date(fecha);
              nuevaFecha.setHours(hora, 0, 0, 0);
              onClickEspacio(nuevaFecha);
            }}
          ></div>
        ))}
        
        {/* Eventos */}
        {eventosDia.map(evento => {
          const fechaEvento = new Date(evento.fecha_programada);
          const hora = fechaEvento.getHours();
          const minutos = fechaEvento.getMinutes();
          const top = (hora * 64) + (minutos / 60 * 64);
          
          const estilos = obtenerEstilosEvento(evento.color, evento.miConfirmacion, evento.usuarioEsCreador);
          
          return (
            <button
              key={evento.id}
              className={`absolute left-1 right-1 ${estilos.className} p-2 rounded cursor-pointer hover:brightness-110 transition-all text-left ${estilos.estiloTexto}`}
              style={{ top: `${top}px`, height: '60px' }}
              onClick={(e) => {
                e.stopPropagation();
                onEventoClick(evento);
              }}
            >
              {/* Patrón de rechazo */}
              {estilos.patronRechazado && (
                <div className="absolute inset-0 opacity-40 pointer-events-none"
                     style={{
                       backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 12px)',
                     }}>
                </div>
              )}
              <div className="text-sm font-medium truncate relative z-10">{evento.titulo}</div>
              <div className="text-xs opacity-90 truncate relative z-10">
                {fechaEvento.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                {evento.miConfirmacion === 'pendiente' && (
                  <span className="ml-2 text-xs bg-yellow-500 text-white px-1 rounded">Pendiente</span>
                )}
                {evento.miConfirmacion === 'rechazado' && (
                  <span className="ml-2 text-xs bg-red-500 text-white px-1 rounded">Rechazado</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VistaSemana({ eventos, fecha, onEventoClick, onClickEspacio, obtenerClaseColor, obtenerEstilosEvento }: { 
  eventos: Evento[], 
  fecha: Date, 
  onEventoClick: (evento: Evento) => void, 
  onClickEspacio: (fechaPredefinida: Date) => void, 
  obtenerClaseColor: (color?: string) => string,
  obtenerEstilosEvento: (color?: string, miConfirmacion?: 'pendiente' | 'confirmado' | 'rechazado', esOrganizador?: boolean) => any
}) {
  // Obtener los días de la semana
  const inicioSemana = new Date(fecha);
  const diaActual = fecha.getDay();
  const diasParaLunes = diaActual === 0 ? 6 : diaActual - 1;
  inicioSemana.setDate(fecha.getDate() - diasParaLunes);
  
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana);
    dia.setDate(inicioSemana.getDate() + i);
    return dia;
  });

  const horas = Array.from({ length: 24 }, (_, i) => i);
  const diasNombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="h-full flex flex-col">
      {/* Header de días */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700">
        <div></div>
        {diasSemana.map((dia, index) => (
          <div key={dia.toISOString()} className="p-2 text-center border-l border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500">{diasNombres[index]}</div>
            <div className="text-lg font-medium">{dia.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Grid de horas y días */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Columna de horas */}
          <div className="border-r border-gray-200 dark:border-gray-700">
            {horas.map(hora => (
              <div key={hora} className="h-16 flex items-start justify-end pr-2 pt-1 text-xs text-gray-500">
                {hora.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {diasSemana.map((dia, diaIndex) => (
            <div key={dia.toISOString()} className="border-l border-gray-200 dark:border-gray-700 relative">
              {horas.map(hora => (
                <div 
                  key={hora} 
                  className="h-16 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => {
                    const nuevaFecha = new Date(dia);
                    nuevaFecha.setHours(hora, 0, 0, 0);
                    onClickEspacio(nuevaFecha);
                  }}
                ></div>
              ))}

              {/* Eventos del día */}
              {eventos
                .filter(evento => {
                  const fechaEvento = new Date(evento.fecha_programada);
                  return fechaEvento.toDateString() === dia.toDateString();
                })
                .map(evento => {
                  const fechaEvento = new Date(evento.fecha_programada);
                  const hora = fechaEvento.getHours();
                  const minutos = fechaEvento.getMinutes();
                  const top = (hora * 64) + (minutos / 60 * 64);
                  
                  const estilos = obtenerEstilosEvento(evento.color, evento.miConfirmacion, evento.usuarioEsCreador);
                  
                  return (
                    <div
                      key={evento.id}
                      className={`absolute left-1 right-1 ${estilos.className} p-1 rounded cursor-pointer hover:brightness-110 transition-all ${estilos.estiloTexto} relative`}
                      style={{ top: `${top}px`, height: '60px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventoClick(evento);
                      }}
                    >
                      {/* Patrón de rechazo */}
                      {estilos.patronRechazado && (
                        <div className="absolute inset-0 opacity-40 pointer-events-none"
                             style={{
                               backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)',
                             }}>
                        </div>
                      )}
                      <div className="text-xs font-medium truncate relative z-10">{evento.titulo}</div>
                      <div className="text-xs opacity-90 relative z-10">
                        {fechaEvento.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VistaMes({ eventos, fecha, onEventoClick, onClickEspacio, obtenerClaseColor, obtenerEstilosEvento }: { 
  eventos: Evento[], 
  fecha: Date, 
  onEventoClick: (evento: Evento) => void, 
  onClickEspacio: (fechaPredefinida: Date) => void, 
  obtenerClaseColor: (color?: string) => string,
  obtenerEstilosEvento: (color?: string, miConfirmacion?: 'pendiente' | 'confirmado' | 'rechazado', esOrganizador?: boolean) => any
}) {
  // Calcular los días del mes y semanas
  const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  
  // Ajustar para empezar en lunes
  const primerDiaSemana = new Date(primerDiaMes);
  const diaSemanaPrimero = primerDiaMes.getDay();
  const diasParaLunes = diaSemanaPrimero === 0 ? 6 : diaSemanaPrimero - 1;
  primerDiaSemana.setDate(primerDiaMes.getDate() - diasParaLunes);

  const diasCalendario: Date[] = [];
  const fechaIteracion = new Date(primerDiaSemana);
  
  // Generar 6 semanas (42 días)
  for (let i = 0; i < 42; i++) {
    diasCalendario.push(new Date(fechaIteracion));
    fechaIteracion.setDate(fechaIteracion.getDate() + 1);
  }

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="h-full flex flex-col">
      {/* Header de días de la semana */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {diasSemana.map(dia => (
          <div key={dia} className="p-2 text-center text-sm font-medium text-gray-500 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
            {dia}
          </div>
        ))}
      </div>

      {/* Grid del mes */}
      <div className="flex-1 grid grid-rows-6 gap-0">
        {Array.from({ length: 6 }, (_, semana) => (
          <div key={semana} className="grid grid-cols-7 flex-1">
            {diasCalendario.slice(semana * 7, (semana + 1) * 7).map((dia, diaIndex) => {
              const esDelMesActual = dia.getMonth() === fecha.getMonth();
              const eventosDia = eventos.filter(evento => {
                const fechaEvento = new Date(evento.fecha_programada);
                return fechaEvento.toDateString() === dia.toDateString();
              });

              return (
                <div
                  key={dia.toISOString()}
                  className={`border-r border-b border-gray-200 dark:border-gray-700 p-1 flex flex-col cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors min-h-24 ${
                    !esDelMesActual ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                  } last:border-r-0`}
                  onClick={() => {
                    // Crear nueva reunión en esta fecha
                    const nuevaFecha = new Date(dia);
                    nuevaFecha.setHours(9, 0, 0, 0); // Hora por defecto 9:00 AM
                    onClickEspacio(nuevaFecha);
                  }}
                >
                  <div className={`text-sm mb-1 ${esDelMesActual ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {dia.getDate()}
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {eventosDia.slice(0, 3).map(evento => {
                      const estilos = obtenerEstilosEvento(evento.color, evento.miConfirmacion, evento.usuarioEsCreador);
                      
                      return (
                        <div
                          key={evento.id}
                          className={`${estilos.className} text-xs p-1 rounded cursor-pointer hover:brightness-110 transition-all truncate relative ${estilos.estiloTexto}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevenir que se abra el modal de creación
                            onEventoClick(evento);
                          }}
                        >
                          {/* Patrón de rechazo */}
                          {estilos.patronRechazado && (
                            <div className="absolute inset-0 opacity-40 pointer-events-none rounded"
                                 style={{
                                   backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)',
                                 }}>
                            </div>
                          )}
                          <span className="relative z-10">
                            {evento.titulo}
                            {evento.miConfirmacion === 'pendiente' && (
                              <span className="ml-1 text-[10px] bg-yellow-500 text-white px-1 rounded">?</span>
                            )}
                            {evento.miConfirmacion === 'rechazado' && (
                              <span className="ml-1 text-[10px] bg-red-500 text-white px-1 rounded">✗</span>
                            )}
                            {evento.miConfirmacion === 'confirmado' && (
                              <span className="ml-1 text-[10px] bg-green-500 text-white px-1 rounded">✓</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                    {eventosDia.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{eventosDia.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Modal para crear/editar eventos
function ModalEvento({ 
  evento, 
  contactos, 
  cargandoContactos,
  onGuardar, 
  onCerrar,
  fechaPredefinida 
}: { 
  evento: Evento | null, 
  contactos: Contact[], 
  cargandoContactos?: boolean,
  onGuardar: (evento: any) => Promise<void>, 
  onCerrar: () => void,
  fechaPredefinida?: Date | null
}) {
  const [titulo, setTitulo] = useState(evento?.titulo || '');
  const [descripcion, setDescripcion] = useState(evento?.descripcion || '');
  const [fecha, setFecha] = useState(() => {
    const formatearFechaLocal = (date: Date) => {
      // Ajustar para timezone local
      const offset = date.getTimezoneOffset();
      const fechaLocal = new Date(date.getTime() - (offset * 60 * 1000));
      return fechaLocal.toISOString().slice(0, 16);
    };

    if (evento?.fecha_programada) {
      return formatearFechaLocal(new Date(evento.fecha_programada));
    }
    if (fechaPredefinida) {
      return formatearFechaLocal(fechaPredefinida);
    }
    
    // Fecha por defecto: mañana a las 9:00 AM
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(9, 0, 0, 0);
    return formatearFechaLocal(manana);
  });
  const [invitadosSeleccionados, setInvitadosSeleccionados] = useState<number[]>(() => {
    if (!evento?.invitados || !contactos?.length) {
      return [];
    }
    
    // Mapear invitados existentes a IDs de contactos
    const idsContactosSeleccionados: number[] = [];
    
    evento.invitados.forEach(invitado => {
      // Buscar el contacto que corresponde a este invitado
      const contactoCorrespondiente = contactos.find(contacto => 
        contacto.id_usuario === invitado.id
      );
      
      if (contactoCorrespondiente) {
        idsContactosSeleccionados.push(contactoCorrespondiente.id);
      }
    });
    
    return idsContactosSeleccionados;
  });
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [colorSeleccionado, setColorSeleccionado] = useState(evento?.color || 'blue');
  const [errorFecha, setErrorFecha] = useState<string | null>(null);

  // Efecto para actualizar campos cuando se abre modal de edición
  useEffect(() => {
    if (evento) {
      
      setTitulo(evento.titulo || '');
      setDescripcion(evento.descripcion || '');
      setColorSeleccionado(evento.color || 'blue');
      
      if (evento.fecha_programada) {
        const formatearFechaLocal = (date: Date) => {
          const offset = date.getTimezoneOffset();
          const fechaLocal = new Date(date.getTime() - (offset * 60 * 1000));
          return fechaLocal.toISOString().slice(0, 16);
        };
        
        const fechaFormateada = formatearFechaLocal(new Date(evento.fecha_programada));
        
        setFecha(fechaFormateada);
      }
    }
  }, [evento]);

  // Efecto para actualizar invitados seleccionados cuando cambien los contactos
  useEffect(() => {
    if (evento?.invitados && contactos?.length > 0) {
      const idsContactosSeleccionados: number[] = [];
      
      evento.invitados.forEach(invitado => {
        const contactoCorrespondiente = contactos.find(contacto => 
          contacto.id_usuario === invitado.id
        );
        
        if (contactoCorrespondiente) {
          idsContactosSeleccionados.push(contactoCorrespondiente.id);
        }
      });
      
      setInvitadosSeleccionados(idsContactosSeleccionados);
    }
  }, [evento?.invitados, contactos]);

  const manejarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    // Validación de fecha pasada
    const fechaSeleccionada = new Date(fecha);
    const ahora = new Date();
    
    if (fechaSeleccionada <= ahora) {
      setErrorFecha('No se puede crear un evento con fecha y hora anterior al momento actual');
      return;
    }

    // Limpiar error si estaba presente
    setErrorFecha(null);

    // Obtener los IDs de usuario de los contactos seleccionados
    const invitadosIds = invitadosSeleccionados.map(contactoId => {
      const contacto = contactos.find(c => c.id === contactoId);
      // Usar id_usuario si existe, sino usar id como fallback
      return contacto ? (contacto.id_usuario || contacto.id) : null;
    }).filter(id => id !== null);

    const eventoData = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha_programada: new Date(fecha).toISOString(),
      color: colorSeleccionado,
      invitados: invitadosIds,
    };

    onGuardar(eventoData);
  };

  const toggleInvitado = (contactoId: number) => {
    setInvitadosSeleccionados(prev =>
      prev.includes(contactoId)
        ? prev.filter(id => id !== contactoId)
        : [...prev, contactoId]
    );
  };

  // Filtrar contactos por búsqueda
  const contactosFiltrados = contactos.filter(contacto => {
    const nombreCompleto = `${contacto.nombre} ${contacto.apellido || ''}`.toLowerCase();
    const apodo = contacto.apodo?.toLowerCase() || '';
    const busqueda = busquedaContacto.toLowerCase();
    return nombreCompleto.includes(busqueda) || apodo.includes(busqueda);
  });

  // Función para mostrar el estado del contacto
  const getEstadoIcon = (estado?: string) => {
    switch (estado) {
      case 'available':
        return <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>;
      case 'busy':
        return <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>;
      case 'away':
        return <span className="w-2 h-2 bg-yellow-500 rounded-full inline-block"></span>;
      default:
        return <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>;
    }
  };

  useEffect(() => {
    feather.replace();
  }, []);

  useEffect(() => {
    feather.replace();
  }, [showTimePicker]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCerrar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCerrar]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTimePicker && !(event.target as Element).closest('.time-picker-container')) {
        setShowTimePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimePicker]);

  // Limpiar error cuando cambie la fecha
  useEffect(() => {
    if (errorFecha) {
      setErrorFecha(null);
    }
  }, [fecha]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {evento ? 'Editar Reunión' : 'Nueva Reunión'}
            </h3>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <i data-feather="x" className="w-5 h-5"></i>
            </button>
          </div>

          <form onSubmit={manejarGuardar} className="space-y-3">
            <div>
              <label htmlFor="titulo-evento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título *
              </label>
              <input
                id="titulo-evento"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Título de la reunión"
                required
              />
            </div>

            <div>
              <label htmlFor="descripcion-evento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                id="descripcion-evento"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                placeholder="Descripción de la reunión"
              />
            </div>

            {/* Selector de Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color del evento
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORES_EVENTO.map(color => (
                  <button
                    key={color.valor}
                    type="button"
                    onClick={() => setColorSeleccionado(color.valor)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color.clase} ${
                      colorSeleccionado === color.valor 
                        ? 'border-gray-800 dark:border-white scale-110 shadow-lg' 
                        : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                    }`}
                    title={color.nombre}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fecha-evento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha *
                </label>
                <input
                  id="fecha-evento"
                  type="date"
                  value={fecha.split('T')[0]}
                  onChange={(e) => {
                    const horaActual = fecha.split('T')[1] || '09:00';
                    setFecha(`${e.target.value}T${horaActual}`);
                    // Limpiar error al cambiar fecha
                    if (errorFecha) setErrorFecha(null);
                  }}
                  className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hora *
                </label>
                <div className="relative time-picker-container">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimePicker(!showTimePicker);
                    }}
                    className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <i data-feather="clock" className="w-4 h-4"></i>
                      <span>{fecha.split('T')[1] || '09:00'}</span>
                    </div>
                    <i data-feather="chevron-down" className="w-4 h-4"></i>
                  </button>
                  
                  {showTimePicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar Hora</span>
                        <button
                          type="button"
                          onClick={() => setShowTimePicker(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* Selectores simples */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Hora</label>
                          <select
                            value={fecha.split('T')[1]?.split(':')[0] || '09'}
                            onChange={(e) => {
                              const currentMinute = fecha.split('T')[1]?.split(':')[1] || '00';
                              const fechaActual = fecha.split('T')[0];
                              setFecha(`${fechaActual}T${e.target.value}:${currentMinute}`);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {Array.from({length: 24}, (_, i) => (
                              <option key={i} value={i.toString().padStart(2, '0')}>
                                {i.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Minutos</label>
                          <select
                            value={fecha.split('T')[1]?.split(':')[1] || '00'}
                            onChange={(e) => {
                              const currentHour = fecha.split('T')[1]?.split(':')[0] || '09';
                              const fechaActual = fecha.split('T')[0];
                              setFecha(`${fechaActual}T${currentHour}:${e.target.value}`);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="00">00</option>
                            <option value="15">15</option>
                            <option value="30">30</option>
                            <option value="45">45</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-3 space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowTimePicker(false)}
                          className="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mensaje de error para fecha pasada */}
            {errorFecha && (
              <div className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorFecha}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invitar Contactos
                {cargandoContactos && (
                  <span className="ml-2 text-xs text-blue-500">
                    🔄 Cargando contactos...
                  </span>
                )}
              </label>
              
              {/* Buscador de contactos */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar contactos..."
                    value={busquedaContacto}
                    onChange={(e) => setBusquedaContacto(e.target.value)}
                    className="w-full px-3 py-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <i data-feather="search" className="w-4 h-4 absolute left-2 top-2.5 text-gray-400"></i>
                </div>
              </div>

              {/* Lista de contactos */}
              <div className="max-h-20 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-1">
                {contactosFiltrados.map(contacto => (
                  <label key={contacto.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={invitadosSeleccionados.includes(contacto.id)}
                      onChange={() => toggleInvitado(contacto.id)}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    
                    <div className="flex items-center space-x-2 flex-1">
                      {/* Estado del contacto */}
                      {getEstadoIcon(contacto.estado)}
                      
                      {/* Nombre del contacto */}
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {contacto.nombre} {contacto.apellido}
                        {contacto.apodo && (
                          <span className="text-gray-500 dark:text-gray-400"> ({contacto.apodo})</span>
                        )}
                      </span>
                      
                      {/* Estrella de favorito */}
                      {contacto.favorito && (
                        <i data-feather="star" className="w-4 h-4 text-yellow-500 fill-current"></i>
                      )}
                    </div>
                  </label>
                ))}
                
                {contactosFiltrados.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {busquedaContacto ? 'No se encontraron contactos' : 'No hay contactos disponibles'}
                  </p>
                )}
              </div>
              
              {/* Contador de contactos seleccionados */}
              {invitadosSeleccionados.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {invitadosSeleccionados.length} contacto(s) seleccionado(s)
                </p>
              )}
            </div>



            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCerrar}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!titulo.trim()}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {evento ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal para mostrar detalles del evento
function ModalDetallesEvento({
  evento,
  usuarioId,
  onCerrar,
  onEditar,
  onBorrar,
  onConfirmar,
  obtenerClaseColor,
  obtenerEstilosEvento
}: {
  evento: Evento;
  usuarioId: number | null;
  onCerrar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
  onConfirmar?: (confirmacion: 'confirmado' | 'rechazado') => Promise<void>;
  obtenerClaseColor: (color?: string) => string;
  obtenerEstilosEvento: (color?: string, miConfirmacion?: 'pendiente' | 'confirmado' | 'rechazado', esOrganizador?: boolean) => any;
}) {
  const fechaEvento = new Date(evento.fecha_programada);
  
  // Verificar si el usuario actual es el creador del evento
  // IMPORTANTE: Solo usar campos confiables, NO usuario.usuarioEsCreador que puede estar mal
  const esCreador = Boolean(
    (usuarioId && evento.creador && evento.creador.id === usuarioId) ||
    (usuarioId && evento.creado_por === usuarioId)
  );
  
  // Verificar si el usuario actual es un invitado
  const esInvitado = usuarioId && evento.invitados?.some(inv => inv.id === usuarioId);
  
  // Estado para manejar la confirmación - usar directamente evento.miConfirmacion que ya está correctamente mapeado
  const [confirmacionActual, setConfirmacionActual] = useState<'pendiente' | 'confirmado' | 'rechazado'>(
    evento.miConfirmacion || 'pendiente'
  );
  const [actualizandoConfirmacion, setActualizandoConfirmacion] = useState(false);

  // Actualizar confirmación cuando cambie el evento
  useEffect(() => {
    setConfirmacionActual(evento.miConfirmacion || 'pendiente');
  }, [evento.miConfirmacion, evento.id]);
  
  // Manejar ESC para cerrar modal
  useEffect(() => {
    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
      }
    };
    
    document.addEventListener('keydown', manejarTecla);
    return () => document.removeEventListener('keydown', manejarTecla);
  }, [onCerrar]);

  // Función para manejar la confirmación de participación
  const manejarConfirmacion = async (nuevaConfirmacion: 'confirmado' | 'rechazado') => {
    if (!onConfirmar || !usuarioId) return;
    
    try {
      setActualizandoConfirmacion(true);
      await onConfirmar(nuevaConfirmacion);
      setConfirmacionActual(nuevaConfirmacion);
    } catch (error) {
      console.error('Error al actualizar confirmación:', error);
    } finally {
      setActualizandoConfirmacion(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header con color del evento */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {(() => {
                const estilos = obtenerEstilosEvento(evento.color, evento.miConfirmacion, esCreador);
                return (
                  <div className={`w-4 h-4 rounded-full ${estilos.className} relative`}>
                    {estilos.patronRechazado && (
                      <div className="absolute inset-0 rounded-full opacity-40"
                           style={{
                             backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)',
                           }}>
                      </div>
                    )}
                  </div>
                );
              })()}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalles del Evento
                {/* Solo mostrar badge de confirmación si NO soy el organizador */}
                {evento.creado_por !== usuarioId && (
                  <>
                    {confirmacionActual === 'pendiente' && (
                      <span className="ml-2 text-sm bg-yellow-500 text-white px-2 py-1 rounded-full">Pendiente</span>
                    )}
                    {confirmacionActual === 'rechazado' && (
                      <span className="ml-2 text-sm bg-red-500 text-white px-2 py-1 rounded-full">Rechazado</span>
                    )}
                    {confirmacionActual === 'confirmado' && (
                      <span className="ml-2 text-sm bg-green-500 text-white px-2 py-1 rounded-full">Confirmado</span>
                    )}
                  </>
                )}
              </h2>
            </div>
            <button
              onClick={onCerrar}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Información del evento */}
          <div className="space-y-4">
            {/* Título */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {evento.titulo}
              </h3>
              {evento.descripcion && (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {evento.descripcion}
                </p>
              )}
            </div>

            {/* Fecha y hora */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="text-sm font-medium">
                  {fechaEvento.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                <span className="text-sm">
                  {fechaEvento.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              
            </div>

            {/* Configuraciones del evento */}
            <div className="space-y-3">
            </div>

            {/* Invitados */}
            {evento.invitados && evento.invitados.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Invitados ({evento.invitados.length})
                </h4>
                <div className="space-y-2">
                  {evento.invitados.map(invitado => (
                    <div key={invitado.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                        (invitado as any).esCreador ? 'bg-blue-600' : 'bg-gray-600 dark:bg-gray-300'
                      }`}>
                        <span className={`${(invitado as any).esCreador ? 'text-white' : 'dark:text-black'}`}>
                          {invitado.nombre.charAt(0)}{invitado.apellido?.charAt(0) || ''}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          {invitado.nombre} {invitado.apellido}
                          {(invitado as any).esCreador && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                              Organizador
                            </span>
                          )}
                        </div>
                        {invitado.apodo && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({invitado.apodo})
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {invitado.confirmacion === 'confirmado' && (
                          <div className="w-2 h-2 rounded-full bg-green-400" title="Confirmado"></div>
                        )}
                        {invitado.confirmacion === 'rechazado' && (
                          <div className="w-2 h-2 rounded-full bg-red-400" title="No asistirá"></div>
                        )}
                        {(invitado.confirmacion === 'pendiente' || !invitado.confirmacion) && (
                          <div className="w-2 h-2 rounded-full bg-yellow-400" title="Pendiente de confirmar"></div>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          {invitado.confirmacion === 'confirmado' ? '✅' : 
                           invitado.confirmacion === 'rechazado' ? '❌' : '⏳'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Resumen de confirmaciones */}
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 flex justify-between items-center">
                    <span>Estado de confirmaciones:</span>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        {evento.invitados.filter(i => i.confirmacion === 'confirmado').length} ✅
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        {evento.invitados.filter(i => i.confirmacion === 'rechazado').length} ❌
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        {evento.invitados.filter(i => !i.confirmacion || i.confirmacion === 'pendiente').length} ⏳
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          {esCreador && (
            <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onEditar}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium min-w-[120px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
              <button
                onClick={onBorrar}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium min-w-[120px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Borrar
              </button>
            </div>
          )}
          
          {/* Confirmación de participación para invitados */}
          {esInvitado && !esCreador && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar Participación
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Estado actual: <span className={`font-medium ${
                    confirmacionActual === 'confirmado' ? 'text-green-600' : 
                    confirmacionActual === 'rechazado' ? 'text-red-600' : 
                    'text-yellow-600'
                  }`}>
                    {confirmacionActual === 'confirmado' ? '✅ Confirmado' : 
                     confirmacionActual === 'rechazado' ? '❌ Rechazado' : 
                     '⏳ Pendiente'}
                  </span>
                </p>
              </div>
              
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => manejarConfirmacion('confirmado')}
                  disabled={actualizandoConfirmacion || confirmacionActual === 'confirmado'}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium min-w-[100px] ${
                    confirmacionActual === 'confirmado'
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                  }`}
                >
                  {actualizandoConfirmacion && confirmacionActual !== 'confirmado' ? (
                    <>🔄 <span>Guardando...</span></>
                  ) : (
                    <>✅ <span>Asistiré</span></>
                  )}
                </button>
                
                <button
                  onClick={() => manejarConfirmacion('rechazado')}
                  disabled={actualizandoConfirmacion || confirmacionActual === 'rechazado'}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium min-w-[100px] ${
                    confirmacionActual === 'rechazado'
                      ? 'bg-red-100 text-red-700 cursor-default'
                      : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                  }`}
                >
                  {actualizandoConfirmacion && confirmacionActual !== 'rechazado' ? (
                    <>🔄 <span>Guardando...</span></>
                  ) : (
                    <>❌ <span>No asistiré</span></>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {!esCreador && !esInvitado && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Solo el creador del evento puede editarlo o eliminarlo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
