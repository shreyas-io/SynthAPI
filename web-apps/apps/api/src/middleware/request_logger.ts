import { createMiddleware } from "hono/factory";

import { logger } from "../infrastructure/logger";

export const requestLoggerMiddleware = createMiddleware(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();

  const ip =
    c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";

  c.set("log", logger.child({
    request_id: requestId,
    req: {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
      ip,
    },
  }));

  c.header("x-request-id", requestId);

  await next();

  const durationMs = Date.now() - startedAt;
  const statusCode = c.res.status;
  const level = statusCode >= 500 ? "warn" : "info";

  c.var.log[level](
    {
      res: {
        status_code: statusCode,
      },
      response_time_ms: Math.round(durationMs * 100) / 100,
    },
    "request completed",
  );
});
