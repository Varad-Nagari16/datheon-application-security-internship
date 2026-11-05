# BOLA Guard Lab — Task 2

A local Node.js/TypeScript training site for Broken Object Level Authorization (BOLA/IDOR) remediation. It includes a realistic-looking student portal, five fictional in-memory records, a protected API, Vitest/Supertest coverage, and a before/after remediation diff.

> **Lab-only:** The browser opens in a simulated, already-authenticated Student A session. Its fixed token is a public training fixture mapped server-side to Student A; the other four public tokens are for API testing only. This is not real authentication. Do not use real student/customer data, expose the service publicly, or reuse the demo tokens in an actual application.

## Start the local portal

Prerequisites: Node.js 22 or a compatible current LTS, plus Corepack. Node 24 is also fine. From the project folder run:

```bash
node --version
corepack pnpm --version
corepack pnpm install
corepack pnpm test
corepack pnpm typecheck
corepack pnpm dev
```

The app binds only to `127.0.0.1:3000`. With `corepack pnpm dev` running, open **http://127.0.0.1:3000/**. The health endpoint is `http://127.0.0.1:3000/health`. Stop the server with **Ctrl+C**. If port 3000 is already occupied, run `PORT=3001 corepack pnpm dev` and open `http://127.0.0.1:3001/`.

## Demonstrate the BOLA fix in the browser

1. Open the portal. It opens directly in the Student A training session and loads Student A's application. The address bar becomes `http://127.0.0.1:3000/?appId=104`.
2. Keep the page and session as-is. In the browser's address bar, change only `104` to `105` and press **Enter**.
3. The same Student A session requests Student B's application. The site shows a normal **“We couldn't find that application”** page. Student B's record is not displayed.
4. The API returns the same generic `404` for a record owned by another student and for an unknown ID. Return to Student A's application using **Return to my account** or the **My application** link.

There is deliberately no account picker, sign-in form, application-ID input, account list, or raw response panel on the website. The browser stays as Student A throughout the URL-tampering exercise. Five fictional accounts and records are used by the API tests and cURL examples:

| Fictional account | Own URL parameter | API-only local fixture token |
|---|---|---|
| Student A | `appId=104` | `lab-session-user-a` |
| Student B | `appId=105` | `lab-session-user-b` |
| Student C | `appId=106` | `lab-session-user-c` |
| Student D | `appId=107` | `lab-session-user-d` |
| Student E | `appId=108` | `lab-session-user-e` |

All names, emails and application details are synthetic. The fixed bearer tokens are visible in the code and guide by design; they are not secrets and do not model a production sign-in system.

## Optional cURL checks

Run these in a second terminal while the server is running.

No session → `401`:

```bash
curl --noproxy '*' --max-time 5 -i http://127.0.0.1:3000/api/records/104
```

Student A's own record → `200`:

```bash
curl --noproxy '*' --max-time 5 -i -H 'Authorization: Bearer lab-session-user-a' http://127.0.0.1:3000/api/records/104
```

Student A requests Student B's record → generic `404`:

```bash
curl --noproxy '*' --max-time 5 -i -H 'Authorization: Bearer lab-session-user-a' http://127.0.0.1:3000/api/records/105
```

Student E's own record → `200`:

```bash
curl --noproxy '*' --max-time 5 -i -H 'Authorization: Bearer lab-session-user-e' http://127.0.0.1:3000/api/records/108
```

## How the fix works

The intentionally vulnerable before-example in `examples/vulnerable-before.ts` looks up an application using only a client-supplied ID. The remediated route requires a recognized session, derives the user identity from the server-side token map, and searches using **both** the application ID and authenticated owner ID. It returns the same generic `404` for unknown and non-owned records and omits internal `ownerId` from successful responses. `PATCH.diff` is a labeled before/after comparison for review; it is not a standalone patch to apply verbatim.

In a real application, replace the public training token fixtures with a properly authenticated session. In a database-backed production app, constrain both values in the query (for example, `WHERE application_id = ? AND owner_id = ?`) using the validated session principal. Do not fetch by ID first and rely on a client-side check.

## Suggested internship evidence

Capture Student A's dashboard at `?appId=104`, then the generic not-found page at `?appId=105` in the same browser session. Also capture `corepack pnpm test` and `corepack pnpm typecheck` passing. Clearly label all information as synthetic local training data; no production service was tested.
