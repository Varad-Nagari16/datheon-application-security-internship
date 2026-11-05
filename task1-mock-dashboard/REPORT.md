# Responsible Vulnerability Disclosure Report

## Unauthenticated access to records by changing a dashboard URL parameter

**Report type:** Controlled training-lab simulation  
**Target:** Fieldnote local mock dashboard (purpose-built for this exercise)  
**Target URL:** `http://127.0.0.1:5050`  
**Test date:** 2026-10-30  
**Status:** Reproduced in the local mock  
**Real organization affected:** None identified or tested

> **Scope and disclosure notice:** This report records a deliberately vulnerable mock application created for training. Its records are fictional and its server binds only to loopback (`127.0.0.1`). The result is not a vulnerability discovery or disclosure against Datheon, OWASP crAPI, or any production service. The CVSS score below is an illustrative severity for the modeled vulnerability pattern *if it were deployed as a remotely reachable service*; it is not a score for the loopback-only mock.

## Executive summary

The mock dashboard fetches a record using a client-supplied `userId` query parameter. The API returns the selected record without authentication or an object-level authorization check. In a cURL test that sent no `Authorization` or `Cookie` headers, requests for two different synthetic user IDs returned HTTP 200 responses containing their respective mock profile data.

This demonstrates an unauthenticated object-level authorization failure in the training mock. It does not establish that any real application has this issue.

## Scope and authorization

Testing was limited to the self-created local mock at `127.0.0.1:5050`, using static synthetic data in `app.py`. No real users, accounts, student/customer records, or external hosts were accessed. The mock is intentionally vulnerable and must not be exposed beyond the local machine.

## Affected endpoint

```http
GET /api/dashboard?userId=<demo-id>
Host: 127.0.0.1:5050
```

The browser UI reads the `userId` query parameter and requests this API endpoint. The mock server looks up the supplied ID and returns the associated record without requiring login or checking ownership.

## Steps to reproduce

1. Start the local mock by following `README.md` in this project:

   ```bash
   python3 app.py
   ```

2. Open `http://127.0.0.1:5050` in a browser and inspect the page. For a browser-level test, open Developer Tools → **Network** and reload the page.
3. Identify the request to `/api/dashboard?userId=...` and inspect its response. The client uses `credentials: 'omit'`.
4. Repeat the API request using cURL without cookies, Authorization, or session headers. Example:

   ```bash
   curl -i 'http://127.0.0.1:5050/api/dashboard?userId=104'
   curl -i 'http://127.0.0.1:5050/api/dashboard?userId=105'
   ```

5. Observe that each request returns HTTP 200 and different synthetic profile JSON. The same behavior is available for IDs `106`, `107`, and `108`.

## cURL reproduction commands

These requests contain **no credentials**. Run them only while the local mock is running:

```bash
for id in 104 105 106 107 108; do
  printf '\n--- demo userId=%s ---\n' "$id"
  curl -i "http://127.0.0.1:5050/api/dashboard?userId=${id}"
done
```

No `Cookie`, `Authorization`, or session header is sent by these commands. An unknown identifier returns 404:

```bash
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=999'
```

### Recorded result

Two requests were run against the mock without credentials:

| Request | Observed status | Result |
|---|---:|---|
| `GET /api/dashboard?userId=104` | `200 OK` | Returned synthetic record for Alex Example (`alex@example.test`) |
| `GET /api/dashboard?userId=105` | `200 OK` | Returned a different synthetic training record |

The report intentionally omits full response bodies because the evidence is synthetic and the endpoint behavior is adequately demonstrated by the status and field-level summary. Re-run the included loop to capture all five current responses if needed.

## Impact

If the same design were deployed with real records and reachable by untrusted clients, a caller could change the object identifier and retrieve another user's record without authenticating. Depending on the actual data stored, this could expose names, email addresses, notes, or other personal information at scale through repeated identifier requests.

**Impact in this mock:** exposure of five fictional static records only. There is no production data, persistent account, or external service involved.

## Root cause

The server trusts an object identifier supplied by the client and directly returns the matching record. It has no authenticated principal and performs no server-side authorization check that binds the requested object to the caller. Hiding the identifier in the user interface would not fix the issue: clients can inspect or modify URLs and API requests.

## Remediation recommendations

1. Require authentication for private dashboard endpoints.
2. Derive the record owner from the validated server-side identity, not from a user-controlled query parameter.
3. Enforce object-level authorization on every read and write. Query only for records the authenticated principal is allowed to access.
4. Return an appropriate `401` for missing/invalid authentication and `403` or privacy-preserving `404` for unauthorized object access; do not return the protected record.
5. Add automated tests proving that an unauthenticated request is denied and that User A cannot retrieve User B's object by changing the ID.
6. Minimize sensitive fields returned by APIs and log authorization failures without storing tokens or unnecessary personal data.

## CVSS 3.1 severity (illustrative only)

**Illustrative score: 5.3 / 10.0 — Medium**  
**Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`

| Metric | Value | Rationale for the modeled remotely reachable flaw |
|---|---|---|
| Attack Vector (AV) | Network | The hypothetical vulnerable API is reachable over HTTP(S). |
| Attack Complexity (AC) | Low | The caller changes a known/requested object identifier. |
| Privileges Required (PR) | None | The modeled request requires no account. |
| User Interaction (UI) | None | The caller can make the API request directly. |
| Scope (S) | Unchanged | Impact is limited to the vulnerable application’s data. |
| Confidentiality (C) | Low | The mock's illustrative data is limited to basic profile fields; actual severity depends on real data sensitivity and scale. |
| Integrity (I) | None | The demonstrated endpoint only reads data. |
| Availability (A) | None | No availability impact was demonstrated. |

The score is not applicable to the actual local-only server as an external network attack surface: it listens on `127.0.0.1` and holds synthetic records. If a real system were assessed, recalculate CVSS using verified deployment reachability, data sensitivity, required conditions, and demonstrated impact. Do not use this illustrative score as a production severity claim.

## Evidence checklist for the training submission

- [ ] Screenshot of the mock dashboard in the browser, with the local URL visible.
- [ ] DevTools Network screenshot showing the `/api/dashboard` request and HTTP 200 response; ensure the mock data is clearly fictional.
- [ ] Terminal screenshot of the cURL requests with HTTP 200 and no credential headers; avoid showing unrelated local information.
- [ ] Include this report and the mock app's README/source so reviewers can reproduce the simulation.

## Limitations and conclusion

The exercise reproduces the assignment's requested behavior—an API returning a selected user's record without credentials—inside a self-created local mock. It does not confirm that a third-party application has this issue. Present it as a **controlled mock-lab demonstration** and confirm with the internship supervisor that a simulation is acceptable in place of an authorized target assessment.
