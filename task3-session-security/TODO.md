# Task 3 — Cryptographic Session Security

All accounts, records, passwords, and secrets are synthetic and local. The runnable Task 3 package contains the Task 2 BOLA foundation only as a prerequisite; Task 2 itself is delivered separately.

## Outcome: Replace browser-readable authentication storage with a secure cookie session

- [x] Analyze the risks of storing authentication and profile data in `localStorage` or `sessionStorage`, including XSS token theft.
- [x] Issue an HMAC-SHA256 JWT only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie; do not return it in JSON or store the token/profile in browser Web Storage.
- [x] Verify signature, allowed algorithm, issuer, audience, subject, session ID, JTI and expiry on protected requests; fail closed with a generic `401`.
- [x] Preserve the Task 2 database-owner check so another user's record is not returned.

## Outcome: Rotate and expire sessions safely

- [x] Use a 15-minute access-token lifetime and an eight-hour absolute session limit.
- [x] Rotate to a new JTI and reject replay of the prior token; rotation cannot exceed the absolute lifetime.
- [x] Revoke the active session and clear cookie on logout with matching attributes.
- [x] Keep registry state in memory for this documented single-process lab.

## Outcome: Throttle login and record-ID guessing

- [x] Use a bounded 60-second sliding window with 5 login attempts/IP and 10 protected reads/IP+session.
- [x] Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` with HTTP `429` on excess requests.
- [x] Apply login throttling before password verification and protect record reads; do not trust spoofable forwarded IP headers.
- [x] Document reset behavior and Redis as the production scale-out alternative.

## Outcome: Demonstrate and verify Task 3

- [x] Test cookie flags, token absence in JSON/Web Storage, valid/invalid/tampered/expired sessions, rotation/replay, absolute lifetime, logout, and rate-limit headers/429.
- [x] Retain five-user Task 2 owner-access and cross-account-denial tests.
- [x] Provide Task 3-specific setup, browser and cURL steps, XSS/Web Storage explanation, and loopback-only limitations.
