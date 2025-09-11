'use client';

import { useEffect, useState } from 'react';
// @ts-ignore
import feather from 'feather-icons';

// Datos hardcodeados para demostración
const EVENTOS_DEMO = [
  {
    id: 1,
    titulo: 'Reunión de Equipo',
    descripcion: 'Revisión semanal del proyecto',
    fecha_programada: '2025-09-09T10:00:00',
    color: 'blue',
    invitados: [
      { id: 2, nombre: 'Juan', apellido: 'Pérez', apodo: 'Juancho' },
      { id: 3, nombre: 'María', apellido: 'García', apodo: 'Mari' },
    ]
  },
  {
    id: 2,
    titulo: 'Presentación Cliente',
    descripcion: 'Demo del producto final',
    fecha_programada: '2025-09-10T14:30:00',
    color: 'red',
    invitados: [
      { id: 4, nombre: 'Carlos', apellido: 'López', apodo: 'Charlie' },
    ]
  },
  {
    id: 3,
    titulo: 'Stand-up Diario',
    descripcion: 'Sincronización del equipo',
    fecha_programada: '2025-09-11T09:00:00',
    color: 'green',
    invitados: [
      { id: 2, nombre: 'Juan', apellido: 'Pérez', apodo: 'Juancho' },
      { id: 3, nombre: 'María', apellido: 'García', apodo: 'Mari' },
      { id: 4, nombre: 'Carlos', apellido: 'López', apodo: 'Charlie' },
    ]
  },
  {
    id: 4,
    titulo: 'Planificación Sprint',
    descripcion: 'Definir tareas para el próximo sprint',
    fecha_programada: '2025-09-12T16:00:00',
    color: 'purple',
    invitados: []
  }
];

const CONTACTOS_DEMO = [
  { id: 2, nombre: 'Juan', apellido: 'Pérez', apodo: 'Juancho', estado: 'available', favorito: true },
  { id: 3, nombre: 'María', apellido: 'García', apodo: 'Mari', estado: 'busy', favorito: false },
  { id: 4, nombre: 'Carlos', apellido: 'López', apodo: 'Charlie', estado: 'away', favorito: true },
  { id: 5, nombre: 'Ana', apellido: 'Rodríguez', apodo: 'Anita', estado: 'available', favorito: false },
  { id: 6, nombre: 'Pedro', apellido: 'Martínez', apodo: 'Pedrito', estado: 'available', favorito: true },
  { id: 7, nombre: 'Laura', apellido: 'Fernández', apodo: 'Lau', estado: 'available', favorito: false },
  { id: 8, nombre: 'Miguel', apellido: 'Torres', apodo: 'Migue', estado: 'busy', favorito: true },
  { id: 9, nombre: 'Sofía', apellido: 'Ruiz', apodo: null, estado: 'away', favorito: false },
];

// Tipos
type Evento = {
  id: number;
  titulo: string;
  descripcion?: string;
  fecha_programada: string;
  invitados?: Contact[];
  color?: string;
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
  nombre: string;
  apellido?: string;
  apodo?: string | null;
  estado?: string;
  favorito?: boolean;
};

type VistaCalendario = 'dia' | 'semana' | 'mes';

export default function CalendarioPage() {
  // Estados
  const [vista, setVista] = useState<VistaCalendario>('mes');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>(EVENTOS_DEMO);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [fechaPredefinida, setFechaPredefinida] = useState<Date | null>(null);
  
  // Estados para modal de detalles de evento
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [eventoDetalles, setEventoDetalles] = useState<Evento | null>(null);

  // Configurar feather icons
  useEffect(() => {
    feather.replace();
  }, [vista, eventos, mostrarModal]);

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

  const abrirModal = (evento?: Evento, fechaPredefinida?: Date) => {
    setEventoSeleccionado(evento || null);
    setFechaPredefinida(fechaPredefinida || null);
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEventoSeleccionado(null);
    setFechaPredefinida(null);
  };

  const guardarEvento = async (eventoData: any) => {
    if (eventoSeleccionado) {
      // Editar evento existente
      setEventos(prev => prev.map(e => 
        e.id === eventoSeleccionado.id 
          ? { ...e, ...eventoData, invitados: eventoData.invitados?.map((id: number) => 
              CONTACTOS_DEMO.find(c => c.id === id)) || [] }
          : e
      ));
    } else {
      // Crear nuevo evento
      const nuevoEvento = {
        ...eventoData,
        id: Math.max(...eventos.map(e => e.id)) + 1,
        invitados: eventoData.invitados?.map((id: number) => 
          CONTACTOS_DEMO.find(c => c.id === id)) || []
      };
      setEventos(prev => [...prev, nuevoEvento]);
    }
    cerrarModal();
  };

  // Función para manejar click en evento existente
  const manejarClickEvento = (evento: Evento) => {
    setEventoDetalles(evento);
    setMostrarDetalles(true);
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

  // Función para borrar evento
  const borrarEvento = (eventoId: number) => {
    if (confirm('¿Estás seguro de que deseas eliminar este evento?')) {
      setEventos(prev => prev.filter(e => e.id !== eventoId));
      cerrarDetalles();
    }
  };

  // Función para editar evento desde el modal de detalles
  const editarEvento = (evento: Evento) => {
    cerrarDetalles(); // Cerrar modal de detalles
    setEventoSeleccionado(evento); // Setear el evento a editar
    setMostrarModal(true); // Abrir modal de edición
  };

  // Función para obtener la clase CSS del color
  const obtenerClaseColor = (color?: string) => {
    const colorConfig = COLORES_EVENTO.find(c => c.valor === color);
    return colorConfig ? colorConfig.clase : 'bg-blue-500';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header del calendario */}
        <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Calendario</h1>
          <button
            onClick={() => abrirModal()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <i data-feather="plus" className="w-4 h-4"></i>{' '}
            Nueva Reunión
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
                className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                  vista === v
                    ? 'bg-orange-500 text-white'
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
        {vista === 'dia' && <VistaDia eventos={eventos} fecha={fechaActual} onEventoClick={manejarClickEvento} onClickEspacio={manejarClickEspacio} obtenerClaseColor={obtenerClaseColor} />}
        {vista === 'semana' && <VistaSemana eventos={eventos} fecha={fechaActual} onEventoClick={manejarClickEvento} onClickEspacio={manejarClickEspacio} obtenerClaseColor={obtenerClaseColor} />}
        {vista === 'mes' && <VistaMes eventos={eventos} fecha={fechaActual} onEventoClick={manejarClickEvento} onClickEspacio={manejarClickEspacio} obtenerClaseColor={obtenerClaseColor} />}
      </div>

        {/* Modal para crear/editar evento */}
        {mostrarModal && (
          <ModalEvento
            evento={eventoSeleccionado}
            contactos={CONTACTOS_DEMO}
            onGuardar={guardarEvento}
            onCerrar={cerrarModal}
            fechaPredefinida={fechaPredefinida}
          />
        )}

        {/* Modal para ver detalles del evento */}
        {mostrarDetalles && eventoDetalles && (
          <ModalDetallesEvento
            evento={eventoDetalles}
            onCerrar={cerrarDetalles}
            onEditar={() => editarEvento(eventoDetalles)}
            onBorrar={() => borrarEvento(eventoDetalles.id)}
            obtenerClaseColor={obtenerClaseColor}
          />
        )}
    </div>
  );
}

// Componentes de vistas
function VistaDia({ eventos, fecha, onEventoClick, onClickEspacio, obtenerClaseColor }: { eventos: Evento[], fecha: Date, onEventoClick: (evento: Evento) => void, onClickEspacio: (fechaPredefinida: Date) => void, obtenerClaseColor: (color?: string) => string }) {
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
          
          return (
            <button
              key={evento.id}
              className={`absolute left-1 right-1 ${obtenerClaseColor(evento.color)} text-white p-2 rounded cursor-pointer hover:brightness-110 transition-all text-left`}
              style={{ top: `${top}px`, height: '60px' }}
              onClick={(e) => {
                e.stopPropagation();
                onEventoClick(evento);
              }}
            >
              <div className="text-sm font-medium truncate">{evento.titulo}</div>
              <div className="text-xs opacity-90 truncate">
                {fechaEvento.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VistaSemana({ eventos, fecha, onEventoClick, onClickEspacio, obtenerClaseColor }: { eventos: Evento[], fecha: Date, onEventoClick: (evento: Evento) => void, onClickEspacio: (fechaPredefinida: Date) => void, obtenerClaseColor: (color?: string) => string }) {
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
                  
                  return (
                    <div
                      key={evento.id}
                      className={`absolute left-1 right-1 ${obtenerClaseColor(evento.color)} text-white p-1 rounded cursor-pointer hover:brightness-110 transition-all`}
                      style={{ top: `${top}px`, height: '60px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventoClick(evento);
                      }}
                    >
                      <div className="text-xs font-medium truncate">{evento.titulo}</div>
                      <div className="text-xs opacity-90">
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

function VistaMes({ eventos, fecha, onEventoClick, onClickEspacio, obtenerClaseColor }: { eventos: Evento[], fecha: Date, onEventoClick: (evento: Evento) => void, onClickEspacio: (fechaPredefinida: Date) => void, obtenerClaseColor: (color?: string) => string }) {
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
                    {eventosDia.slice(0, 3).map(evento => (
                      <div
                        key={evento.id}
                        className={`${obtenerClaseColor(evento.color)} text-white text-xs p-1 rounded cursor-pointer hover:brightness-110 transition-all truncate`}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevenir que se abra el modal de creación
                          onEventoClick(evento);
                        }}
                      >
                        {evento.titulo}
                      </div>
                    ))}
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
  onGuardar, 
  onCerrar,
  fechaPredefinida 
}: { 
  evento: Evento | null, 
  contactos: Contact[], 
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
  const [invitadosSeleccionados, setInvitadosSeleccionados] = useState<number[]>(
    evento?.invitados?.map(i => i.id) || []
  );
  const [busquedaContacto, setBusquedaContacto] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [colorSeleccionado, setColorSeleccionado] = useState(evento?.color || 'blue');

  const manejarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    const eventoData = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      fecha_programada: new Date(fecha).toISOString(),
      color: colorSeleccionado,
      invitados: invitadosSeleccionados,
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
                      console.log('Time picker clicked, current state:', showTimePicker);
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invitar Contactos
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
  onCerrar,
  onEditar,
  onBorrar,
  obtenerClaseColor
}: {
  evento: Evento;
  onCerrar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
  obtenerClaseColor: (color?: string) => string;
}) {
  const fechaEvento = new Date(evento.fecha_programada);
  
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
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header con color del evento */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${obtenerClaseColor(evento.color)}`}></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Detalles del Evento
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
                      <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-300 flex items-center justify-center text-white dark:text-black text-xs font-medium">
                        {invitado.nombre.charAt(0)}{invitado.apellido?.charAt(0) || ''}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {invitado.nombre} {invitado.apellido}
                        </div>
                        {invitado.apodo && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({invitado.apodo})
                          </div>
                        )}
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-400" title="Confirmado"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
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
        </div>
      </div>
    </div>
  );
}
