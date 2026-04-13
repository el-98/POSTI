import { Router } from "express";
import { clientAccess, csrfToken, login, logout, me, refresh, register } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { clientAccessSchema, loginSchema, logoutSchema, refreshSchema, registerSchema } from "../validators/schemas.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/client-access", validate(clientAccessSchema), clientAccess);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(logoutSchema), logout);
router.get("/csrf", csrfToken);
router.get("/me", protect, me);

export default router;
