export const PERMISSIONS = {
  USERS_READ: "users:read",
  USERS_UPDATE_ROLE: "users:update-role",
  AUDIT_READ: "audit:read",
  PERMISSIONS_READ: "permissions:read",
  PERMISSIONS_UPDATE: "permissions:update",
  PRODUCTS_READ: "products:read",
  PRODUCTS_CREATE: "products:create",
  PURCHASES_CREATE: "purchases:create",
  SALES_CREATE: "sales:create",
  REPAIRS_CREATE: "repairs:create",
  REPAIRS_UPDATE_STATUS: "repairs:update-status",
  REPORTS_READ: "reports:read",
  ALERTS_READ: "alerts:read",
  ALERTS_ATTEND: "alerts:attend",
  WALLET_READ: "wallet:read"
};

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  vendedor: [
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.REPAIRS_CREATE,
    PERMISSIONS.REPAIRS_UPDATE_STATUS,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.ALERTS_READ,
    PERMISSIONS.ALERTS_ATTEND,
    PERMISSIONS.WALLET_READ
  ],
  cliente: [PERMISSIONS.WALLET_READ]
};
