// routes/orderRoutes.js

import express from 'express';
import { OrderController } from '../controllers/orderController.js'; 
// Asegúrate de que la ruta sea correcta
// Si usas Middlewares, impórtalos aquí:
// import { protect, admin } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Desestructurar las funciones del controlador
const { createOrder, getOrders, getOrder, updateOrderStatus } = OrderController;

// --- Rutas Públicas y Privadas ---

// POST /api/orders
// Crea una nueva orden (compra). Es pública si permites invitados, privada si es solo para usuarios registrados.
router.route('/')
    .post(createOrder) 
    // GET /api/orders
    // Obtiene todas las órdenes (requiere rol de Admin)
    // .get(protect, admin, getOrders); // Descomentar si usas middlewares de autenticación
    .get(getOrders); // Versión simple (sin autenticación de ejemplo)

// --- Rutas por ID de Orden ---

// GET /api/orders/:id
// Obtiene una orden específica (Requiere ser Admin o dueño de la orden)
// PUT /api/orders/:id/status
// Actualiza el estado de la orden (ej: de Pendiente a Enviado - Requiere Admin)
router.route('/:id')
    // .get(protect, getOrder) // Descomentar si usas middlewares
    .get(getOrder) // Versión simple

router.route('/:id/status')
    // .put(protect, admin, updateOrderStatus); // Descomentar si usas middlewares
    .put(updateOrderStatus); // Versión simple

export default router;