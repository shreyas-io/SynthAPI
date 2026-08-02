import type { AppLogger } from "../infrastructure/logger";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";

declare module "hono" {
  interface ContextVariableMap {
    log: AppLogger;
    user?: AuthenticatedUser;
    rawBody?: string;
    body?: unknown;
  }
}

export {};
