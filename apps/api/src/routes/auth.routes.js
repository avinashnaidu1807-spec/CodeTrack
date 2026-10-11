import { Router } from "express";
import { finishGoogleLogin, getAuthStatus, getCurrentUser, logout, saveProblems, startGoogleLogin } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

export const authRouter = Router();
authRouter.get("/status", getAuthStatus);
authRouter.get("/google", startGoogleLogin);
authRouter.get("/google/callback", finishGoogleLogin);
authRouter.get("/me", requireAuth, getCurrentUser);
authRouter.put("/problems", requireAuth, saveProblems);
authRouter.post("/logout", logout);
