import { config } from "../config/env.js";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function verifyOrigin(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  // Non-browser clients may omit Origin; browser requests with an Origin must match the configured app.
  if (origin && origin !== config.frontendOrigin) {
    return res.status(403).json({ error: "Request origin is not allowed." });
  }
  return next();
}
