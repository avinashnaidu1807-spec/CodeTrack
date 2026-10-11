import { Router } from "express";
import { connectCodeforcesHandle, disconnectCodeforces } from "../controllers/codeforces.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

export const codeforcesRouter = Router();
codeforcesRouter.use(requireAuth);
codeforcesRouter.post("/connect", connectCodeforcesHandle);
codeforcesRouter.delete("/connect", disconnectCodeforces);
