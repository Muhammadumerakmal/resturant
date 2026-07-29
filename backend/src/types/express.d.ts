// Augment Express's Request with the authenticated customer id, set by the
// customer-auth middleware after verifying the JWT cookie.
import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
