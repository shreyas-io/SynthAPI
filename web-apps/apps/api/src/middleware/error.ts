import * as Sentry from "@sentry/cloudflare";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";

import type { AppContext } from "../context";
import { logger } from "../infrastructure/logger";

const deriveStatusCode = (err: Error): number => {
  const maybeStatus = (err as { status_code?: unknown }).status_code;
  if (
    typeof maybeStatus === "number" &&
    maybeStatus >= 400 &&
    maybeStatus <= 599
  ) {
    return maybeStatus;
  }
  if (err instanceof HTTPException) {
    return err.status;
  }
  return 500;
};

export const errorHandler = (ctx: AppContext) => {
  const isProduction = ctx.env.ENV === "production";

  return (err: Error, c: Context) => {
    const status_code = deriveStatusCode(err);

    const message =
      typeof (err as { public_message?: unknown }).public_message === "string"
        ? (err as { public_message: string }).public_message
        : "Some Error Occurred";

    // Surface the full failure (message + stack, serialized by the logger's
    // error replacer) on every request. Prefer the request-scoped logger;
    // fall back to the root logger if it was never attached to the context.
    const bindings = {
      err,
      status_code,
      method: c.req.method,
      path: c.req.path,
    };
    const log = c.var.log as
      | { error: (...args: unknown[]) => void }
      | undefined;
    if (log) {
      log.error(bindings, "request failed");
    } else {
      logger.error(bindings, "request failed");
    }

    Sentry.captureException(err);

    const errorBody: Record<string, unknown> = { message };
    if (!isProduction) {
      // Include the real error so failures are debuggable from the response
      // (and from logs) during local development.
      errorBody.debug = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    return c.json(
      {
        status: "error",
        error: errorBody,
      },
      status_code as any,
    );
  };
};
