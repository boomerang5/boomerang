import express from 'express';
import userRoutes from './routes/userRoutes';
import contactoRoutes from './routes/contactoRoutes';
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`Swagger en http://localhost:${PORT}/api-docs`);
});
