import mongoose from "mongoose";

const movementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["compra", "venta", "ajuste"], required: true },
    quantity: { type: Number, required: true },
    reason: String,
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, index: true },
    barcode: { type: String, trim: true, index: true },
    category: { type: String, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, required: true, min: 0, default: 0 },
    supplier: { type: String, required: true },
    /** URL de imagen de referencia del producto (opcional) */
    imageUrl: { type: String, trim: true },
    /** Si es false, no aparece en Caja ni en listados por defecto (soft delete) */
    active: { type: Boolean, default: true, index: true },
    movementHistory: [movementSchema]
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
