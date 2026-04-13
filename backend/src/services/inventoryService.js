import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { createLowStockAlert } from "./alertService.js";

export const increaseStockFromPurchase = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new ApiError("Producto no encontrado", 404);
    product.currentStock += item.quantity;
    product.movementHistory.push({ type: "compra", quantity: item.quantity });
    await product.save();
  }
};

/** Solo valida que haya stock; no modifica. Para usar antes de crear la venta. */
export const validateStockForSale = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new ApiError("Producto no encontrado en venta", 404);
    if (product.currentStock < item.quantity) {
      throw new ApiError(`Stock insuficiente para "${product.name}". Hay ${product.currentStock}, se piden ${item.quantity}.`, 400);
    }
  }
};

export const decreaseStockFromSale = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new ApiError("Producto no encontrado", 404);
    if (product.currentStock < item.quantity) {
      throw new ApiError(`Stock insuficiente para ${product.name}`, 400);
    }
    product.currentStock -= item.quantity;
    product.movementHistory.push({ type: "venta", quantity: item.quantity });
    await product.save();
    if (product.currentStock <= product.minStock) {
      await createLowStockAlert(product._id);
    }
  }
};

/** Restaura stock al cancelar una venta (items con product, quantity) */
export const restoreStockFromCancelledSale = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
    product.currentStock += item.quantity;
    product.movementHistory.push({ type: "ajuste", quantity: item.quantity, reason: "Devolución / cancelación de venta" });
    await product.save();
  }
};
