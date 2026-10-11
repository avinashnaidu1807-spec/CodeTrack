import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "../config/env.js";
import { User } from "../models/user.model.js";

function readCookie(req, cookieName) {
  const cookieHeader = req.headers.cookie || "";
  const prefix = `${cookieName}=`;
  const item = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

export function isDatabaseReady() {
  return Boolean(config.mongoUri) && mongoose.connection.readyState === 1;
}

export async function requireAuth(req, res, next) {
  if (!isDatabaseReady()) {
    return res.status(503).json({ error: "Authentication storage is unavailable. Configure MONGODB_URI and start MongoDB." });
  }
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    return res.status(503).json({ error: "Authentication is not configured. Set a JWT_SECRET of at least 32 characters." });
  }

  const token = readCookie(req, "codetrack_session");
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });

  try {
    const payload = jwt.verify(token, config.jwtSecret, { issuer: "codetrack" });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}
