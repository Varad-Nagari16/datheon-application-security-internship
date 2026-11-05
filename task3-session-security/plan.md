# Task 3 Implementation Plan — Cryptographic Session Security

This archive is the separate Task 3 deliverable. It is independently runnable and contains the prior Task 2 SQLite/BOLA implementation only because Task 3 secures the same protected record API. The submit the Task 2-only archive separately `task2-bola-guard-lab.zip` archive.

## Implementation

Express receives credentials at `POST /api/session`, checks the salted hash in the local synthetic SQLite database, and creates a signed HS256 JWT with verified claims. The JWT exists only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Cookie middleware reads the cookie; protected requests verify signature, issuer, audience, subject, expiry, active session family, and current JTI. The API response never serializes the JWT.

An in-memory `SessionStore` performs one-time JTI rotation, revocation on logout, and an eight-hour absolute lifetime cap. A bounded in-memory sliding-window limiter applies five login attempts/IP/minute and ten protected reads/IP+session/minute. The database ownership query from Task 2 is preserved. Browser code uses same-origin cookie requests and never reads or writes browser Web Storage. The portal restores the current account from the cookie session endpoint.

## Structure

- `src/auth.ts`, `src/cookies.ts`, `src/sessionStore.ts`: password verification, JWT rules, cookie flags, token rotation/revocation.
- `src/middleware/requireSession.ts`, `src/routes/session.ts`: cookie-only authentication and session endpoints.
- `src/rateLimit.ts`: bounded sliding-window counters and response headers.
- `src/routes/records.ts`, `src/database.ts`: authenticated owner-filtered SQLite query and five fictional users.
- `public/`: sign-in and single-account portal; no JWT Web Storage.
- `tests/records.test.ts`: isolated integration coverage for session security, rate limiting and retained BOLA controls.

## Constraints

The shipped configuration binds to `127.0.0.1` and uses `SameSite=Lax`. HTTPS Preview uses a separate explicit environment override; this does not change the Kali template. Secrets and SQLite files remain local and ignored. The in-memory session and rate-limit stores are single-process lab components, not production infrastructure. All data is fictional.
