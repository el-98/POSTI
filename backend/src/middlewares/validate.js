export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message);
    const message = details.length > 0 ? details.join(". ") : "Validación fallida";
    return res.status(400).json({
      message,
      details
    });
  }
  req.body = value;
  return next();
};
