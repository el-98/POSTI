import { Alert } from "../models/Alert.js";

export const createLowStockAlert = async (productId) => {
  const existing = await Alert.findOne({ product: productId, alertType: "low_stock", attended: false });
  if (!existing) {
    await Alert.create({ product: productId, alertType: "low_stock" });
  }
};
