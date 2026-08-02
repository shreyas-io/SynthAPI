/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers entry point for both production and local development.
// Wrangler dev runs this file in a local Workers runtime, with bindings
// (KV, Queue, RATE_LIMITER_DO, HYPERDRIVE) injected from wrangler.jsonc.

import type { MessageBatch, ScheduledController } from "@cloudflare/workers-types";
import { withSentry } from "@sentry/cloudflare";
import { Hono } from "hono";

import type { AppContext } from "./context";
import { createApp } from "./create_app";
import { domainCronJobs } from "./domain/jobs";
import { createWorkerAppContext, type Env } from "./worker_context";
import { RateLimiterDO } from "./infrastructure/rate_limiter/cloudflare_token_bucket";
import type { MockApiRequestLogInput } from "./infrastructure/request_logs";

export { RateLimiterDO };
export type { Env };

type WorkerApp = {
  app: Hono;
  ctx: AppContext;
};

let workerAppPromise: Promise<WorkerApp> | null = null;

const getWorkerApp = (env: Env): Promise<WorkerApp> => {
  const isLocalDev = (env.KV as any) !== undefined && !env.SENTRY_DSN?.includes("production");
  
  const build = () => createWorkerAppContext(env).then((ctx) => ({
    app: createApp(ctx),
    ctx,
  }));

  if (isLocalDev) {
    return build();
  }

  if (!workerAppPromise) {
    workerAppPromise = build();
  }
  return workerAppPromise;
};

const handleRequestLogsQueue = async (
  ctx: AppContext,
  batch: MessageBatch<Record<string, unknown>>,
): Promise<void> => {
  for (const message of batch.messages) {
    try {
      await ctx.mockApiRequestLogger.logRequest(
        message.body as MockApiRequestLogInput,
      );
      message.ack();
    } catch (err) {
      // Re-queue on failure so the message can be retried.
      message.retry();
    }
  }
};

const handleScheduled = async (
  ctx: AppContext,
  _controller: ScheduledController,
): Promise<void> => {
  for (const job of domainCronJobs) {
    try {
      await job.processor(ctx, undefined);
    } catch (err) {
      console.error(`Cron job ${job.name} failed:`, err);
    }
  }
};

const handler = {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const { app } = await getWorkerApp(env);
    return app.fetch(request, env, ctx);
  },
  async queue(
    batch: MessageBatch<Record<string, unknown>>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const { ctx: appCtx } = await getWorkerApp(env);
    ctx.waitUntil(handleRequestLogsQueue(appCtx, batch));
  },
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const { ctx: appCtx } = await getWorkerApp(env);
    ctx.waitUntil(handleScheduled(appCtx, controller));
  },
};

export default withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  handler,
);
