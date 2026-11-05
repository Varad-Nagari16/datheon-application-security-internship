import express from "express";
import { fileURLToPath } from "node:url";
import { recordsRouter } from "./routes/records.js";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", mode: "local-training-lab" });
  });

  app.use("/api/records", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use("/api/records", recordsRouter);

  // Static files are served from this project's public/ directory. The UI uses
  // relative URLs so its API calls stay on the same local origin.
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

  // Keep unexpected implementation errors generic; do not return stack traces.
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
