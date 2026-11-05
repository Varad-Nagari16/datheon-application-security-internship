# Security design notes and sources

The implementation applies OWASP's REST guidance to minimize public response data, use the correct JSON content type, avoid technical details in errors, and send `Cache-Control: no-store` for browser-consumable responses. OWASP notes that CSP `frame-ancestors` prevents framing, HSTS requires HTTPS, and X-Content-Type-Options should be `nosniff`. It recommends disabling CORS headers when cross-origin calls are not supported; this demo has no permissive CORS configuration. The page loads only same-origin CSS and JavaScript and permits only same-origin API requests; inline code and third-party resources stay blocked. Its endpoint returns only masked contact data and public verification status, not full identity fields.

Masking is not anonymization: the demo preserves the synthetic email domain and final four phone digits, which are stable correlators. For real services, determine whether even those fragments can identify an organization or person in combination with other available data; minimize or omit them if they are unnecessary.

ZAP's API scan imports an OpenAPI definition and actively scans the API paths it finds. Its command supports local files and configurable rule thresholds; the project's ZAP configuration promotes missing security headers and server-error alerts to CI failures. Gitleaks can scan a Git repository or directory and redact detected secret values in output. The workflow uses a pinned Gitleaks version and scans only this project.

Spectral supports OpenAPI rulesets and CLI linting. The project uses it to lint the API contract and examples before DAST runs.

## References

- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP ZAP API Scan](https://www.zaproxy.org/docs/docker/api-scan/)
- [OWASP ZAP Docker User Guide](https://www.zaproxy.org/docs/docker/about/)
- [ZAP HSTS Header Alert](https://www.zaproxy.org/docs/alerts/10035-1/)
- [ZAP CSP Header Alert](https://www.zaproxy.org/docs/alerts/10038-1/)
- [ZAP X-Content-Type-Options Alert](https://www.zaproxy.org/docs/alerts/10021/)
- [ZAP Anti-Clickjacking Alert](https://www.zaproxy.org/docs/alerts/10020-1/)
- [Spectral source and CLI documentation](https://github.com/stoplightio/spectral)
- [Gitleaks source and CLI documentation](https://github.com/gitleaks/gitleaks)
- [Gitleaks releases](https://github.com/gitleaks/gitleaks/releases)
