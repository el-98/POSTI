import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { getPermissionsForRole } from "../services/permissionService.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError("Token requerido", 401));
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.accessSecret);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new ApiError("Usuario no encontrado", 401));
    req.user = user;
    return next();
  } catch {
    return next(new ApiError("Token inválido", 401));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError("Sin permisos para esta acción", 403));
  }
  return next();
};

export const authorizePermission = (...requiredPermissions) => (req, res, next) => {
  const run = async () => {
    const userPermissions = await getPermissionsForRole(req.user.role);
    const hasAllPermissions = requiredPermissions.every((permission) => userPermissions.includes(permission));
    if (!hasAllPermissions) {
      return next(new ApiError("Permisos insuficientes para esta operación", 403));
    }
    return next();
  };
  run().catch(next);
};
