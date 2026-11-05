# BOLA Guard Lab — Implementation Plan

## Product scope

Build a local, self-contained training site for the Application Security & API Pentesting Internship's BOLA remediation task. The fictional portal opens directly into a single simulated, pre-authenticated Student A training session and shows only Student A's dashboard or a generic not-found screen. The application ID is read from the browser URL as `?appId=<numeric-id>`; the user tests BOLA by changing that ID in the address bar, not by signing into a different user or using an on-page lookup control. Five fictional accounts/records remain available in the API fixtures and CLI tests, not in the website UI.

The training API is an Express/TypeScript service on loopback. `GET /api/records/:recordId` resolves the caller only from a known server-side bearer-token mapping and matches both the record ID and owner ID. The browser uses the public local fixture token for Student A; other fixed fixtures exist only for API tests and cURL examples. Missing/invalid sessions receive `401`; non-owned and unknown records share a generic `404`. Successful responses omit the internal owner field. These fixtures are not a production authentication system.

## Implementation and structure

Use the existing Node.js + TypeScript + Express project and its current package manager lockfile. Use Vitest and Supertest for API integration tests. Avoid an external database: all five records and fixed training-session fixtures remain in memory and use synthetic `.test` email addresses. Keep the HTTP server bound to `127.0.0.1`; retain the health endpoint and page-route manifest. Browser requests use same-origin relative paths.

- `src/server.ts` starts the loopback-only development server.
- `src/app.ts` creates the Express application, mounts the health and protected-record routes, and serves static public files.
- `src/middleware/requireSession.ts` resolves fixed bearer fixtures to server-side user identities; the website uses Student A's fixture and additional tokens are reserved for API tests/cURL.
- `src/types/express.d.ts` adds the typed, server-validated user principal to Express requests.
- `src/records.ts` stores five synthetic records.
- `src/routes/records.ts` applies authentication and object-ownership authorization before returning a record.
- `examples/vulnerable-before.ts` preserves an isolated vulnerable lookup for comparison; it is not mounted by the app.
- `public/index.html`, `public/styles.css` and `public/app.js` implement the single-account dashboard, URL-addressed record request and ordinary generic not-found page; the portal has no login form, account list, record-ID form or technical response panel.
- `tests/records.test.ts` verifies the portal shell, missing/invalid sessions, ownership, generic denials and five-user access.
- `README.md`, `PATCH.diff` and `TODO.md` explain setup, the remediation and test evidence.

## Visual direction

Three distinct directions considered: **Quiet Civic Service** (0.04), a calm, privacy-forward student-services portal; **Bright Campus Editorial** (0.07), a more expressive editorial admissions experience; **Red-Team Terminal** (0.03), a technical security workbench. Choose **Quiet Civic Service** because the trainee asked for the experience to feel like a real website rather than an API testing console, and because the key learning moment is a clear, non-alarming access denial.

- **Design Movement:** Contemporary civic-service design with restrained editorial typography, familiar account navigation and clear service-state messaging.
- **Core Principles:** One signed-in identity at a time; recognizable student-portal conventions; privacy and authorization feedback stated plainly; lab status and synthetic data disclosed without dominating the interface.
- **Color Philosophy:** Warm cool-white surfaces and navy text establish readability and calm. A trustworthy blue marks navigation and primary actions; sage green indicates successful authorized access; muted rose marks denial without using an alarm-heavy security-console aesthetic.
- **Layout Paradigm:** A familiar student portal opens to one profile and application summary under an ordinary account header. The URL selects the application; there is no visible login/test console, lookup form, or all-user data list.
- **Signature Elements:** A small monogram brand tile; understated status pills for application state; a discreet footer note identifying the fictional local-training environment.
- **Interaction Philosophy:** The demo opens with a single Student A session fixture, then the user edits only the numeric `appId` in the browser address bar. The server, not the URL or client, decides if that record belongs to the session. A foreign record gets the same plain not-found screen as an unknown ID.
- **Animation:** Use only brief, subtle action feedback; avoid animated data surfaces. Honor reduced-motion preferences.
- **Typography System:** Georgia-style editorial headings paired with system sans-serif body text; monospace only for the application ID.
- **Brand Essence:** A local authorization-training portal that looks like a student service while making server-side ownership controls understandable. Personality: calm, credible, clear.
- **Brand Voice:** Headlines are warm and direct; buttons describe actions. Example: “Your progress, in one place.” and “We couldn't find that application.”
- **Wordmark & Logo:** A lowercase “northstar” wordmark accompanied by a compact, serif “N” monogram in a rounded blue tile.
- **Signature Brand Color:** Northstar blue, `#315fca`.

## Material constraints

Use only fictional data, no external account systems, no database, no network exposure, no deployment, and no GitHub integration. Keep local commands beginner-friendly and use Corepack with the checked-in pnpm version. The README must list the fixed local fixture tokens and numeric app IDs for the address-bar exercise, and explain that the browser's pre-authenticated identity is a lab simulation, not production authentication.
