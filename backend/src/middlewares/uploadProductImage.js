import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext.toLowerCase()) ? ext : ".jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safeExt}`;
    cb(null, name);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
  if (allowed) cb(null, true);
  else cb(new Error("Solo se permiten imágenes (JPEG, PNG, GIF, WebP)"), false);
};

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single("image");
