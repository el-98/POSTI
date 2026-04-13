import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(120).trim().required().messages({
    "string.empty": "El nombre es obligatorio",
    "string.min": "El nombre debe tener al menos 3 caracteres"
  }),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
    "string.empty": "El correo es obligatorio",
    "string.email": "Ingresa un correo electrónico válido"
  }),
  password: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required().messages({
    "string.empty": "La contraseña es obligatoria",
    "string.min": "La contraseña debe tener al menos 8 caracteres",
    "string.pattern.base": "La contraseña debe incluir letras y al menos un número"
  }),
  role: Joi.string().valid("vendedor", "cliente").optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
    "string.empty": "El correo es obligatorio",
    "string.email": "Ingresa un correo electrónico válido"
  }),
  password: Joi.string().required().messages({
    "string.empty": "La contraseña es obligatoria"
  }),
  deviceId: Joi.string().optional()
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
  deviceId: Joi.string().optional()
});

export const logoutSchema = Joi.object({
  userId: Joi.string().required(),
  deviceId: Joi.string().required()
});

export const clientAccessSchema = Joi.object({
  clientCode: Joi.string().trim().max(20).required().messages({
    "string.empty": "El código de cliente es obligatorio"
  }),
  pin: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      "string.empty": "El PIN es obligatorio",
      "string.length": "El PIN debe tener 6 dígitos",
      "string.pattern.base": "El PIN debe ser solo números"
    })
});

export const updateRoleSchema = Joi.object({
  role: Joi.string().valid("admin", "vendedor", "cliente").required()
});

export const createClientSchema = Joi.object({
  name: Joi.string().min(1).max(120).trim().required().messages({
    "string.empty": "El nombre del cliente es obligatorio",
    "string.max": "El nombre no puede superar 120 caracteres"
  }),
  accountType: Joi.string().valid("frecuente", "ocasional").optional()
});

export const updateClientSchema = Joi.object({
  name: Joi.string().min(1).max(120).trim().optional(),
  accountType: Joi.string().valid("frecuente", "ocasional").optional()
}).min(1);

export const permissionUpdateSchema = Joi.object({
  role: Joi.string().valid("admin", "vendedor", "cliente").required(),
  permissions: Joi.array().items(Joi.string()).required()
});

export const settingsSchema = Joi.object({
  ackRetentionHours: Joi.number().integer().min(1).max(720).required()
});

export const productSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().allow("").optional(),
  category: Joi.string().required(),
  purchasePrice: Joi.number().min(0).required(),
  salePrice: Joi.number().min(0).required(),
  currentStock: Joi.number().min(0).required(),
  minStock: Joi.number().min(0).required(),
  supplier: Joi.string().required(),
  imageUrl: Joi.string().allow("").optional()
});

export const productUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  category: Joi.string().optional(),
  purchasePrice: Joi.number().min(0).optional(),
  salePrice: Joi.number().min(0).optional(),
  currentStock: Joi.number().min(0).optional(),
  minStock: Joi.number().min(0).optional(),
  supplier: Joi.string().optional(),
  barcode: Joi.string().allow("").optional(),
  imageUrl: Joi.string().allow("").optional(),
  active: Joi.boolean().optional()
}).min(1);

export const purchaseSchema = Joi.object({
  supplier: Joi.string().required(),
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        cost: Joi.number().min(0).required()
      })
    )
    .min(1)
    .required()
});

export const saleSchema = Joi.object({
  client: Joi.string().required(),
  paymentMethod: Joi.string().valid("efectivo", "tarjeta", "transferencia", "monedero", "mixto").required(),
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    )
    .min(1)
    .required()
});

export const repairSchema = Joi.object({
  client: Joi.string().required(),
  problemDescription: Joi.string().required(),
  estimatedDate: Joi.date().optional(),
  cost: Joi.number().min(0).optional(),
  assignedTechnician: Joi.string().optional()
});
