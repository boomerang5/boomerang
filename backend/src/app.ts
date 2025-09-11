import express from 'express';
import userRoutes from './routes/userRoutes';
import contactoRoutes from './routes/contactoRoutes';
import grupoRoutes from './routes/grupoRoutes';
import chatRoutes from './routes/chatRoutes';
<<<<<<< HEAD
import mensajeRoutes from './routes/mensajeRoutes'
import llamadaRoutes from './routes/llamadaRoutes'
=======
import mensajeRoutes from './routes/mensajeRoutes';
import calendarRoutes from './routes/calendarRoutes';
>>>>>>> 87bc30c29da3f1ee1917ffc0de53535237db1fe7
import swaggerUi from 'swagger-ui-express';
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());

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
<<<<<<< HEAD
app.use('/api/llamadas', llamadaRoutes);
=======
app.use('/api/calendar', calendarRoutes);
>>>>>>> 87bc30c29da3f1ee1917ffc0de53535237db1fe7

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`Swagger en http://localhost:${PORT}/api-docs`);
});
