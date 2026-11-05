# Task 4 — Public Endpoint Shielding, PII Masking & Automated DAST

This is a standalone, local-only TypeScript/Express training app for fictional certificate records. It has a small public lookup page backed by the same data-minimizing API, dynamic email/phone masking, response security headers, automated tests, OpenAPI linting, Gitleaks secret scanning, and OWASP ZAP API scanning. It is separate from the Task 2 BOLA and Task 3 session-security labs. No real candidate, student, or customer data is used.

## What the implementation does

`GET /api/public/lookup/:referenceId` returns a credential type, status, year, and masked contact values. `GET /api/public/verify/:referenceId` returns a validity result and the same masked contact shape. Both routes use the same response-builder that applies `maskEmail` and `maskPhone`; they never send the raw synthetic values. The response excludes names and other unrelated private fields. Unknown references return the same generic `404`, and malformed references receive a generic `400`.

The service applies security headers to success and error responses: a restrictive Content Security Policy, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive Permissions Policy, same-origin resource policy, and `Cache-Control: no-store`. The CSP permits only the page's own CSS, JavaScript, and API requests; it blocks inline scripts/styles and third-party resources. The UI renders server values with `textContent`, not HTML injection APIs. The service disables `X-Powered-By`, returns HTML only for the root page and JSON for APIs, and does not enable CORS. HSTS is meaningful only on an HTTPS origin; this local loopback demo is plain HTTP and is not a production TLS deployment.

## Requirements

Use Node.js 22 or later, Corepack, pnpm, and (for the local ZAP/Gitleaks container commands) Docker. The service itself does not require Docker, a database, credentials, or a third-party API.

## Install and run on Kali Linux

1. Download and extract `task4-public-endpoint-shielding.zip` to your `Documents` folder.
2. Open a terminal and enter the extracted directory. For example:

   ```bash
   cd ~/Documents/task4-public-api
   ```

3. Check Node and Corepack, then install the lockfile-pinned packages:

   ```bash
   node --version
   corepack --version
   corepack pnpm install --frozen-lockfile
   ```

   If `pnpm` is not a direct command, keep using `corepack pnpm`; do not use `sudo pnpm` or change `/usr/bin` permissions.

4. Start the local service:

   ```bash
   corepack pnpm dev
   ```

   Keep this terminal open. The listener is bound to `127.0.0.1:3001` only. To stop it, press **Ctrl+C** in that terminal.

5. Open `http://127.0.0.1:3001/` in your browser. You should see the Northstar Verify public lookup page.

## Try the browser UI

1. In **Credential reference**, enter the synthetic sample `CERT-1042`.
2. Select **Check credential**.
3. Confirm the result shows a credential status and masked contact values such as `a***n@example.test` and `*******0142`. The UI does not have a list of all records or show raw contact values.
4. Try `CERT-9999`. The page should show a generic “No public credential matched” message instead of record details.

The form sends a same-origin request to `/api/public/lookup/<reference>`. The API endpoints remain available for direct `curl` testing below.

## Test the public responses

Open a second terminal in the same project folder. Request one lookup:

```bash
curl --noproxy '*' -i http://127.0.0.1:3001/api/public/lookup/CERT-1042
```

The JSON should contain a masked email similar to `a***n@example.test` and a phone similar to `*******0142`. The response must not contain `alexandra.morgan@example.test` or `+1 (202) 555-0142`.

Test the verification route and a nonexistent reference:

```bash
curl --noproxy '*' -i http://127.0.0.1:3001/api/public/verify/CERT-1042
curl --noproxy '*' -i http://127.0.0.1:3001/api/public/lookup/CERT-9999
```

The first returns a minimal validity result with masked contact details. The second returns HTTP `404` with `{"error":"Not found"}`; it does not reveal a database or exception detail.

Inspect response headers:

```bash
curl --noproxy '*' -sSI http://127.0.0.1:3001/api/public/lookup/CERT-1042
```

Look for `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store`, and `Referrer-Policy: no-referrer`. There should be no `X-Powered-By` or `Access-Control-Allow-Origin` header.

## Run the local automated checks

Stop the development server with Ctrl+C before running these commands, or leave it open in the first terminal:

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm lint:openapi
```

The Vitest/Supertest suite checks masking for several records, verifies both public routes never return raw contact values, checks the HTML page and same-origin static assets, tests generic errors, and checks headers on successful and error responses. Spectral checks the OpenAPI contract, masked examples, and documented headers.

## Run ZAP API DAST locally (optional)

The ZAP scan uses the OpenAPI definition and sends requests only to this synthetic service. Do not change `openapi.yaml` to point at a public or third-party system.

1. Start the service in Terminal 1 (if it is not already running):

   ```bash
   TASK4_HOST=127.0.0.1 TASK4_PORT=3001 corepack pnpm start
   ```

2. In Terminal 2, from the project directory, create a writable report folder and run the official ZAP stable container:

   ```bash
   mkdir -p artifacts
   chmod 777 artifacts
   docker run --rm --network host \
     -v "$PWD:/zap/wrk/:rw" \
     -t ghcr.io/zaproxy/zaproxy:stable \
     zap-api-scan.py \
       -t /zap/wrk/openapi.yaml \
       -f openapi \
       -c /zap/wrk/zap-rules.tsv \
       -I \
       -r /zap/wrk/artifacts/zap-report.html \
       -J /zap/wrk/artifacts/zap-report.json
   ```

`zap-rules.tsv` makes missing cache, content-type, clickjacking, nosniff, HSTS, CSP headers and server-error disclosure fail the scan. `-I` prevents unrelated warning-level alerts from failing this training pipeline; explicitly configured `FAIL` findings still fail it. Reports are written under `artifacts/` and are intentionally excluded from Git by default.

DAST cannot reliably infer that a particular synthetic string is sensitive PII. The integration tests explicitly assert that full fixture email addresses and phone numbers never appear in either public response; ZAP scans every documented route for runtime HTTP issues and configured header failures.

For a local repository-secret scan, run:

```bash
docker run --rm -v "$PWD:/repo" -w /repo \
  ghcr.io/gitleaks/gitleaks:v8.30.1 \
  dir --redact --no-banner /repo
```

Gitleaks redacts detected secret values in its output. A finding should be investigated and removed, not ignored just to make the scan green.

## GitHub Actions workflow

In the combined internship repository, the workflow is at `../.github/workflows/task4-security.yml` so GitHub Actions can discover it at the repository root. It runs for every push, pull request, or manual dispatch. It scans Git history with Gitleaks, installs the pinned pnpm dependencies, runs Spectral, tests, and TypeScript checking inside this Task 4 folder, starts the API on loopback, runs ZAP against this folder's OpenAPI contract, and uploads the ZAP reports when available. It needs no application secrets and does not scan or attack any external host.

## What to capture as internship evidence

Capture: (1) the `corepack pnpm test` output showing all tests passing; (2) one successful lookup response showing only masked values; (3) the `404` response for an unknown ID; (4) the `curl -I` header output; (5) the ZAP report showing the local API scan and no configured header failures; and (6) a green GitHub Actions run after you add the project to your repository. Keep evidence synthetic. Do not include real people's contact data, credentials, or unrelated browser cookies.

## Security analysis and production limitations

Raw email addresses and phone numbers in public lookup responses enable unwanted contact, profiling, correlation with other datasets, and targeted social engineering. Masking reduces direct exposure but is not anonymization: the visible domain and final phone digits may still enable inference, especially when combined with other public fields. Return only information necessary for the verification use case, obtain a privacy/legal review for real services, and consider rate limiting, abuse monitoring, ownership/consent, and retention controls before production use. The fixture values and `.test` domains are fictional.

Masking is a response-layer safeguard, not a substitute for authorization or careful data design. This demo has no real identity-verification process, production database, audit trail, rate limiter, TLS termination, or persistent store. It intentionally binds to loopback and is not production-ready.

## References

- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP ZAP API Scan documentation](https://www.zaproxy.org/docs/docker/api-scan/)
- [OWASP ZAP Docker User Guide](https://www.zaproxy.org/docs/docker/about/)
- [Spectral OpenAPI linter](https://github.com/stoplightio/spectral)
- [Gitleaks scanner](https://github.com/gitleaks/gitleaks)
