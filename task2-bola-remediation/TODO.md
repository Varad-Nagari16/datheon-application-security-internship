# Task 2 TODO — Remediating BOLA/IDOR

This is a local training project using fictional in-memory data only. No production deployment, GitHub connection, database, or real personal data is in scope.

## Outcome: Implement the protected record endpoint and authentication guard

- [x] Implement a small TypeScript Express API with `GET /api/records/:recordId` and fictional in-memory users, session fixtures, and records.
- [x] Validate session context and return HTTP `401` when authentication is missing, malformed, or invalid.
- [x] Verify that the authenticated user owns the requested record before returning any record data.
- [x] Permit each user to retrieve their own fictional record.
- [x] Ensure Student A requesting another student's record fails with HTTP `404`, without exposing the record or internal database-style details.

## Outcome: Preserve a vulnerable example and show the remediation diff

- [x] Include an isolated intentionally vulnerable before-example demonstrating the original BOLA/IDOR flaw without using it as the remediated route implementation.
- [x] Include a Git-style diff or patch showing the authorization remediation from the vulnerable example to the secure implementation in `PATCH.diff`.

## Outcome: Prove the authorization behavior with automated integration tests

- [x] Use Vitest and Supertest integration tests covering missing and invalid sessions, cross-user access denial and non-disclosure, and successful owner access for all five demo users.

## Outcome: Provide a beginner-friendly local handoff

- [x] Include local install, run, and test commands, an explanation of the vulnerability and fix, and explicit lab-only/non-production limitations in `README.md`.
- [x] Keep the project fully local and self-contained, with no real database, personal data, deployment workflow, or GitHub integration.

## Outcome: Present a single-account student portal for browser-based testing

- [x] Open directly into a simulated, pre-authenticated Student A training session whose fixed token is mapped server-side; do not add a login form, account selector, or visible token. Explain in the guide that this is a public local test fixture, not real authentication.
- [x] Show only Student A's normal portal/dashboard. Do not show an object-ID lookup form, lists of all users, or raw technical response details.
- [x] Load the requested application from the URL query parameter `?appId=<numeric-id>`; changing only that ID in the browser address bar makes the current session request that record.
- [x] Seed five fictional users/records. A user can load their own application; requesting another user's ID shows an ordinary generic not-found page without disclosing the other record.
- [x] Document the fixed local session fixtures, numeric IDs, exact browser-address-bar test steps, and local-only limitations in `README.md`.
- [x] Keep the service bound to loopback and use no real student/customer data.

## Current State
The requested URL-driven portal is implemented. The same Student A browser fixture loads `appId=104` and receives a generic not-found page for `appId=105`; all 15 integration tests and the TypeScript check pass.

## Verification Notes
- `corepack pnpm test`: 15 tests passed.
- `corepack pnpm typecheck`: passed.
- `node --check public/app.js`: passed.
- Local API check: Student A → record 104 returned `200`; Student A → record 105 returned generic `404`.
