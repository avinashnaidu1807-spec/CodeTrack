function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: positiveInteger(process.env.PORT, 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  codeforcesMaxSubmissions: Math.min(
    positiveInteger(process.env.CODEFORCES_MAX_SUBMISSIONS, 1000),
    1000
  ),
  mongoUri: process.env.MONGODB_URI || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback",
  codeforcesOidcClientId:process.env.CODEFORCES_OIDC_CLIENT_ID || "",
  codeforcesOidcClientSecret:process.env.CODEFORCES_OIDC_CLIENT_SECRET || "",

  codeforcesOidcCallbackUrl:process.env.CODEFORCES_OIDC_CALLBACK_URL || "http://localhost:4000/api/codeforces/oauth/callback",

  jwtSecret: process.env.JWT_SECRET || "",
  nodeEnv: process.env.NODE_ENV || "development"
};

export const isProduction = config.nodeEnv === "production";
