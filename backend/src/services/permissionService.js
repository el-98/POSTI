import { PERMISSIONS, ROLE_PERMISSIONS } from "../config/permissions.js";
import { PermissionConfig } from "../models/PermissionConfig.js";

export const getPermissionsForRole = async (role) => {
  const config = await PermissionConfig.findOne({ role });
  if (config?.permissions?.length) return config.permissions;
  return ROLE_PERMISSIONS[role] || [];
};

export const getPermissionMatrix = async () => {
  const configs = await PermissionConfig.find();
  const matrix = {};
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    const override = configs.find((cfg) => cfg.role === role);
    matrix[role] = override?.permissions?.length ? override.permissions : ROLE_PERMISSIONS[role];
  }
  return {
    availablePermissions: Object.values(PERMISSIONS),
    matrix
  };
};

export const setPermissionsForRole = async (role, permissions) => {
  await PermissionConfig.findOneAndUpdate(
    { role },
    { role, permissions },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return getPermissionMatrix();
};
