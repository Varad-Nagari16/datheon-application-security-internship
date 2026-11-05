# Datheon Application Security Internship — Tasks 1–4

This repository contains the complete local training submission for the Datheon application-security internship. Each task is independent, self-contained, and aligned in its own folder. All records, identities, contact details, tokens, and credentials are fictional training fixtures.

## Submission layout

- `task1-mock-dashboard/` — Black-box reconnaissance and IDOR discovery, responsible-disclosure report, and mentor PDF.
- `task2-bola-remediation/` — Protected record endpoint, ownership authorization, integration tests, remediation patch, and mentor PDF.
- `task3-session-security/` — HttpOnly cookie/JWT sessions, rotation, expiry, logout, rate limiting, tests, and mentor PDF.
- `task4-public-endpoint-shielding/` — PII masking, security headers, OpenAPI contract, tests, and mentor PDF.
- `.github/workflows/task4-security.yml` — Task 4 secret scanning, tests, Spectral validation, and OWASP ZAP DAST workflow.

## Mentor PDFs

Each task folder contains its own reviewer-facing PDF named `TASK-<number>-Mentor-Review-Packet.pdf`. The PDFs include the workflow, verified outputs, browser evidence, implementation summary, limitations, and review conclusion.

## Verification summary

- Task 2: 15 integration tests and TypeScript check passed.
- Task 3: 28 security integration tests and TypeScript check passed.
- Task 4: 18 integration tests, TypeScript check, and Spectral OpenAPI lint passed.
- Task 4 GitHub Actions: secret scan, tests, TypeScript, Spectral, loopback API startup, OWASP ZAP, and ZAP artifact upload passed.

## Safety and scope

These projects are loopback-only training applications. Keep services bound to `127.0.0.1`, do not use real personal information, do not reuse lab credentials or tokens, and do not test any external system without explicit authorization.
