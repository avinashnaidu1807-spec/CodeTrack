export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Route not found." });
}

export function errorHandler(error, _req, res, _next) {
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status === 500 ? "Unexpected server error." : error.message
  });
}
