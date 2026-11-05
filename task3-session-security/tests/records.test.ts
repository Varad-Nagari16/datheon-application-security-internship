import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import { createApp } from "../src/app.js";
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  JWT_TTL_SECONDS,
  SESSION_ABSOLUTE_TTL_SECONDS,
  SESSION_COOKIE_NAME,
  type VerifiedSession,
  verifyAccessToken,
} from "../src/auth.js";
import { initializeDatabase } from "../src/database.js";
import { SlidingWindowCounter } from "../src/rateLimit.js";
import { DEMO_PASSWORD } from "../src/records.js";
import { SessionStore } from "../src/sessionStore.js";

const testSecret = "unit-test-jwt-secret-that-is-never-used-outside-tests";
const database = initializeDatabase(new Database(":memory:"));
const rateDatabase = initializeDatabase(new Database(":memory:"));
const loginRateDatabase = initializeDatabase(new Database(":memory:"));
const app = createApp({
  database,
  jwtSecret: testSecret,
  cookieSameSite: "lax",
  rateLimits: {
    login: { limit: 100, windowMs: 60_000 },
    records: { limit: 100, windowMs: 60_000 },
  },
});
const rateApp = createApp({
  database: rateDatabase,
  jwtSecret: testSecret,
  cookieSameSite: "lax",
  rateLimits: {
    login: { limit: 2, windowMs: 60_000 },
    records: { limit: 2, windowMs: 60_000 },
  },
});
const loginRateApp = createApp({
  database: loginRateDatabase,
  jwtSecret: testSecret,
  cookieSameSite: "lax",
  rateLimits: {
    login: { limit: 2, windowMs: 60_000 },
    records: { limit: 2, windowMs: 60_000 },
  },
});

const users = [
  { name: "Student A", email: "student.a@example.test", id: 104, userId: "user-a" },
  { name: "Student B", email: "student.b@example.test", id: 105, userId: "user-b" },
  { name: "Student C", email: "student.c@example.test", id: 106, userId: "user-c" },
  { name: "Student D", email: "student.d@example.test", id: 107, userId: "user-d" },
  { name: "Student E", email: "student.e@example.test", id: 108, userId: "user-e" },
];

type PortalApp = typeof app;

function setCookieHeader(response: { headers: Record<string, string | string[] | undefined> }): string {
  const setCookie = response.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!cookie) throw new Error("Expected a Set-Cookie session header");
  return cookie;
}

function sessionCookie(response: { headers: Record<string, string | string[] | undefined> }): string {
  return setCookieHeader(response).split(";", 1)[0]!;
}

async function login(
  targetApp: PortalApp,
  email: string,
  password = DEMO_PASSWORD,
): Promise<string> {
  const response = await request(targetApp)
    .post("/api/session")
    .send({ email, password })
    .expect(200);
  return sessionCookie(response);
}

let studentACookie = "";

beforeAll(async () => {
  studentACookie = await login(app, "student.a@example.test");
});

afterAll(() => {
  database.close();
  rateDatabase.close();
  loginRateDatabase.close();
});

describe("cookie-based cryptographic session security and BOLA protection", () => {
  it("serves a normal portal shell without listing demo users or records", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Northstar Student Portal");
    expect(response.text).toContain('id="signin-form"');
    expect(response.text).toContain('id="dashboard-screen"');
    expect(response.text).toContain('id="not-found-screen"');
    expect(response.text).not.toContain("student.a@example.test");
    expect(response.text).not.toContain("record-form");
  });

  it("serves the page manifest and local health endpoint", async () => {
    const manifest = await request(app).get("/manus-routes.json");
    const health = await request(app).get("/health");
    expect(manifest.status).toBe(200);
    expect(manifest.body).toEqual({ routes: [{ path: "/", title: "Northstar Student Portal" }] });
    expect(health.body).toEqual({ status: "ok", mode: "local-training-lab" });
  });

  it("issues an HMAC-SHA256 JWT only in an HttpOnly Secure SameSite cookie", async () => {
    const response = await request(app)
      .post("/api/session")
      .send({ email: "student.a@example.test", password: DEMO_PASSWORD })
      .expect(200);
    const setCookie = setCookieHeader(response);

    expect(response.headers["cache-control"]).toContain("no-store");
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/Max-Age=900/i);
    expect(response.body).toMatchObject({
      tokenType: "Cookie",
      expiresIn: JWT_TTL_SECONDS,
      account: { name: "Student A", email: "student.a@example.test", applicationId: 104 },
    });
    expect(response.body).not.toHaveProperty("token");
    expect(response.body).not.toHaveProperty("accessToken");

    const rawToken = setCookie.split(";", 1)[0]!.slice(`${SESSION_COOKIE_NAME}=`.length);
    const claims = jwt.verify(rawToken, testSecret, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    expect(claims).toMatchObject({ sub: "user-a", email: "student.a@example.test" });
    expect((claims as jwt.JwtPayload).jti).toBeTruthy();
    expect((claims as jwt.JwtPayload).sid).toBeTruthy();
  });

  it("keeps browser authentication and profile data out of Web Storage", async () => {
    const script = await request(app).get("/app.js").expect(200);
    expect(script.text).not.toMatch(/localStorage|sessionStorage/);
    expect(script.text).not.toMatch(/Authorization\s*:/i);
    expect(script.text).toContain("/api/session/rotate");
    expect(script.text).toContain("credentials: \"same-origin\"");
  });

  it("restores the account from a valid cookie after a page refresh", async () => {
    const response = await request(app)
      .get("/api/session")
      .set("Cookie", studentACookie)
      .expect(200);
    expect(response.body).toMatchObject({
      authenticated: true,
      account: { name: "Student A", email: "student.a@example.test", applicationId: 104 },
    });
    expect(response.body).not.toHaveProperty("token");
  });

  it("stores only a salted password hash in SQLite", () => {
    const row = database
      .prepare("SELECT password_salt, password_hash FROM users WHERE id = ?")
      .get("user-a") as { password_salt: string; password_hash: string };
    expect(row.password_salt).not.toBe("");
    expect(row.password_hash).not.toBe(DEMO_PASSWORD);
    expect(row.password_hash).toHaveLength(128);
  });

  it("rejects incorrect credentials with a generic 401", async () => {
    const response = await request(app)
      .post("/api/session")
      .send({ email: "student.a@example.test", password: "wrong-password" });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid email or password" });
    expect(JSON.stringify(response.body)).not.toMatch(/sql|database|password_hash|stack/i);
  });

  it("rejects missing, malformed, invalid, and Bearer-only session credentials", async () => {
    const missing = await request(app).get("/api/session");
    const bearerOnly = await request(app)
      .get("/api/records/104")
      .set("Authorization", "Bearer this-is-not-accepted");
    const malformed = await request(app)
      .get("/api/records/104")
      .set("Cookie", `${SESSION_COOKIE_NAME}=not-a-jwt`);
    const invalidSignature = await request(app)
      .get("/api/records/104")
      .set("Cookie", `${SESSION_COOKIE_NAME}=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ1c2VyLWEifQ.`);

    for (const response of [missing, bearerOnly, malformed, invalidSignature]) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(JSON.stringify(response.body)).not.toMatch(/jwt|signature|sql|stack/i);
    }
  });

  it("rejects a JWT whose signed payload or signature was tampered with", async () => {
    const [cookieName, rawToken] = studentACookie.split("=");
    const [header, payload, signature] = rawToken!.split(".");
    const tampered = `${header}.${payload}.${signature!.startsWith("A") ? "B" : "A"}${signature!.slice(1)}`;
    const response = await request(app)
      .get("/api/session")
      .set("Cookie", `${cookieName}=${tampered}`);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("rejects an expired JWT with a generic 401", async () => {
    const expired = jwt.sign(
      { email: "student.a@example.test", sid: "expired-session", iat: Math.floor(Date.now() / 1000) - 60 },
      testSecret,
      {
        algorithm: "HS256",
        audience: JWT_AUDIENCE,
        expiresIn: -1,
        issuer: JWT_ISSUER,
        jwtid: "expired-token-id",
        subject: "user-a",
      },
    );
    const response = await request(app)
      .get("/api/session")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${expired}`);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("rotates a token once, refreshes the cookie, and rejects replay of the previous token", async () => {
    const firstCookie = await login(app, "student.a@example.test");
    const rotation = await request(app)
      .post("/api/session/rotate")
      .set("Cookie", firstCookie)
      .expect(200);
    const secondCookie = sessionCookie(rotation);

    expect(secondCookie).not.toBe(firstCookie);
    expect(rotation.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
    expect(rotation.headers["set-cookie"][0]).toMatch(/Secure/i);
    expect(rotation.headers["set-cookie"][0]).toMatch(/SameSite=Lax/i);
    expect(rotation.body.expiresIn).toBe(JWT_TTL_SECONDS);

    const replay = await request(app)
      .get("/api/session")
      .set("Cookie", firstCookie);
    const current = await request(app)
      .get("/api/session")
      .set("Cookie", secondCookie);
    expect(replay.status).toBe(401);
    expect(current.status).toBe(200);
    expect(SESSION_ABSOLUTE_TTL_SECONDS).toBe(8 * 60 * 60);
  });

  it("enforces the eight-hour absolute session limit across repeated rotations", () => {
    const store = new SessionStore(testSecret);
    const account = {
      userId: "user-a",
      email: "student.a@example.test",
      name: "Student A",
      applicationId: 104,
    };
    const startedAt = Math.floor(Date.now() / 1000);
    const initial = store.create(account, startedAt);
    const claimsFor = (session: typeof initial): VerifiedSession => ({
      userId: account.userId,
      email: account.email,
      sessionId: session.sessionId,
      jti: session.jti,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    });

    let current = initial;
    for (let elapsed = 10 * 60; elapsed < SESSION_ABSOLUTE_TTL_SECONDS; elapsed += 10 * 60) {
      const rotated = store.rotate(claimsFor(current), startedAt + elapsed);
      expect(rotated).not.toBeNull();
      current = rotated!;
    }

    expect(current.expiresAt).toBe(startedAt + SESSION_ABSOLUTE_TTL_SECONDS);
    expect(store.rotate(claimsFor(current), startedAt + SESSION_ABSOLUTE_TTL_SECONDS)).toBeNull();
  });

  it("revokes the active session and clears its cookie on logout", async () => {
    const cookie = await login(app, "student.a@example.test");
    const logout = await request(app)
      .delete("/api/session")
      .set("Cookie", cookie)
      .expect(204);
    const clearCookie = setCookieHeader(logout);
    expect(clearCookie).toMatch(/HttpOnly/i);
    expect(clearCookie).toMatch(/Secure/i);
    expect(clearCookie).toMatch(/SameSite=Lax/i);
    expect(clearCookie).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);

    const replay = await request(app).get("/api/session").set("Cookie", cookie);
    expect(replay.status).toBe(401);
  });

  it.each(users)("allows $name to read their own SQLite-backed application", async (user) => {
    const cookie = await login(app, user.email);
    const response = await request(app)
      .get(`/api/records/${user.id}`)
      .set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: user.id, studentName: user.name, email: user.email });
    expect(response.body).not.toHaveProperty("ownerId");
    expect(response.body).not.toHaveProperty("password_hash");
  });

  it.each(users.slice(1))("denies Student A access to $name's application without leaking it", async (target) => {
    const response = await request(app)
      .get(`/api/records/${target.id}`)
      .set("Cookie", studentACookie);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Record not found" });
    expect(JSON.stringify(response.body)).not.toContain(target.email);
    expect(JSON.stringify(response.body)).not.toMatch(/sql|database|stack|ownerId/i);
  });

  it("uses the same generic 404 for unknown and non-owned IDs, ignoring ownerId tampering", async () => {
    const unknown = await request(app)
      .get("/api/records/999")
      .set("Cookie", studentACookie);
    const attemptedOwnerOverride = await request(app)
      .get("/api/records/105?ownerId=user-b")
      .set("Cookie", studentACookie);
    expect(unknown.status).toBe(404);
    expect(attemptedOwnerOverride.status).toBe(404);
    expect(unknown.body).toEqual({ error: "Record not found" });
    expect(attemptedOwnerOverride.body).toEqual(unknown.body);
  });

  it("rejects nonnumeric and SQL-shaped object IDs", async () => {
    const response = await request(app)
      .get("/api/records/104%20OR%201%3D1")
      .set("Cookie", studentACookie);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Record not found" });
  });

  it("sets limit, remaining, reset and retry headers and blocks a burst of protected ID requests", async () => {
    const cookie = await login(rateApp, "student.a@example.test");
    const first = await request(rateApp).get("/api/records/104").set("Cookie", cookie).expect(200);
    const second = await request(rateApp).get("/api/records/104").set("Cookie", cookie).expect(200);
    const blocked = await request(rateApp).get("/api/records/104").set("Cookie", cookie).expect(429);

    expect(first.headers["x-ratelimit-limit"]).toBe("2");
    expect(first.headers["x-ratelimit-remaining"]).toBe("1");
    expect(first.headers["x-ratelimit-reset"]).toBeTruthy();
    expect(second.headers["x-ratelimit-remaining"]).toBe("0");
    expect(blocked.headers["x-ratelimit-limit"]).toBe("2");
    expect(blocked.headers["x-ratelimit-remaining"]).toBe("0");
    expect(blocked.headers["retry-after"]).toBeTruthy();
    expect(blocked.body).toEqual({ error: "Too many requests" });
  });

  it("throttles repeated login failures by client IP before checking further credentials", async () => {
    const wrong = () => request(loginRateApp)
      .post("/api/session")
      .send({ email: "student.a@example.test", password: "incorrect" });
    const first = await wrong().expect(401);
    const second = await wrong().expect(401);
    const blocked = await request(loginRateApp)
      .post("/api/session")
      .send({ email: "student.a@example.test", password: DEMO_PASSWORD })
      .expect(429);

    expect(first.headers["x-ratelimit-limit"]).toBe("2");
    expect(first.headers["x-ratelimit-remaining"]).toBe("1");
    expect(second.headers["x-ratelimit-remaining"]).toBe("0");
    expect(blocked.headers["retry-after"]).toBeTruthy();
    expect(blocked.body).toEqual({ error: "Too many requests" });
  });

  it("uses a true sliding window and frees a request after the oldest event expires", () => {
    const counter = new SlidingWindowCounter(2, 1000);
    expect(counter.consume("client", 0)).toMatchObject({ allowed: true, remaining: 1 });
    expect(counter.consume("client", 1)).toMatchObject({ allowed: true, remaining: 0 });
    expect(counter.consume("client", 2)).toMatchObject({ allowed: false, remaining: 0 });
    expect(counter.consume("client", 1000)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("verifies signatures only with the configured HMAC-SHA256 algorithm", async () => {
    const claims = verifyAccessToken(
      (studentACookie.split("=", 2)[1] ?? ""),
      testSecret,
    );
    expect(claims.userId).toBe("user-a");
    const HS384 = jwt.sign(
      { email: "student.a@example.test", sid: claims.sessionId },
      testSecret,
      { algorithm: "HS384", audience: JWT_AUDIENCE, expiresIn: 900, issuer: JWT_ISSUER, subject: "user-a" },
    );
    const response = await request(app)
      .get("/api/session")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${HS384}`);
    expect(response.status).toBe(401);
  });
});
