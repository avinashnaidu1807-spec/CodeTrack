# Architecture

CodeTrack is an npm-workspace monorepo with a React/Vite frontend, Express API, and MongoDB user store.

## Sign-in and authorization flow

1. The login page sends the browser to `GET /api/auth/google`.
2. The API creates a random OAuth `state` value in a short-lived HttpOnly cookie and redirects to Google.
3. Google redirects to `/api/auth/google/callback`. The API validates the state, verifies Google's ID token and verified email, and finds or creates a MongoDB user by Google's stable subject ID.
4. The API issues a signed, seven-day JWT in an HttpOnly, SameSite=Lax cookie.
5. The frontend requests `/api/auth/me`; if there is no valid session, the protected dashboard is not rendered.
6. Protected API routes run `requireAuth`, validate the JWT, load the user from MongoDB, and use that user record as the authorization scope. The client never supplies the owner ID for data writes.

## User data

The MongoDB user record stores the verified Google identity, custom problem library, and connected Codeforces/LeetCode snapshots. The browser cache uses account-specific keys. Custom problem changes are saved to the authenticated user's own record. Platform connect and disconnect endpoints are also authenticated and save data to that user's record.

## Platform connection flow

1. A signed-in user enters a Codeforces handle or LeetCode username.
2. The protected endpoint validates the input and calls the platform service.
3. The service normalizes public profile and submission data.
4. The controller persists the returned snapshot to the authenticated user's MongoDB record and returns it to the frontend.

Codeforces and LeetCode are public-profile integrations, not authentication providers in this implementation. A public username lookup does not verify that the signed-in person owns that account.

## Streak rule

A day is active if at least one accepted submission is present from any connected platform. Current streak uses today if active, otherwise yesterday as the grace day while today is unfinished. Longest streak is computed over the imported date set. Platform history limits can undercount the lifetime streak.

## Security notes and limitations

- Google OAuth state is checked to mitigate login CSRF; the JWT is HttpOnly and SameSite=Lax.
- All account and platform APIs except login/status/health routes require a valid session.
- Use HTTPS and `NODE_ENV=production` in deployment to enable Secure cookies.
- Keep OAuth secrets and JWT signing secrets out of source control.
- LeetCode uses an unofficial public GraphQL endpoint that can change or rate-limit requests.
- Platform history may be incomplete, and public profile linking does not prove ownership.
