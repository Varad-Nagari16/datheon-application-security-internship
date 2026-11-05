import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { maskEmail, maskPhone } from "../src/masking.js";

describe("Task 4 public API privacy and shielding", () => {
  it("masks email local parts without returning their full value", () => {
    expect(maskEmail("alexandra.morgan@example.test")).toBe("a***n@example.test");
    expect(maskEmail("ab@example.test")).toBe("a*@example.test");
    expect(maskEmail("x@example.test")).toBe("*@example.test");
    expect(maskEmail("not-an-email")).toBe("***");
  });

  it("masks a phone except for its final four digits", () => {
    expect(maskPhone("+1 (202) 555-0142")).toBe("*******0142");
    expect(maskPhone("1234")).toBe("****");
    expect(maskPhone("invalid")).toBe("****");
  });

  it.each([
    ["lookup", "/api/public/lookup/CERT-1042"],
    ["verification", "/api/public/verify/CERT-1042"],
  ])("returns only dynamically masked contact values from the %s endpoint", async (_name, path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(200);
    expect(response.body.contact.email).toBe("a***n@example.test");
    expect(response.body.contact.phone).toBe("*******0142");
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("alexandra.morgan@example.test");
    expect(serialized).not.toContain("+1 (202) 555-0142");
    expect(response.body).not.toHaveProperty("name");
    expect(response.body).not.toHaveProperty("dateOfBirth");
    expect(response.body).not.toHaveProperty("address");
  });

  it("applies masking to every synthetic reference rather than a single hard-coded sample", async () => {
    for (const referenceId of ["CERT-1042", "CERT-1058", "CERT-1086"]) {
      const response = await request(app).get(`/api/public/lookup/${referenceId}`);
      expect(response.status).toBe(200);
      expect(response.body.contact.email).toMatch(/^[A-Za-z]\*{3}[A-Za-z]?@example\.test$/);
      expect(response.body.contact.phone).toMatch(/^\*{4,}\d{4}$/);
    }
  });

  it("returns the same generic not-found body for unknown lookup and verification references", async () => {
    const lookup = await request(app).get("/api/public/lookup/CERT-9999");
    const verification = await request(app).get("/api/public/verify/CERT-9999");

    expect(lookup.status).toBe(404);
    expect(verification.status).toBe(404);
    expect(lookup.body).toEqual({ error: "Not found" });
    expect(verification.body).toEqual({ error: "Not found" });
  });

  it("rejects malformed reference IDs without exposing implementation details", async () => {
    const response = await request(app).get("/api/public/lookup/bad!");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid reference" });
    expect(response.text).not.toContain("Error:");
    expect(response.text).not.toContain("stack");
    expect(response.text).not.toContain("/home/");
  });

  it("returns a generic internal error without a trace on URL-decoding failures", async () => {
    const response = await request(app).get("/api/public/lookup/%E0%A4%A");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
    expect(response.text).not.toContain("URIError");
    expect(response.text).not.toContain("stack");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    ["public lookup UI", "/", 200],
    ["lookup success", "/api/public/lookup/CERT-1042", 200],
    ["verification success", "/api/public/verify/CERT-1042", 200],
    ["not found", "/api/public/lookup/CERT-9999", 404],
    ["malformed reference", "/api/public/lookup/bad!", 400],
    ["unmatched path", "/not-a-route", 404],
    ["health", "/health", 200],
  ])("sets strict security headers for %s responses", async (_name, path, status) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(status);
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(response.headers["content-security-policy"]).toContain("style-src 'self'");
    expect(response.headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(response.headers["content-security-policy"]).toContain("script-src-attr 'none'");
    expect(response.headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["permissions-policy"]).toContain("camera=()");
    expect(response.headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(response.headers).not.toHaveProperty("x-powered-by");
    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });

  it("serves JSON with an explicit content type and no response caching", async () => {
    const response = await request(app).get("/api/public/lookup/CERT-1042");
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("serves a small UI without embedding any raw fixture contact values", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain('href="/styles.css"');
    expect(response.text).toContain('src="/app.js"');
    expect(response.text).toContain("Credential reference");
    expect(response.text).not.toContain("alexandra.morgan@example.test");
    expect(response.text).not.toContain("+1 (202) 555-0142");
  });

  it("serves only same-origin stylesheet and script assets without Web Storage or HTML injection APIs", async () => {
    const stylesheet = await request(app).get("/styles.css");
    const script = await request(app).get("/app.js");

    expect(stylesheet.status).toBe(200);
    expect(stylesheet.headers["content-type"]).toContain("text/css");
    expect(stylesheet.headers["cache-control"]).toBe("no-store");
    expect(stylesheet.headers["content-security-policy"]).toContain("style-src 'self'");
    expect(script.status).toBe(200);
    expect(script.headers["content-type"]).toContain("javascript");
    expect(script.headers["content-security-policy"]).toContain("script-src 'self'");
    expect(script.text).toContain("textContent");
    expect(script.text).not.toMatch(/localStorage|sessionStorage|innerHTML/);
  });
});
