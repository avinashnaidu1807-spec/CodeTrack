import { validateLeetCodeUsername } from "../utils/validation.js";
import { getLeetCodeConnectionSnapshot } from "../services/leetcode.service.js";

export async function connectLeetCodeUsername(req, res, next) {
  try {
    const username = validateLeetCodeUsername(req.body?.username);
    const snapshot = await getLeetCodeConnectionSnapshot(username);
    req.user.set("linkedProfiles.leetcode", snapshot);
    await req.user.save();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}

export async function disconnectLeetCode(req, res, next) {
  try {
    req.user.set("linkedProfiles.leetcode", null);
    await req.user.save();
    res.json({ disconnected: true });
  } catch (error) {
    next(error);
  }
}
