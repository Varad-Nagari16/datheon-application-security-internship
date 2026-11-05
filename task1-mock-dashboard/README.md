# Local Mock Dashboard — IDOR Training Demo

A tiny local web app for practicing how a URL parameter can select a dashboard record and how an API can expose it without authentication. The vulnerability is intentional and the records are fictional. It uses only Python's standard library.

**Local-only safety:** the server binds to `127.0.0.1` on port `5050`. Do not change it to `0.0.0.0`, forward the port, deploy it, or use real personal data. This demonstrates a simulated behavior only; it is not a finding against Datheon, crAPI, or any production service.

## Requirements

- Python 3.8+ (no pip packages needed)
- A web browser
- Optional: cURL, browser DevTools, Burp Suite Community, or Postman

Check Python:

```bash
python3 --version
```

## Start it

Open a terminal in this folder and run:

```bash
python3 app.py
```

Keep that terminal open. It should print:

```text
Local mock dashboard running at http://127.0.0.1:5050
Training-only: fake data, intentionally no authentication. Press Ctrl+C to stop.
```

Open this in your browser:

```text
http://127.0.0.1:5050
```

The page defaults to the demo record selected by the server. The dashboard itself does not display the user IDs or list other records. Five fictional records are available: `104`, `105`, `106`, `107`, and `108`. For the lab comparison, manually change the query parameter in the browser address bar, for example:

```text
http://127.0.0.1:5050/?userId=105
```

The dashboard reads the query parameter in the browser and requests the API endpoint. The server deliberately does not authenticate the caller or check record ownership.

## Verify with cURL (no credentials)

In another terminal, run these requests. No cookie or Authorization header is sent:

```bash
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=104'
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=105'
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=106'
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=107'
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=108'
```

Both should return `HTTP/1.0 200 OK` and synthetic JSON for different demo records. An unknown identifier should return 404:

```bash
curl -i 'http://127.0.0.1:5050/api/dashboard?userId=999'
```

## Inspect in Browser DevTools

1. Open the dashboard in a browser.
2. Open Developer Tools (`F12`) and choose **Network**.
3. Inspect the initial `/api/dashboard` request and response.
4. In the address bar, try `?userId=105`, then `106`, `107`, or `108`, and reload.
5. Select each new `/api/dashboard` request and compare its response.
6. Inspect **Headers** for method/path/status and confirm there is no `Authorization` or `Cookie` header.

## Optional: inspect with Burp Suite Community

1. Start Burp and open **Proxy → Intercept → Open browser**.
2. In Burp's browser, visit `http://127.0.0.1:5050`.
3. Open **Proxy → HTTP history** and select a `/api/dashboard?userId=...` request.
4. Inspect its response. Right-click and **Send to Repeater** if you want to compare records manually.
5. In Repeater, change only the `userId` value to any of `104`–`108` and click **Send**. All five records are fictional and local.

## Optional: inspect with Postman

Create a GET request to each URL below and send with no Authorization or Cookie configured:

```text
http://127.0.0.1:5050/api/dashboard?userId=104
http://127.0.0.1:5050/api/dashboard?userId=105
http://127.0.0.1:5050/api/dashboard?userId=106
http://127.0.0.1:5050/api/dashboard?userId=107
http://127.0.0.1:5050/api/dashboard?userId=108
```

## Stop

Return to the terminal running `app.py` and press **Ctrl+C**.

## Reset

There is no database and no saved user data. Restarting the script resets nothing because it contains only static fake records.

## What this proves—and what it does not

This proves only that **this deliberately vulnerable local mock** returns five synthetic records without authentication when the caller supplies their IDs. It is a reproducible demonstration of the concept. It does **not** prove a vulnerability exists in crAPI, Datheon, or another real application, and it should not be represented as a real-world disclosure.
