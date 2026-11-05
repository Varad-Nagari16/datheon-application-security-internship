import type { CookieOptions } from "express";
import { SESSION_COOKIE_NAME } from "./auth.js";

export type CookieSameSite = "lax" | "none";
export { SESSION_COOKIE_NAME };

export function readCookieSameSite(value: string | undefined): CookieSameSite {
  const normalized = value?.trim().toLowerCase() ?? "lax";
  if (normalized !== "lax" && normalized !== "none") {
    throw new Error("BOLAGUARD_COOKIE_SAME_SITE must be 'lax' or 'none'");
  }
  return normalized;
}

export function sessionCookieOptions(sameSite: CookieSameSite, maxAgeSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite,
    path: "/",
    maxAge: Math.max(0, maxAgeSeconds) * 1000,
  };
}

export function sessionClearCookieOptions(sameSite: CookieSameSite): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite,
    path: "/",
  };
}
