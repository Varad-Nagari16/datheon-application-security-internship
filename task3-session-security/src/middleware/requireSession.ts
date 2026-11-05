import type { RequestHandler } from "express";
import { SESSION_COOKIE_NAME, verifyAccessToken } from "../auth.js";
import { sessionClearCookieOptions, type CookieSameSite } from "../cookies.js";
import type { SessionStore } from "../sessionStore.js";

export function createRequireSession(
  jwtSecret: string,
  sessions: SessionStore,
  sameSite: CookieSameSite,
): RequestHandler {
  return (req, res, next) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof token !== "string" || token.length === 0) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const claims = verifyAccessToken(token, jwtSecret);
      if (!sessions.isActive(claims)) throw new Error("Inactive session");
      // Identity is from the verified JWT and current server-side session family;
      // no caller-provided owner, body field, or query parameter is trusted.
      req.authenticatedUser = claims;
      next();
    } catch {
      res.clearCookie(SESSION_COOKIE_NAME, sessionClearCookieOptions(sameSite));
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}
