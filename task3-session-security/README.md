# Task 3 — Cryptographic Session Security Lab

This is the separate Task 3 deliverable. It is a complete, runnable local training project. It includes the small Task 2 SQLite/BOLA foundation because Task 3 secures the same authenticated record API; submit the Task 2-only archive separately for Task 2. This guide and the checklist in this archive are Task 3-specific.

> **Training only:** all accounts and records are synthetic. The shared password is public by design, and the signing key is only for this loopback lab. Never enter real personal information, expose the server to a network, or reuse these credentials in a real service.

## Install and run on Kali

Requirements: Node.js 22 or newer, Corepack, OpenSSL, and internet access for the initial dependency installation.

1. Extract this ZIP, open a terminal inside the extracted `task3-session-security` folder, and run:

```bash
node --version
corepack pnpm --version
corepack pnpm install
cp .env.example .env
sed -i "s/^BOLAGUARD_JWT_SECRET=.*/BOLAGUARD_JWT_SECRET=$(openssl rand -hex 32)/" .env
```

2. Run the automated security suite and type check:

```bash
corepack pnpm test
corepack pnpm typecheck
```

3. Start the app and open the local portal:

```bash
corepack pnpm dev
```

Open **http://127.0.0.1:3000/**. The app creates and seeds a local SQLite database on first startup. Stop it with **Ctrl+C**. Keep `BOLAGUARD_HOST=127.0.0.1` and `BOLAGUARD_COOKIE_SAME_SITE=lax` for Kali. `Secure` remains enabled. Do not bind to `0.0.0.0` or expose this training app to a network.

## Demo accounts

All five synthetic accounts use the lab-only password `northstar-demo-2026`:

| Account | Email | Application ID |
|---|---|---:|
| Student A | `student.a@example.test` | 104 |
| Student B | `student.b@example.test` | 105 |
| Student C | `student.c@example.test` | 106 |
| Student D | `student.d@example.test` | 107 |
| Student E | `student.e@example.test` | 108 |

## What Task 3 implements

The login endpoint verifies a salted password hash and issues a signed HS256 JWT in the `northstar_session` cookie. The response JSON does not include the token. Cookie attributes are `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and a short expiry. The browser restores account details through the cookie-authenticated session endpoint and does not store tokens or profile data in `localStorage` or `sessionStorage`.

Access tokens last 15 minutes and rotate before expiry. Rotation replaces the JTI, so a replayed old cookie is rejected. The in-memory session family has an eight-hour absolute lifetime; rotation cannot extend it. Sign-out revokes the family and clears the cookie with matching attributes.

A bounded in-memory sliding-window limiter allows 5 login attempts per minute per direct IP and 10 protected record requests per minute per IP/session. Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`; blocked requests return `429` with `Retry-After`. Counters and session state reset if the single local process restarts.

## Browser verification

1. Sign in as Student A with `student.a@example.test` and the shared demo password. The browser opens `/?appId=104`.
2. In Developer Tools, open **Application/Storage → Cookies** for `http://127.0.0.1:3000`. Check `HttpOnly`, `Secure`, and `SameSite=Lax`. Do not copy or show the cookie value in a report or screenshot.
3. Reload the dashboard. The page should restore the account using the cookie. In the browser console, `document.cookie` must not contain `northstar_session`.
4. Change only `appId=104` to `appId=105` in the address bar. The API must return the same generic `404` for another user's record as for an unknown ID; the portal displays “We couldn't find that application.” Restore `appId=104` and verify the owner still sees their record.
5. Use the portal's sign-out button. The cookie is cleared and protected requests require a new sign-in.

## Rotation and replay

The API routes are `POST /api/session` (login), `GET /api/session` (restore current account), `POST /api/session/rotate`, `DELETE /api/session` (logout), and `GET /api/records/:recordId` (protected record). Browser requests include cookies automatically. In the Network panel, confirm a rotation returns a new cookie but no JWT in its JSON body. Replaying the old cookie must yield `401 Unauthorized`; the replacement remains usable until expiry or logout.

## Rate-limit demonstration

The exact test suite covers both limiters. To see login throttling from a fresh 60-second window, run six requests; the first five should be `200`, then `429`. All requests, including successful sign-ins, count:

```bash
for attempt in 1 2 3 4 5 6; do
  curl --noproxy '*' --max-time 5 -sS -o /dev/null \
    -w "attempt $attempt: HTTP %{http_code}\n" \
    -H 'Content-Type: application/json' \
    -d '{"email":"student.a@example.test","password":"northstar-demo-2026"}' \
    http://127.0.0.1:3000/api/session
done
```

For the protected-record limiter, capture the session cookie without printing it, then issue 11 requests. The first ten should be `200` if the window is fresh; the next should be `429`:

```bash
COOKIE=$(curl --noproxy '*' --max-time 10 -sS -D - -o /dev/null \
  -H 'Content-Type: application/json' \
  -d '{"email":"student.a@example.test","password":"northstar-demo-2026"}' \
  http://127.0.0.1:3000/api/session \
  | awk 'BEGIN{IGNORECASE=1} /^Set-Cookie:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/;.*/, ""); print; exit}')
for attempt in $(seq 1 11); do
  curl --noproxy '*' --max-time 5 -sS -o /dev/null \
    -w "record request $attempt: HTTP %{http_code}\n" \
    -H "Cookie: $COOKIE" \
    http://127.0.0.1:3000/api/records/104
done
unset COOKIE
```

Wait up to a minute before signing in again if a prior test exhausted the login window. Do not print, paste, or share cookie values; cookies are credentials.

## XSS and Web Storage risk

`localStorage` and `sessionStorage` are readable by same-origin JavaScript. If an XSS flaw executes attacker-controlled JavaScript in the page, it can steal a stored bearer token and potentially reuse it elsewhere. `sessionStorage` is tab-scoped but is still JavaScript-readable. `HttpOnly` prevents page JavaScript from reading this cookie; it does **not** prevent injected same-origin code from issuing authenticated requests. Output encoding, safe DOM APIs, a suitable Content Security Policy, and deliberate CSRF protections remain important.

## Test evidence and limitations

`corepack pnpm test` runs 28 Vitest/Supertest integration checks using isolated in-memory SQLite databases, including cookie attributes, token storage, signature/expiry, rotation and replay, absolute lifetime, logout, BOLA ownership, rate-limit headers/429, and sliding-window expiry. `corepack pnpm typecheck` checks TypeScript.

The session registry and limiters are process-local and do not coordinate across server instances. They are intentionally suitable only for this single-process loopback exercise; a production multi-instance service needs a reviewed shared store and deployment-specific cookie/CSRF policy. `TASK3_CHANGES.patch` is the Task 3 delta from the Task 2-only baseline in the separate Task 2 archive.
