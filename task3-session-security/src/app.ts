import cookieParser from "cookie-parser";
import express from "express";
import { fileURLToPath } from "node:url";
import { openDatabase, type AppDatabase } from "./database.js";
import { readCookieSameSite, type CookieSameSite } from "./cookies.js";
import { createRecordsRouter } from "./routes/records.js";
import { createSessionRouter } from "./routes/session.js";
import { createSlidingWindowLimiter } from "./rateLimit.js";
import { SessionStore } from "./sessionStore.js";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));

export interface RateLimitSettings {
  limit: number;
  windowMs: number;
}

export interface CreateAppOptions {
  jwtSecret?: string;
  databasePath?: string;
  database?: AppDatabase;
  cookieSameSite?: CookieSameSite;
  rateLimits?: {
    login?: RateLimitSettings;
    records?: RateLimitSettings;
  };
}

export function createApp(options: CreateAppOptions = {}) {
  const jwtSecret = options.jwtSecret ?? process.env.BOLAGUARD_JWT_SECRET;
  if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
    throw new Error("Set BOLAGUARD_JWT_SECRET to at least 32 characters in the local .env file.");
  }

  const database = options.database ?? openDatabase(
    options.databasePath ?? process.env.DATABASE_PATH ?? "data/bolaguard.sqlite",
  );
  const sameSite = options.cookieSameSite ?? readCookieSameSite(process.env.BOLAGUARD_COOKIE_SAME_SITE);
  const sessions = new SessionStore(jwtSecret);
  const loginSettings = options.rateLimits?.login ?? { limit: 5, windowMs: 60_000 };
  const recordsSettings = options.rateLimits?.records ?? { limit: 10, windowMs: 60_000 };
  const loginLimiter = createSlidingWindowLimiter({
    ...loginSettings,
    key: (req) => req.ip || req.socket.remoteAddress || "unknown-ip",
  });
  const recordLimiter = createSlidingWindowLimiter({
    ...recordsSettings,
    key: (req) => {
      const identity = req.authenticatedUser;
      return `${req.ip || req.socket.remoteAddress || "unknown-ip"}:${identity?.sessionId ?? "no-session"}`;
    },
  });

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.locals.database = database;
  app.locals.sessions = sessions;

  app.use(express.json({ limit: "4kb" }));
  app.use(cookieParser());
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", mode: "local-training-lab" });
  });

  app.use("/api/session", createSessionRouter(database, jwtSecret, sessions, loginLimiter, sameSite));
  app.use("/api/records", createRecordsRouter(database, jwtSecret, sessions, recordLimiter, sameSite));

  app.use(
    express.static(publicDirectory, {
      index: "index.html",
      fallthrough: true,
      maxAge: 0,
    }),
  );

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Keep malformed JSON, SQL errors and unexpected failures generic.
  app.use(
    (
      _error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
