# Calendario - Gestión de Reuniones

## ¿Qué se ha implementado?

### Frontend (React/Next.js)

1. **Página Principal del Calendario** (`/app/protected/calendario/page.tsx`)
   - Tres vistas: Día, Semana y Mes
   - Navegación entre fechas (anterior/siguiente/hoy)
   - Visualización de eventos programados
   - Modal para crear y editar reuniones

2. **Funcionalidades del Modal**
   - Título y descripción de la reunión
   - Selector de fecha y hora
   - Invitación de contactos (usando la API existente)
   - Opción para habilitar asistente IA
   - Validación de formularios

3. **Sidebar Actualizado**
   - Nuevo enlace al calendario con ícono
   - Navegación integrada con las demás páginas

### Backend (Node.js/Express)

1. **Rutas API** (`/backend/src/routes/calendarRoutes.ts`)
   - `GET /api/calendar/eventos` - Obtener eventos de un usuario
   - `POST /api/calendar/eventos` - Crear nuevo evento
   - `PUT /api/calendar/eventos` - Actualizar evento existente
   - `DELETE /api/calendar/eventos` - Eliminar evento
   - `GET /api/calendar/invitados` - Obtener invitados de un evento
   - `POST /api/calendar/invitados` - Agregar invitados
   - `DELETE /api/calendar/invitados` - Remover invitado

2. **Controladores** (`/backend/src/controllers/calendarController.ts`)
   - Manejo completo de todas las operaciones CRUD
   - Validación de parámetros
   - Manejo de errores

3. **Servicios** (`/backend/src/services/calendar/calendarService.ts`)
   - Lógica de negocio para eventos y llamadas
   - Integración con Supabase
   - Manejo de relaciones entre EventoLlamada, Llamada y UsuarioXLlamada

### APIs Proxy (Next.js API Routes)

1. **Calendario Principal** (`/app/api/calendar/route.ts`)
   - Proxy para todas las operaciones de eventos
   - Manejo de autenticación

2. **Invitados** (`/app/api/calendar/invitados/route.ts`)
   - Proxy para manejo de invitados
   - Operaciones CRUD completas

## Características Implementadas

### ✅ Completadas
- [x] Vista de calendario (día, semana, mes)
- [x] Creación de reuniones con título y descripción
- [x] Invitación de contactos desde la lista existente
- [x] Navegación entre fechas
- [x] Integración con el sidebar
- [x] Modal responsive para crear/editar eventos
- [x] API completa del backend
- [x] Validación de formularios
- [x] Manejo de estados de carga

### 🔄 Para el Backend (próximos pasos)
- [ ] Autenticación y autorización
- [ ] Notificaciones por email
- [ ] Recordatorios automáticos
- [ ] Integración real con videollamadas
- [ ] Confirmación de asistencia
- [ ] Timezone handling

## Estructura de Base de Datos Utilizada

El sistema utiliza las siguientes tablas existentes:

1. **EventoLlamada** - Eventos programados
2. **Llamada** - Sesiones de videollamada
3. **UsuarioXLlamada** - Participantes de llamadas
4. **Usuario** - Información de usuarios
5. **ContactoUsuario** - Relaciones de contactos

## Cómo Probar

1. Navegar a `/protected/calendario`
2. Usar los controles de vista (día/semana/mes)
3. Hacer clic en "Nueva Reunión" para crear eventos
4. Navegar entre fechas con las flechas
5. Hacer clic en eventos existentes para editarlos

## Puertos de Desarrollo

- Frontend: http://localhost:3000
- Backend: http://localhost:3003
- Swagger: http://localhost:3003/api-docs

## Notas Técnicas

- El calendario mantiene el estilo visual consistente con el resto de la aplicación
- Se reutiliza la API de contactos existente
- Compatible con modo oscuro/claro
- Responsive design
- TypeScript completo en frontend y backend
