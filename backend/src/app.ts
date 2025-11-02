import express from 'express';
import userRoutes from './routes/userRoutes';
import contactoRoutes from './routes/contactoRoutes';
import grupoRoutes from './routes/grupoRoutes';
import chatRoutes from './routes/chatRoutes';
import mensajeRoutes from './routes/mensajeRoutes'
import llamadaRoutes from './routes/llamadaRoutes'
import calendarRoutes from './routes/calendarRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportsRoutes from './routes/reportsRoutes';
import swaggerUi from 'swagger-ui-express';
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Configuración de CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Middleware de logging ANTES de express.json()
app.use((req, res, next) => {
  if (req.method === 'PATCH') {
    console.log(`🔍 [RAW] ${req.method} ${req.url} - ANTES de parsing`);
  }
  next();
});

app.use(express.json());

// Middleware de logging DESPUÉS de express.json()
app.use((req, res, next) => {
  if (req.method === 'PATCH') {
    console.log(`🔍 [PARSED] ${req.method} ${req.url} - DESPUÉS de parsing`);
    console.log(`� [PARSED] Body:`, req.body);
  }
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Boomerang',
      version: '1.0.0',
      description: 'Documentación del backend',
    },
    servers: [
      {
        url: 'http://localhost:3001',
      },
    ],
    paths: {}, 
  },
  apis: ['./src/routes/*.ts'],
};


const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users', userRoutes);
app.use('/api/contacts', contactoRoutes);
app.use('/api/groups', grupoRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/mensajes', mensajeRoutes);
app.use('/api/llamadas', llamadaRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportsRoutes);

// Middleware para capturar rutas no manejadas
app.use((req, res, next) => {
  if (req.method === 'PATCH') {
    console.log(`🚨 [UNHANDLED] PATCH ${req.url} - Ruta no manejada por ningún router`);
  }
  next();
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`Swagger en http://localhost:${PORT}/api-docs`);
});
