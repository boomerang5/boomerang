"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
app.use('/api/users', userRoutes_1.default);
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
    console.log(`Swagger en http://localhost:${PORT}/api-docs`);
});
