import { HttpError } from "../utils/http-error.js";
import { validateCodeforcesHandle } from "../utils/validation.js";
import { getCodeforcesConnectionSnapshot } from "../services/codeforces.service.js";

export async function connectCodeforcesHandle(req, res, next) {
  try {
    const handle = validateCodeforcesHandle(req.body?.handle);
    const snapshot = await getCodeforcesConnectionSnapshot(handle);
    req.user.set("linkedProfiles.codeforces", snapshot);
    await req.user.save();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}

export async function disconnectCodeforces(req, res, next) {
  try {
    req.user.set("linkedProfiles.codeforces", null);
    await req.user.save();
    res.json({ disconnected: true });
  } catch (error) {
    next(error);
  }
}
