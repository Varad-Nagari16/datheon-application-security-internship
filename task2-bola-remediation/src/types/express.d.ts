import "express-serve-static-core";

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: {
        userId: string;
      };
    }
  }
}

export {};
