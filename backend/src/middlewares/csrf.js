import crypto from "node:crypto";

const CSRF_IGNORED_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/csrf"
]);

export const ensureCsrfCookie = (req, res, next) => {
  let token = req.cookies.csrfToken;
  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    res.cookie("csrfToken", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
  }
  req.csrfToken = token;
  next();
};

export const csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (CSRF_IGNORED_PATHS.has(req.path)) return next();
  if (req.path.startsWith("/api/public/")) return next();

  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "CSRF token inválido o ausente" });
  }
  return next();
};
