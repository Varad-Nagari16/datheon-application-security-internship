import "express-serve-static-core";
import type { VerifiedSession } from "../auth.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: VerifiedSession;
    }
  }
}

export {};
