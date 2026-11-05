import { Router, type RequestHandler } from "express";
import { authenticateDemoUser, SESSION_COOKIE_NAME, verifyAccessToken } from "../auth.js";
import type { AppDatabase } from "../database.js";
import { sessionClearCookieOptions, sessionCookieOptions, type CookieSameSite } from "../cookies.js";
import { createRequireSession } from "../middleware/requireSession.js";
import type { SessionStore } from "../sessionStore.js";

export function createSessionRouter(
  database: AppDatabase,
  jwtSecret: string,
  sessions: SessionStore,
  loginLimiter: RequestHandler,
  sameSite: CookieSameSite,
) {
  const router = Router();
  const requireSession = createRequireSession(jwtSecret, sessions, sameSite);

  router.post("/", loginLimiter, (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const account = authenticateDemoUser(database, email, password);
    if (!account) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const issued = sessions.create(account);
    res.cookie(
      SESSION_COOKIE_NAME,
      issued.token,
      sessionCookieOptions(sameSite, issued.expiresIn),
    );
    res.status(200).json({
      tokenType: "Cookie",
      expiresIn: issued.expiresIn,
      account: {
        name: account.name,
        email: account.email,
        applicationId: account.applicationId,
      },
    });
  });

  router.get("/", requireSession, (req, res) => {
    const claims = req.authenticatedUser;
    const account = claims ? sessions.accountFor(claims) : null;
    if (!claims || !account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.status(200).json({
      authenticated: true,
      expiresIn: Math.max(0, claims.expiresAt - Math.floor(Date.now() / 1000)),
      account: {
        name: account.name,
        email: account.email,
        applicationId: account.applicationId,
      },
    });
  });

  router.post("/rotate", requireSession, (req, res) => {
    const claims = req.authenticatedUser;
    const rotated = claims ? sessions.rotate(claims) : null;
    if (!rotated) {
      res.clearCookie(SESSION_COOKIE_NAME, sessionClearCookieOptions(sameSite));
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.cookie(
      SESSION_COOKIE_NAME,
      rotated.token,
      sessionCookieOptions(sameSite, rotated.expiresIn),
    );
    res.status(200).json({
      expiresIn: rotated.expiresIn,
      account: {
        name: rotated.account.name,
        email: rotated.account.email,
        applicationId: rotated.account.applicationId,
      },
    });
  });

  router.delete("/", (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof token === "string") {
      try {
        sessions.revoke(verifyAccessToken(token, jwtSecret));
      } catch {
        // Sign-out still clears malformed, expired, and already-revoked cookies.
      }
    }

    res.clearCookie(SESSION_COOKIE_NAME, sessionClearCookieOptions(sameSite));
    res.status(204).end();
  });

  return router;
}
