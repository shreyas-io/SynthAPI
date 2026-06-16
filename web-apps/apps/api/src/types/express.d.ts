import type { AppLogger } from "../infrastructure/logger";

declare global {
  namespace Express {
    interface Request {
      log: AppLogger;
      user?: {
        id: string;
        email: string | null;
        display_name: string | null;
        avatar_url: string | null;
      };
    }
  }
}

export {};
