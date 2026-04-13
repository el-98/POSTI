import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Product } from "../src/models/Product.js";

const seed = async () => {
  await connectDB();

  const password = await bcrypt.hash("12345678", 10);
  const defaults = [
    { name: "Admin POSIT", email: "admin@posit.local", password, role: "admin", walletBalance: 100 },
    { name: "Vendedor POSIT", email: "vendedor@posit.local", password, role: "vendedor" },
    { name: "Cliente POSIT", email: "cliente@posit.local", password, role: "cliente", pointsAccumulated: 250 }
  ];

  for (const data of defaults) {
    const exists = await User.findOne({ email: data.email });
    if (!exists) {
      await User.create(data);
      // eslint-disable-next-line no-console
      console.log("Creado:", data.email);
    }
  }

  const productDefaults = [
    { name: "Pantalla iPhone 11", sku: "SKU-IP11-SCR", category: "Repuestos", purchasePrice: 45, salePrice: 80, currentStock: 15, minStock: 5, supplier: "Proveedor Tech MX" },
    { name: "Bateria Samsung A52", sku: "SKU-A52-BAT", category: "Repuestos", purchasePrice: 18, salePrice: 35, currentStock: 4, minStock: 6, supplier: "Proveedor CellParts" }
  ];

  for (const data of productDefaults) {
    const exists = await Product.findOne({ sku: data.sku });
    if (!exists) await Product.create(data);
  }

  // eslint-disable-next-line no-console
  console.log("Seed listo. Admin/vendedor/cliente: admin@posit.local, vendedor@posit.local, cliente@posit.local / 12345678");
};

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Error en seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
