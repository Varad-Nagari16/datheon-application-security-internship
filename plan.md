# Task 4 Plan — Public Endpoint Shielding, PII Masking & Automated DAST

## Scope

Build a separate, self-contained TypeScript/Express service and a small public lookup page backed by fictional certificate-verification fixtures. The UI submits a public reference to the existing lookup API and renders only the minimal masked result. A centralized masking utility transforms raw synthetic contact values at response construction time; raw email and phone values are never sent to the browser. No real PII, external database, authentication provider, deployment, or network exposure is used.

## API and masking

- `GET /api/public/lookup/:referenceId` returns certificate type/status/year plus masked email and phone.
- `GET /api/public/verify/:referenceId` returns a minimal validity result plus the same masked contact shape.
- Both routes call the same `toPublic*` payload builder so future endpoint edits cannot accidentally return raw contact values.
- Unknown references return a generic `404`; malformed references return a generic `400`; server errors never include stack traces.
- Mask emails by preserving only a minimal local-part hint and domain; mask phone numbers except the final four digits. Do not expose names, addresses, birth dates, or other unnecessary fields.

## Headers and CI

Configure Helmet on every response with a deny-by-default CSP that allows only same-origin static scripts/styles and API fetches while denying inline code and third-party resources, plus HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, restrictive Permissions and Cross-Origin Resource Policies, and `Cache-Control: no-store`. Disable `X-Powered-By`, use HTML only for the portal and JSON for APIs, and do not emit permissive CORS headers. The local listener binds only to `127.0.0.1`; document that HSTS is effective only when served over HTTPS.

Document every service and API route, including `/` and `/health`, and all runtime response headers in `openapi.yaml`. Run Spectral lint and tests on every push and pull request. The GitHub Actions workflow also runs a redacted Gitleaks repository scan and starts the local synthetic service for a ZAP API scan against the OpenAPI file. CI scans only the local synthetic fixture service, never a third-party endpoint. Upload the ZAP reports when generated; keep Gitleaks findings redacted.

## Structure

- `src/masking.ts`: pure email and phone masking functions.
- `src/fixtures.ts`: synthetic-only certificate fixtures and the single public DTO builder.
- `src/app.ts`, `src/server.ts`: headers, routes, generic errors, loopback-only startup.
- `public/index.html`, `public/styles.css`, `public/app.js`: reference lookup page, responsive styling, and safe same-origin fetch/render logic.
- `tests/`: masking, response privacy, headers, error, and route coverage.
- `openapi.yaml`, `.spectral.yaml`, `zap-rules.tsv`: API contract, style/privacy rules, and DAST failure thresholds.
- `.github/workflows/security.yml`: secret scanning, Spectral, tests/typecheck, local service startup and ZAP API scan.
- `README.md`, `docs/security-notes.md`: beginner run/evidence guide and cited security rationale.

The project is independent of Tasks 1–3. Package it separately as a ZIP. No GitHub repository will be created or pushed during this task.
