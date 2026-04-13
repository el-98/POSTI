export const notFound = (req, res) => {
  res.status(404).json({ message: "Recurso no encontrado" });
};

export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";
  if (err.code === "LIMIT_FILE_SIZE") {
    status = 400;
    message = "La imagen no debe superar 5 MB";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    status = 400;
    message = "Campo de archivo incorrecto. Usa el campo 'image'.";
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ message });
};
