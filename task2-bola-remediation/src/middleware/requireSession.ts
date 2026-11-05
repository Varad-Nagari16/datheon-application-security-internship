import type { RequestHandler } from "express";

interface DemoSession {
  userId: string;
}

// Public local-training fixtures only. The browser uses Student A's fixture;
// the other fixtures are reserved for API tests and cURL examples.
const demoSessions = new Map<string, DemoSession>([
  ["lab-session-user-a", { userId: "user-a" }],
  ["lab-session-user-b", { userId: "user-b" }],
  ["lab-session-user-c", { userId: "user-c" }],
  ["lab-session-user-d", { userId: "user-d" }],
  ["lab-session-user-e", { userId: "user-e" }],
]);

export const requireSession: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  const token = match?.[1];
  const session = token ? demoSessions.get(token) : undefined;

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Identity comes from the server-side session lookup, never from a record ID,
  // query parameter, or caller-supplied owner field.
  req.authenticatedUser = { userId: session.userId };
  next();
};
