import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import {
  findCredential,
  toPublicLookupResponse,
  toPublicVerificationResponse,
} from "./fixtures.js";

const app = express();
const publicDirectory = fileURLToPath(new URL("../public", import.meta.url));

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      connectSrc: ["'self'"],
      fontSrc: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'none'"],
      manifestSrc: ["'none'"],
      mediaSrc: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'"],
      styleSrcAttr: ["'none'"],
      upgradeInsecureRequests: null,
      workerSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-origin" },
  hsts: { maxAge: 31_536_000, includeSubDomains: true },
  noSniff: true,
  referrerPolicy: { policy: "no-referrer" },
  xFrameOptions: { action: "deny" },
}));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

app.use(express.static(publicDirectory, {
  index: "index.html",
  etag: false,
  lastModified: false,
  setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
}));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function validateReferenceId(value: string): boolean {
  return /^[A-Z0-9-]{5,32}$/.test(value);
}

app.get("/api/public/lookup/:referenceId", (req, res) => {
  const referenceId = req.params.referenceId;
  if (!validateReferenceId(referenceId)) {
    res.status(400).json({ error: "Invalid reference" });
    return;
  }

  const record = findCredential(referenceId);
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(200).json(toPublicLookupResponse(record));
});

app.get("/api/public/verify/:referenceId", (req, res) => {
  const referenceId = req.params.referenceId;
  if (!validateReferenceId(referenceId)) {
    res.status(400).json({ error: "Invalid reference" });
    return;
  }

  const record = findCredential(referenceId);
  if (!record) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(200).json(toPublicVerificationResponse(record));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const genericErrorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
  res.status(500).json({ error: "Internal Server Error" });
};
app.use(genericErrorHandler);

export { app };
