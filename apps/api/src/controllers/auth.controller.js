import { randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { config, isProduction } from "../config/env.js";
import { User } from "../models/user.model.js";
import { isDatabaseReady } from "../middleware/require-auth.js";

const SESSION_COOKIE = "codetrack_session";
const STATE_COOKIE = "codetrack_oauth_state";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function googleClient() {
  if (!config.googleClientId || !config.googleClientSecret) return null;
  return new OAuth2Client(config.googleClientId, config.googleClientSecret, config.googleCallbackUrl);
}

function cookieOptions(maxAge, path = "/") {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge,
    path
  };
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    linkedProfiles: user.linkedProfiles || { codeforces: null, leetcode: null },
    problems: user.problems || []
  };
}

export function startGoogleLogin(_req, res) {
  const client = googleClient();
  if (!client) return res.status(503).json({ error: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env." });
  if (!isDatabaseReady()) return res.status(503).json({ error: "MongoDB is unavailable. Configure MONGODB_URI and start MongoDB first." });
  if (!config.jwtSecret || config.jwtSecret.length < 32) return res.status(503).json({ error: "Set a JWT_SECRET of at least 32 characters in .env." });

  const state = randomBytes(32).toString("base64url");
  res.cookie(STATE_COOKIE, state, cookieOptions(5 * 60 * 1000, "/api/auth"));
  const url = client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account"
  });
  return res.redirect(url);
}

export async function finishGoogleLogin(req, res) {
  const client = googleClient();
  const stateCookie = req.cookies?.[STATE_COOKIE];
  const stateQuery = typeof req.query.state === "string" ? req.query.state : "";
  res.clearCookie(STATE_COOKIE, cookieOptions(0, "/api/auth"));

  if (!client) return res.redirect(`${config.frontendOrigin}/?authError=google_not_configured`);
  if (!isDatabaseReady()) return res.redirect(`${config.frontendOrigin}/?authError=database_unavailable`);
  if (!stateCookie || !stateQuery) return res.redirect(`${config.frontendOrigin}/?authError=oauth_state_missing`);
  const expected = Buffer.from(stateCookie);
  const actual = Buffer.from(stateQuery);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return res.redirect(`${config.frontendOrigin}/?authError=oauth_state_invalid`);
  }

  try {
    if (req.query.error || typeof req.query.code !== "string") {
      return res.redirect(`${config.frontendOrigin}/?authError=google_cancelled`);
    }
    const { tokens } = await client.getToken(req.query.code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.googleClientId });
    const claims = ticket.getPayload();
    if (!claims?.sub || !claims.email || claims.email_verified !== true) {
      return res.redirect(`${config.frontendOrigin}/?authError=email_not_verified`);
    }

    const user = await User.findOneAndUpdate(
      { googleId: claims.sub },
      {
        $set: {
          email: claims.email.toLowerCase(),
          name: claims.name || claims.email.split("@")[0],
          avatarUrl: claims.picture || "",
          lastLoginAt: new Date()
        },
        $setOnInsert: { googleId: claims.sub }
      },
      { new: true, upsert: true, runValidators: true }
    );

    const session = jwt.sign({ sub: user._id.toString() }, config.jwtSecret, {
      expiresIn: "7d",
      issuer: "codetrack"
    });
    res.cookie(SESSION_COOKIE, session, cookieOptions(SESSION_MAX_AGE));
    return res.redirect(`${config.frontendOrigin}/?signedIn=1`);
  } catch (error) {
    console.error("Google OAuth callback failed:", error.message);
    return res.redirect(`${config.frontendOrigin}/?authError=google_login_failed`);
  }
}

export function getAuthStatus(_req, res) {
  res.json({
    googleConfigured: Boolean(config.googleClientId && config.googleClientSecret),
    databaseReady: isDatabaseReady(),
    jwtConfigured: Boolean(config.jwtSecret && config.jwtSecret.length >= 32)
  });
}

export function getCurrentUser(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function saveProblems(req, res, next) {
  try {
    if (!Array.isArray(req.body?.problems) || req.body.problems.length > 1000) {
      return res.status(400).json({ error: "problems must be an array with no more than 1,000 items." });
    }
    req.user.problems = req.body.problems;
    await req.user.save();
    return res.json({ saved: true, count: req.user.problems.length });
  } catch (error) {
    next(error);
  }
}

export function logout(_req, res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(0));
  res.json({ signedOut: true });
}
