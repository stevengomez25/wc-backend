import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
    },
    variants: [{ // Array de todas las combinaciones posibles
        sku: { type: String, required: true, unique: true }, // ID único de la combinación (Ej: CAM-123-M-AZ)
        sizeName: { type: String, required: true },
        colorName: { type: String, required: true },
        quantity: { // Stock real para esta combinación
            type: Number,
            required: true,
            min: 0,
            default: 0
        }
    }],
    cost: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      default: 0,
    },

    image:{
      type: String
    },
      category:{
      type: String,
            enum: ["men", "women", "kids", "babies", "misc"],
            default: "misc",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
