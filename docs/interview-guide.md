# CodeTrack Interview Guide

## Short pitch

"I built CodeTrack as a competitive-programming tracker. The React dashboard connects a public Codeforces handle to an Express API. The backend fetches profile and submission data from the official API, normalizes the response, and groups attempts by problem. A problem is marked solved if any observed submission is accepted. I separated the API route, controller, service, and data-normalization utilities to make the codebase easier to test and maintain."

## Explain the structure

- `routes/`: maps HTTP endpoints.
- `controllers/`: handles request validation and response orchestration.
- `services/`: calls the external Codeforces API and applies integration logic.
- `utils/`: reusable validation, normalization, aggregation, and error classes.
- `middleware/`: centralizes not-found and error responses.
- `apps/web`: React user interface.
- `packages/shared`: constants intended to be reused across apps.

## Important concepts

**Why a backend?** It centralizes API integration, error handling, rate limiting, and future persistence. It also avoids browser cross-origin issues.

**Why normalize external data?** Platform API responses are shaped for their own service. Normalizing creates a stable internal shape for UI and aggregation logic.

**Why aggregate by problem?** One problem can have many submissions. We should count a problem once and consider it solved if any observed attempt was accepted.

**Why not store all data in React state only?** State disappears on refresh. The current MVP stores the latest snapshot in browser `localStorage`; a future version should persist records in MongoDB.

**What is not done yet?** MongoDB, authentication, verified ownership, incremental sync, automated tests, CI, and LeetCode integration.

## Test scenarios

- Valid public handle
- Unknown handle
- Empty or invalid handle format
- Codeforces API timeout/outage
- User with zero submissions
- Multiple failed attempts followed by accepted
- More than 1,000 submissions
- Manual sync and browser refresh


## Cross-platform streak design

**Problem:** Users solve problems on different judges, so a streak must combine activity instead of maintaining a separate streak per platform.

**Approach:** Each platform adapter returns accepted submissions with Unix timestamps. A pure utility converts timestamps to local date keys, unions activity by day, and calculates current and longest consecutive runs. A day with one or more accepted submissions counts as active; failed submissions do not.

**Trade-offs:** Codeforces submission history is capped to the imported window and LeetCode's public GraphQL endpoint is unofficial. Therefore the UI warns that historical streaks may be incomplete. The snapshot is currently stored in `localStorage`; a multi-device production version should persist normalized activity server-side and deduplicate by platform plus submission ID.
