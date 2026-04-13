import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

/**
 * Crea el único administrador del sistema si no existe.
 * Se ejecuta al iniciar el servidor. No requiere comandos manuales.
 */
export async function ensureSingleAdmin() {
  const hasAdmin = await User.exists({ role: "admin" });
  if (hasAdmin) {
    // eslint-disable-next-line no-console
    console.log("Administrador ya existe en la base de datos.");
    return;
  }

  const email = (env.initialAdminEmail || "admin@posit.local").toString().toLowerCase().trim();
  const password = (env.initialAdminPassword || "12345678").toString();
  const name = (env.initialAdminName || "Administrador").toString().trim();

  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email,
    password: hashed,
    role: "admin",
    walletBalance: 0
  });
  // eslint-disable-next-line no-console
  console.log("Administrador único creado. Inicia sesión con:", email, "/", password);
}
