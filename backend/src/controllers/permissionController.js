import { asyncHandler } from "../utils/asyncHandler.js";
import { setPermissionsForRole, getPermissionMatrix } from "../services/permissionService.js";

export const getPermissions = asyncHandler(async (req, res) => {
  const matrix = await getPermissionMatrix();
  res.json(matrix);
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const { role, permissions } = req.body;
  const matrix = await setPermissionsForRole(role, permissions);
  res.json(matrix);
});
