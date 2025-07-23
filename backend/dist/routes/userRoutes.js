"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos los usuarios
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios ficticia
 */
router.get('/', (_req, res) => {
    res.json([
        { id: '1', nombre: 'Juan' },
        { id: '2', nombre: 'María' },
    ]);
});
exports.default = router;
