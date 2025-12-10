import Product from "../models/Product.js";

// Create product
export const createProduct = async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      createdBy: req.user._id,
    });

    await product.save();

    return res.status(201).json({
      ok: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
};

// Get all products
export const getProducts = async (req, res) => {
    try {
        // 1. Extracción y Conversión Robusta de Parámetros
        // Aseguramos que 'page' y 'limit' sean números enteros positivos válidos.
        const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
        const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;

        const { search, minCost, maxCost, sort } = req.query;

        const query = {};

        // Lógica de Búsqueda (Search)
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        // Lógica de Filtrado por Costo
        if (minCost || maxCost) {
            query.cost = {};
            // El 'minCost' y 'maxCost' aquí ya han sido validados como números por express-validator.
            if (minCost) query.cost.$gte = Number(minCost);
            if (maxCost) query.cost.$lte = Number(maxCost);
        }

        // Cálculo de 'skip' con los valores numéricos validados
        const skip = (page - 1) * limit;

        // 2. Ejecución de la Consulta Mongoose
        const products = await Product.find(query)
            .sort(
                sort
                    ? sort.startsWith("-")
                        ? { [sort.substring(1)]: -1 }
                        : { [sort]: 1 }
                    : {}
            )
            .skip(skip)
            .limit(limit); // Usamos 'limit' que ya es un número

        const total = await Product.countDocuments(query);

        // 3. Respuesta Exitosa (200 OK)
        res.json({
            ok: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            products,
        });
        
    } catch (error) {
        // 4. Manejo de Errores (500 Internal Server Error)
        // Corregido: Devolvemos el mensaje de error real para debugging
        console.error("Error al obtener productos:", error);
        res.status(500).json({ 
            ok: false, 
            message: "Error interno del servidor al obtener productos.",
            // Opcional: solo para desarrollo: message: error.message 
        });
    }
};


// Get single product
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product)
      return res.status(404).json({ ok: false, message: "Product not found" });

    res.json({ ok: true, product });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};


// Update
/* Función auxiliar para calcular el stock total sumando las quantities de las variantes.
 * @param {Array} variants - Array de objetos variante.
 * @returns {number} El stock total.
 */
const calculateTotalStock = (variants) => {
    if (!variants || variants.length === 0) return 0;
    // Usamos || 0 para manejar posibles cantidades indefinidas o nulas con seguridad
    return variants.reduce((total, variant) => total + (variant.quantity || 0), 0);
};


export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        let productData = req.body; // Los datos recibidos del frontend

        // 1. Verificar existencia y propiedad
        const productToUpdate = await Product.findById(productId, { createdBy: 1 }); // Solo necesitamos el ID del creador

        if (!productToUpdate) {
            return res.status(404).json({ ok: false, message: "Product not found" });
        }

        // 2. VERIFICAR PROPIEDAD
        if (productToUpdate.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                ok: false, 
                message: "Not authorized to update this product" 
            });
        }

        // 3. 🎯 Pre-procesamiento: Recalcular el Stock Total
        if (productData.variants) {
            // Recalcula el stock total y lo agrega a los datos que se van a actualizar
            productData.stock = calculateTotalStock(productData.variants);
        }

        // 4. Realizar la actualización
        // Usamos findByIdAndUpdate para actualizar el documento en la base de datos
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            productData, // Incluye los nuevos 'variants' y el 'stock' calculado
            // { new: true } devuelve el documento actualizado
            // { runValidators: true } asegura que Mongoose ejecute validaciones (required, unique, min)
            { new: true, runValidators: true, context: 'query' } 
        );

        // 5. Respuesta Exitosa
        res.json({ ok: true, product: updatedProduct });

    } catch (error) {
        // 6. Manejo Centralizado de Errores

        // Manejar error de unicidad (código 11000 de MongoDB)
        if (error.code === 11000) {
            return res.status(400).json({ 
                ok: false, 
                message: "Validation Error: Product code or Variant SKU must be unique." 
            });
        }
        
        // Manejar errores de validación (por ejemplo, campo requerido o min/max)
        if (error.name === 'ValidationError') {
             // Mongoose validation errors
             return res.status(400).json({
                ok: false,
                message: `Validation Error: ${error.message}`,
             });
        }

        // Manejar cualquier otro error del servidor
        console.error("Server Error during product update:", error);
        return res.status(500).json({ 
            ok: false, 
            message: "Internal Server Error during product update." 
        });
    }
};

// Delete
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product)
      return res.status(404).json({ ok: false, message: "Product not found" });

    res.json({ ok: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
