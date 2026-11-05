# Suggested report note for the local mock

> This is a controlled demonstration using a purpose-built local mock dashboard with fictional records. The server intentionally accepts a client-supplied `userId` and returns the corresponding mock record without authentication or object-level authorization. Requests to `http://127.0.0.1:5050/api/dashboard?userId=104` and `...?userId=105` both returned HTTP 200 without cookies or authorization headers. This demonstrates the vulnerability pattern in the mock only; it is not a finding against Datheon, crAPI, or a production application.

Do not present a CVSS score as an assessed production finding for this mock. If the internship requests a scored report, ask whether a simulated lab result is acceptable and explain the mock's scope and impact explicitly.
