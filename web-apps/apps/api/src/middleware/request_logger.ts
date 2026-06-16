import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { logger } from "../infrastructure/logger";

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId =
    req.headers["x-request-id"]?.toString() ?? crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  res.setHeader("x-request-id", requestId);

  req.log = logger.child({
    request_id: requestId,
    req: {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      ip: req.ip,
    },
  });

  const logResponse = (level: "info" | "warn", message: string) => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    req.log[level](
      {
        res: {
          status_code: res.statusCode,
        },
        response_time_ms: Math.round(durationMs * 100) / 100,
      },
      message,
    );
  };

  res.on("finish", () => {
    logResponse(res.statusCode >= 500 ? "warn" : "info", "request completed");
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      logResponse("warn", "request aborted");
    }
  });

  next();
};
