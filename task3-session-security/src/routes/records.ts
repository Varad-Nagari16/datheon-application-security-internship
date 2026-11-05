import { Router, type RequestHandler } from "express";
import type { AppDatabase } from "../database.js";
import { type CookieSameSite } from "../cookies.js";
import { createRequireSession } from "../middleware/requireSession.js";
import type { SessionStore } from "../sessionStore.js";

interface PublicApplication {
  id: number;
  studentName: string;
  email: string;
  program: string;
  term: string;
  status: string;
  note: string;
}

export function createRecordsRouter(
  database: AppDatabase,
  jwtSecret: string,
  sessions: SessionStore,
  recordLimiter: RequestHandler,
  sameSite: CookieSameSite,
) {
  const router = Router();
  const requireSession = createRequireSession(jwtSecret, sessions, sameSite);

  router.get("/:recordId", requireSession, recordLimiter, (req, res) => {
    const authenticatedUserId = req.authenticatedUser?.userId;
    if (!authenticatedUserId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawId = req.params.recordId;
    if (typeof rawId !== "string" || !/^\d{1,9}$/.test(rawId)) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    const applicationId = Number(rawId);
    if (!Number.isSafeInteger(applicationId)) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    // Enforce object-level authorization in the database query itself: both
    // the requested application ID and verified JWT owner ID must match.
    const application = database
      .prepare(`
        SELECT a.id AS id,
               u.student_name AS studentName,
               u.email AS email,
               a.program AS program,
               a.term AS term,
               a.status AS status,
               a.note AS note
        FROM applications AS a
        JOIN users AS u ON u.id = a.owner_id
        WHERE a.id = ? AND a.owner_id = ?
        LIMIT 1
      `)
      .get(applicationId, authenticatedUserId) as PublicApplication | undefined;

    if (!application) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.status(200).json(application);
  });

  return router;
}
