#!/usr/bin/env python3
"""Local-only educational mock: intentionally unauthenticated dashboard lookup.

Binds only to 127.0.0.1. Uses fictional records and Python's standard library.
Do not expose this training server to a network or use real personal data.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
import json

HOST = "127.0.0.1"
PORT = 5050

# Fictional training data. The intentionally vulnerable behavior is that the
# API trusts a user-supplied userId and does not authenticate/authorize callers.
RECORDS = {
    "104": {
        "userId": "104",
        "appId": "DT-DEMO-104",
        "name": "Alex Example",
        "email": "alex@example.test",
        "program": "Application Security Practice",
        "notes": "FAKE LAB RECORD — no real person or account.",
        "status": "Training record",
    },
    "105": {
        "userId": "105",
        "appId": "DT-DEMO-105",
        "name": "Jordan Sample",
        "email": "jordan@example.test",
        "program": "API Security Practice",
        "notes": "FAKE LAB RECORD — this record is also intentionally exposed.",
        "status": "Training record",
    },
    "106": {
        "userId": "106",
        "appId": "DT-DEMO-106",
        "name": "Casey Demo",
        "email": "casey@example.test",
        "program": "Secure Web Development",
        "notes": "FAKE LAB RECORD — fictional profile for local testing.",
        "status": "Training record",
    },
    "107": {
        "userId": "107",
        "appId": "DT-DEMO-107",
        "name": "Riley Practice",
        "email": "riley@example.test",
        "program": "Threat Modeling Basics",
        "notes": "FAKE LAB RECORD — fictional profile for local testing.",
        "status": "Training record",
    },
    "108": {
        "userId": "108",
        "appId": "DT-DEMO-108",
        "name": "Taylor Training",
        "email": "taylor@example.test",
        "program": "API Authorization Lab",
        "notes": "FAKE LAB RECORD — fictional profile for local testing.",
        "status": "Training record",
    },
}

PAGE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Local Access-Control Lab</title>
<style>
:root{color-scheme:light;--ink:#142437;--muted:#66788a;--line:#dce5ed;--blue:#1769aa;--pale:#eff7fc;--red:#a43d32;--redbg:#fff1ed;--green:#16765a;--shadow:0 18px 50px #17324a12}
*{box-sizing:border-box}body{margin:0;background:#f3f6f9;color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.top{background:#10263a;color:#fff;padding:17px clamp(18px,5vw,64px);display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{font-weight:750;letter-spacing:.02em}.local{font:12px ui-monospace,monospace;color:#c4d9e8}
main{max-width:940px;margin:38px auto;padding:0 22px}.banner{border:1px solid #e6b3a8;background:var(--redbg);color:#692b23;border-radius:12px;padding:14px 17px;margin-bottom:22px}.banner strong{display:block;margin-bottom:3px}.layout{display:grid;grid-template-columns:1fr;gap:22px}.card{background:#fff;border:1px solid var(--line);border-radius:15px;box-shadow:var(--shadow)}.content{padding:clamp(22px,4vw,38px)}.eyebrow{color:var(--blue);font-size:12px;font-weight:750;text-transform:uppercase;letter-spacing:.12em}.content h1{margin:5px 0 7px;font-size:clamp(26px,4vw,36px);letter-spacing:-.035em}.sub{color:var(--muted);margin:0 0 22px}.pill{display:inline-flex;padding:4px 10px;border-radius:999px;background:#edf7f2;color:var(--green);font-size:12px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:21px}.field{padding:14px;border:1px solid var(--line);border-radius:11px;min-width:0}.field.wide{grid-column:1/-1}.label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.09em}.value{font-weight:650;margin-top:4px;overflow-wrap:anywhere}.note{margin-top:22px;padding:14px 16px;background:#f4f8fb;border-radius:10px;color:#46596c;font-size:13px}.code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:#edf2f7;border-radius:4px;padding:2px 5px}.footer{margin-top:19px;color:var(--muted);font-size:12px}.error{padding:18px;border:1px solid #edc6bd;background:var(--redbg);border-radius:10px;color:#762d22}
@media(max-width:700px){.grid{grid-template-columns:1fr}.field.wide{grid-column:auto}.local{display:none}}
</style>
</head>
<body>
<header class="top"><div class="brand">Fieldnote <span style="color:#7fc5ed">/</span> Student Workspace</div><div class="local">LOCAL ONLY · 127.0.0.1:5050</div></header>
<main>
  <div class="banner"><strong>Intentionally vulnerable training mock</strong>This local demo deliberately returns fictional records without authentication. It is not a real service. Do not expose it to a network or enter real personal data.</div>
  <div class="layout">
    <section class="card content" aria-live="polite">
      <div class="eyebrow">Student workspace · local simulation</div>
      <h1 id="heading">Student dashboard</h1>
      <p class="sub">Your profile and current training-program details.</p>
      <span class="pill">Synthetic training data</span>
      <div id="result"></div>
      <div class="note"><strong>For the local exercise:</strong> Open DevTools → Network and inspect the dashboard API request. Compare how the response changes when the URL parameter is edited. Repeat the API request with cURL or Postman without cookies or authorization headers. This mock intentionally performs no authentication or ownership check.</div>
      <div class="footer">Educational mock only · no real identities, accounts, or private records are used.</div>
    </section>
  </div>
</main>
<script>
const params = new URLSearchParams(location.search);
const userId = params.get('userId') || '104';
const heading = document.getElementById('heading');
const result = document.getElementById('result');
fetch(`/api/dashboard?userId=${encodeURIComponent(userId)}`, {credentials:'omit'})
 .then(async response => {
   const body = await response.json();
   if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
   heading.textContent = 'Student dashboard';
   result.innerHTML = `<div class="grid">
     <div class="field"><div class="label">Name</div><div class="value" id="f-name"></div></div>
     <div class="field"><div class="label">Email</div><div class="value" id="f-email"></div></div>
     <div class="field"><div class="label">Program</div><div class="value" id="f-program"></div></div>
     <div class="field"><div class="label">Status</div><div class="value" id="f-status"></div></div>
     <div class="field wide"><div class="label">Notes</div><div class="value" id="f-notes"></div></div>
   </div>`;
   for (const [key,value] of Object.entries({name:body.name,email:body.email,program:body.program,status:body.status,notes:body.notes})) {
     document.getElementById(`f-${key}`).textContent = value;
   }
 })
 .catch(error => { heading.textContent='Record unavailable'; result.innerHTML=`<div class="error"></div>`; result.querySelector('.error').textContent=error.message; });
</script>
</body>
</html>'''

class Handler(BaseHTTPRequestHandler):
    def send_bytes(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self.send_bytes(200, "text/html; charset=utf-8", PAGE.encode("utf-8"))
            return
        if parsed.path == "/api/dashboard":
            user_id = parse_qs(parsed.query).get("userId", [""])[0]
            record = RECORDS.get(user_id)
            if record is None:
                body = json.dumps({"error": "Unknown demo userId. See the README for the local test values."}).encode()
                self.send_bytes(404, "application/json; charset=utf-8", body)
                return
            body = json.dumps(record).encode("utf-8")
            self.send_bytes(200, "application/json; charset=utf-8", body)
            return
        self.send_bytes(404, "application/json; charset=utf-8", b'{"error":"Not found"}')

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Local mock dashboard running at http://{HOST}:{PORT}")
    print("Training-only: fake data, intentionally no authentication. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local mock dashboard.")
    finally:
        server.server_close()
