import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

const users = [
  { name: "Student A", email: "student.a@example.test", ownId: "104", token: "lab-session-user-a" },
  { name: "Student B", email: "student.b@example.test", ownId: "105", token: "lab-session-user-b" },
  { name: "Student C", email: "student.c@example.test", ownId: "106", token: "lab-session-user-c" },
  { name: "Student D", email: "student.d@example.test", ownId: "107", token: "lab-session-user-d" },
  { name: "Student E", email: "student.e@example.test", ownId: "108", token: "lab-session-user-e" },
];

describe("local BOLA Guard Lab", () => {
  it("serves a normal one-account portal without visible test controls or an account list", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Northstar Student Portal");
    expect(response.text).toContain('id="dashboard-screen"');
    expect(response.text).toContain('id="not-found-screen"');
    expect(response.text).not.toContain("signin-form");
    expect(response.text).not.toContain("demo-account");
    expect(response.text).not.toContain("record-form");
    expect(response.text).not.toContain("technical-response");
    for (const user of users) expect(response.text).not.toContain(user.email);
  });

  it("serves the same portal shell for a URL-addressed appId without embedding record data", async () => {
    const response = await request(app).get("/?appId=105");

    expect(response.status).toBe(200);
    expect(response.text).toContain('id="dashboard-screen"');
    expect(response.text).not.toContain("student.b@example.test");
  });

  it("serves the page route manifest as JSON", async () => {
    const response = await request(app).get("/manus-routes.json");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ routes: [{ path: "/", title: "Northstar Student Portal" }] });
  });

  it("returns 401 when the record session is missing", async () => {
    const response = await request(app).get("/api/records/104");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for malformed or unknown session tokens", async () => {
    const malformed = await request(app)
      .get("/api/records/104")
      .set("Authorization", "Bearer ");
    const unknown = await request(app)
      .get("/api/records/104")
      .set("Authorization", "Bearer not-a-session");

    expect(malformed.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual({ error: "Unauthorized" });
  });

  it.each(users)("allows $name to retrieve only their own application", async (user) => {
    const response = await request(app)
      .get(`/api/records/${user.ownId}`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: user.ownId,
      studentName: user.name,
      email: user.email,
    });
    expect(response.body).not.toHaveProperty("ownerId");
  });

  it.each(users.slice(1))("denies Student A access to $name's application without leaking it", async (target) => {
    const response = await request(app)
      .get(`/api/records/${target.ownId}`)
      .set("Authorization", "Bearer lab-session-user-a");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Record not found" });
    expect(JSON.stringify(response.body)).not.toContain(target.email);
    expect(JSON.stringify(response.body)).not.toMatch(/sql|database|stack|ownerId/i);
  });

  it("uses the same generic 404 for an unknown application ID", async () => {
    const response = await request(app)
      .get("/api/records/999")
      .set("Authorization", "Bearer lab-session-user-a");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Record not found" });
  });
});
