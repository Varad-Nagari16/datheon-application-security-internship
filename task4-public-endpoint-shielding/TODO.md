# Task 4 TODO — Public Endpoint Shielding, PII Masking & Automated DAST

All demo data must be fictional and the API must be loopback-only.

## Outcome: Mask private data in public lookup and verification responses

- [x] Analyze the risks of exposing personally identifiable information through public lookup services.
- [x] Implement dynamic string masking on email addresses and phone numbers.
- [x] Apply the same masking to every public verification and lookup endpoint.
- [x] Ensure public response payloads do not include raw email addresses, phone numbers, full names, or unrelated private fields.
- [x] Return generic errors for unknown/malformed references and never expose exception traces.

## Outcome: Provide a small public verification UI

- [x] Serve an accessible, responsive reference-number form at the root page without replacing either API endpoint.
- [x] Let a visitor enter a synthetic reference and show only the verification status and masked contact details returned by the API.
- [x] Show a generic not-found message for unknown references; do not include a list of all records or raw contact values in the page.
- [x] Render returned values using safe text APIs, avoid browser storage and inline scripts/styles, and allow only same-origin static assets/API calls through CSP.
- [x] Test the root page, stylesheet, browser script, and their security headers.

## Outcome: Add strict HTTP security headers

- [x] Configure `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, and `X-Frame-Options` on all responses, including errors.
- [x] Add safe JSON content types and `Cache-Control: no-store`; disable unnecessary server-identifying headers.
- [x] Keep CORS disabled unless an explicit trusted cross-origin client is part of the assignment.

## Outcome: Automate API linting, secret scanning, and DAST

- [x] Add an OpenAPI contract and Spectral lint rules to validate the public masked response shape.
- [x] Add a GitHub Actions workflow that runs on pushes and pull requests.
- [x] Include a redacted repository secret scan and OWASP ZAP API scanning of the local synthetic service for exposed response data and missing/broken headers.
- [x] Make header/privacy failures fail the automated pipeline and save available scan reports as artifacts.

## Outcome: Provide a beginner-friendly, independent deliverable

- [x] Provide a separate Task 4-only local project and ZIP, with Corepack/pnpm setup, run, test, curl/header inspection, CI, and evidence-capture instructions.
- [x] Use only fictional fixtures; keep the server bound to loopback and state that this training app is not a production service.
- [x] Explain the privacy risk of raw email/phone exposure and why masking plus data minimization reduces that exposure.

## Task 4 State

Local verification: 18 tests pass; TypeScript checks pass; browser JavaScript syntax and Spectral checks pass; Gitleaks v8.30.1 reports no leaks; and browser testing confirmed the form shows masked results for `CERT-1042` and a generic not-found message for `CERT-9999`. Live HTTP checks verified the root HTML, static assets, masked API, generic `404`, and required headers. Docker is unavailable in this sandbox, so ZAP was not executed locally. The GitHub Actions workflow is configured but still needs one run after this project is pushed to GitHub.

- [ ] Push this standalone project to the internship repository, confirm the GitHub Actions run succeeds, and capture its ZAP report artifact as internship evidence.
