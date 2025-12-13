import mongoose from "mongoose";

// --- Sub-esquema para los Items de la Orden ---
// Este sub-esquema debe reflejar con precisión la estructura de los objetos en 'cartItems'
const OrderItemSchema = new mongoose.Schema(
    {
        // Referencia al producto original (para búsquedas)
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product", // Referencia a tu modelo 'Product'
            required: true,
        },
        // ID único compuesto (productId-sizeName-colorName) que usaste en el frontend
        uniqueId: {
            type: String,
            required: true,
            trim: true,
        },
        // Información básica del producto en el momento de la compra
        name: { type: String, required: true },
        image: { type: String },
        
        // Detalles de la Variante Seleccionada
        sizeName: { type: String, required: true },
        colorName: { type: String, required: true },

        // Cantidad y Precio
        cost: { // Precio Unitario (guardado en el momento de la compra)
            type: Number,
            required: true,
            min: 0.01,
        },
        quantity: { // Cantidad comprada de esta variante
            type: Number,
            required: true,
            min: 1,
        },
        // Stock máximo disponible en el momento de añadir (solo informativo, no se requiere en la orden final)
        // maxStock: { type: Number, required: true } 
    },
    { _id: false } // No necesitamos un _id separado para cada subdocumento de ítem
);

// --- Sub-esquema para la Dirección de Envío ---
// Basado en el formulario que solicitaste
const ShippingAddressSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        zip: { type: String, required: true, trim: true },
        notes: { type: String, default: "" }, // Notas de envío opcionales
    },
    { _id: false }
);

// --- Esquema Principal de la Orden ---
const OrderSchema = new mongoose.Schema(
    {
        // 1. Cliente
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Referencia al usuario si está autenticado
            required: false, // Puede ser nulo para invitados
        },
        // 2. Estado de la Orden
        status: {
            type: String,
            enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
            default: "Pending",
        },
        // 3. Ítems Comprados
        items: {
            type: [OrderItemSchema],
            required: true,
        },
        // 4. Dirección de Envío
        shippingAddress: {
            type: ShippingAddressSchema,
            required: true,
        },
        // 5. Totales Financieros
        subtotal: {
            type: Number,
            required: true,
        },
        shippingCost: {
            type: Number,
            required: true,
            default: 0,
        },
        taxAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        // 6. Detalles de Pago (Simulado o real)
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refunded"],
            default: "Pending",
        },
    },
    { timestamps: true } // Agrega createdAt y updatedAt
);

export default mongoose.model("Order", OrderSchema);