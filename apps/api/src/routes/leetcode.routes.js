import { Router } from "express";
import { connectLeetCodeUsername, disconnectLeetCode } from "../controllers/leetcode.controller.js";
import { requireAuth } from "../middleware/require-auth.js";

export const leetcodeRouter = Router();
leetcodeRouter.use(requireAuth);
leetcodeRouter.post("/connect", connectLeetCodeUsername);
leetcodeRouter.delete("/connect", disconnectLeetCode);
