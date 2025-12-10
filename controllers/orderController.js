import Order from "../models/Order.js";
import Product from "../models/Product.js"; // Necesario para verificar stock

// NOTA: Asegúrate de que tu modelo de Order también esté actualizado para guardar el 'sku' en los ítems.

/**
 * @desc Crea una nueva orden a partir del carrito del cliente.
 * @route POST /api/orders
 * @access Private/Public
 */
export const createOrder = async (req, res) => {
    // ⚠️ Se asume que el objeto 'cartItem' que llega en 'req.body.items' ahora incluye el campo 'sku'.
    try {
        const { items, shippingAddress, subtotal, shippingCost, taxAmount, totalAmount, paymentMethod } = req.body;

        // 1. VALIDACIÓN BÁSICA DEL CARRITO
        if (!items || items.length === 0) {
            return res.status(400).json({ 
                ok: false, 
                message: "El carrito está vacío. No se puede crear una orden." 
            });
        }

        const itemsToUpdate = [];

        // 2. VALIDACIÓN DE STOCK EN TIEMPO REAL (CRÍTICO - ADAPTADO A VARIANTES)
        for (const cartItem of items) {
            const dbProduct = await Product.findById(cartItem.productId);

            if (!dbProduct) {
                return res.status(404).json({ 
                    ok: false, 
                    message: `Producto no encontrado con ID: ${cartItem.productId}` 
                });
            }

            // 2.1 🎯 ENCUENTRA LA VARIANTE ESPECÍFICA USANDO sizeName Y colorName
            const selectedVariant = dbProduct.variants.find(v => 
                v.sizeName === cartItem.sizeName && v.colorName === cartItem.colorName
            );

            if (!selectedVariant) {
                return res.status(404).json({
                    ok: false,
                    message: `La combinación de talla (${cartItem.sizeName}) y color (${cartItem.colorName}) no existe para el producto: ${dbProduct.name}`
                });
            }

            // 2.2 VERIFICA STOCK
            const availableStock = selectedVariant.quantity;

            if (cartItem.quantity > availableStock) {
                 return res.status(400).json({ 
                    ok: false, 
                    message: `Stock insuficiente para ${dbProduct.name} (${cartItem.sizeName} / ${cartItem.colorName}). Disponible: ${availableStock}`
                 });
            }

            // 2.3 VERIFICA PRECIO (usando el precio del producto base, asumiendo que es uniforme)
            if (cartItem.cost !== dbProduct.cost) {
                return res.status(400).json({ 
                    ok: false, 
                    message: "Discrepancia de precio detectada. Por favor, recarga el carrito." 
                });
            }

            // Almacenar las referencias para la actualización de stock posterior
            itemsToUpdate.push({
                productId: cartItem.productId,
                sku: selectedVariant.sku, // El SKU es clave para la actualización
                quantity: cartItem.quantity
            });
        }

        // 3. CREACIÓN DEL DOCUMENTO DE ORDEN
        const newOrder = new Order({
            items,
            shippingAddress,
            subtotal,
            shippingCost,
            taxAmount,
            totalAmount,
            paymentMethod,
            customer: req.user ? req.user._id : null, 
            paymentStatus: "Pending",
            status: "Pending",
        });

        // 4. GUARDAR LA ORDEN (Se recomienda usar transacciones para producción)
        await newOrder.save();

        // 5. ACTUALIZACIÓN DEL STOCK (CRÍTICO - ADAPTADO A VARIANTE/SKU)
        // Disminuir el stock en el array 'variants' de cada producto.
        
        for (const item of itemsToUpdate) {
            await Product.updateOne(
                { _id: item.productId, "variants.sku": item.sku },
                { $inc: { "variants.$.quantity": -item.quantity } }
            );
        }

        // 6. RESPUESTA EXITOSA
        return res.status(201).json({
            ok: true,
            message: "Order created successfully. Stock updated.",
            order: newOrder,
        });

    } catch (error) {
        console.error("Error creating order:", error);
        // Podrías añadir lógica aquí para revertir la actualización de stock si el guardado falla
        return res.status(500).json({ 
            ok: false, 
            message: error.message 
        });
    }
};

// ----------------------------------------------------------------------------------

/**
 * @desc Obtiene todas las órdenes (usualmente para administradores).
 * @route GET /api/orders
 * @access Private (Admin)
 */
export const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
        const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
        const skip = (page - 1) * limit;

        const { status, customerId } = req.query;
        const query = {};

        if (status) query.status = status;
        if (customerId) query.customer = customerId;

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            // Opcional: Usamos populate para traer info del cliente
            .populate('customer', 'firstName lastName email');
            /*
            .populate({ // La población de items.productId es opcional si solo necesitas los datos que guardaste en la orden.
                path: 'items.productId',
                select: 'name code image'
            });
            */

        const total = await Order.countDocuments(query);

        res.json({
            ok: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            orders,
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({
            ok: false,
            message: "Error interno del servidor al obtener órdenes.",
        });
    }
};

// ----------------------------------------------------------------------------------

/**
 * @desc Obtiene una orden específica.
 * @route GET /api/orders/:id
 * @access Private (Admin o Cliente dueño de la orden)
 */
export const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'firstName lastName email');
            
        if (!order) {
            return res.status(404).json({ ok: false, message: "Order not found" });
        }
        
        // La validación de dueño de orden es una buena práctica y se mantiene comentada
        // if (order.customer && order.customer._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
        //    return res.status(403).json({ ok: false, message: "Not authorized to view this order" });
        // }


        res.json({ ok: true, order });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};

// ----------------------------------------------------------------------------------

/**
 * @desc Actualiza el estado de una orden (ej: de Processing a Shipped).
 * @route PUT /api/orders/:id/status
 * @access Private (Admin)
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ ok: false, message: "Order status is required" });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() }, 
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ ok: false, message: "Order not found" });
        }

        res.json({ 
            ok: true, 
            message: `Order status updated to ${status}`, 
            order: updatedOrder 
        });

    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};

// ----------------------------------------------------------------------------------

export const OrderController = {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus
};

export default OrderController;