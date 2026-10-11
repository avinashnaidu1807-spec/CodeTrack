import "./config/load-env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { codeforcesRouter } from "./routes/codeforces.routes.js";
import { leetcodeRouter } from "./routes/leetcode.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { verifyOrigin } from "./middleware/verify-origin.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));

app.use("/api", verifyOrigin);
app.use("/api", rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CodeTrack API",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/codeforces", codeforcesRouter);
app.use("/api/leetcode", leetcodeRouter);
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  if (config.mongoUri) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log("MongoDB connected.");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
    }
  } else {
    console.warn("MONGODB_URI is not configured. Sign-in and protected routes will remain unavailable.");
  }

  app.listen(config.port, () => {
    console.log(`CodeTrack API listening on http://localhost:${config.port}`);
    console.log(`Allowed frontend origin: ${config.frontendOrigin}`);
  });
}

void startServer();
