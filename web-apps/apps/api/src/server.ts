import "dotenv/config";
import "./instrument";

import * as Sentry from "@sentry/node";

import cors from "cors";
import express, { type Express } from "express";

import { getSecrets } from "./config/secrets";
import { runMigrations } from "./infrastructure/kysely/run_migrations";
import { InMemoryEventBus } from "./infrastructure/agent_orchestration/event_bus";
import {
  createPyodideWorkerPool,
  type PyodideWorkerPool,
} from "./infrastructure/pyodide";
import { errorMiddleware } from "./middleware/error";
import { responseMiddleware } from "./middleware/response";
import { addRoutes } from "./presentation";
import { addProjectSlugRouter } from "./presentation/public_mock_apis";
import { RedisKeyValueStore } from "./infrastructure/infrastructure/redis";
import { createDatabaseClient } from "./infrastructure/kysely";
import { createLogDatabaseClient } from "./infrastructure/kysely/log_database";
import { startDomainJobs } from "./domain/jobs";
import type { IKeyValueStore } from "./domain/interfaces/kv_store";
import type { IEventBus } from "./domain/interfaces/agent_orchestration/event_bus";
import type { IEmailService } from "./domain/interfaces/email_service";
import { MailerSendEmailService } from "./infrastructure/email/mailersend_email_service";
import { asyncRoute } from "./middleware/async_route";
import {
  createMockApiRequestLogger,
  type IMockApiRequestLogger,
} from "./infrastructure/request_logs";
import { logger } from "./infrastructure/logger";
import { requestLoggerMiddleware } from "./middleware/request_logger";
import { parseMultipartRequest } from "./middleware/multipart";
import type { IWebSearchProvider } from "./domain/interfaces/agent_orchestration/web_search";
import { ExaWebSearchProvider } from "./infrastructure/agent_orchestration/exa_web_search";

type ApiApp = {
  app: Express;
  destroy: () => Promise<void>;
};

export type AppContext = {
  db: ReturnType<typeof createDatabaseClient>["db"];
  logDb: Awaited<ReturnType<typeof createLogDatabaseClient>>["db"];
  kvStore: IKeyValueStore;
  pyodide: PyodideWorkerPool;
  env: Awaited<ReturnType<typeof getSecrets>>;
  eventBus: IEventBus;
  emailService: IEmailService;
  mockApiRequestLogger: IMockApiRequestLogger;
  webSearchProvider: IWebSearchProvider;
};

export const createApiApp = async (): Promise<ApiApp> => {
  const secrets = await getSecrets();
  const dbClient = createDatabaseClient(secrets);
  await runMigrations(dbClient.db);

  const logDbClient = secrets.MYSQL_URL ? await createLogDatabaseClient(secrets.MYSQL_URL) : undefined;
  if (!logDbClient) {
    throw new Error("MYSQL_URL is required for log database.");
  }

  const keyValueStore = RedisKeyValueStore(secrets.REDIS_URL);

  const pyodide = createPyodideWorkerPool({
    size: 1,
    max_queue_size: 100,
    worker_memory_limit_mb: 28,
    worker_boot_timeout_ms: 10_000,
  });

  const agentEventBus = InMemoryEventBus();
  const emailService = createEmailService(secrets);
  const mockApiRequestLogger = createMockApiRequestLogger(
    secrets.REDIS_URL,
    logDbClient.db,
    dbClient.db, // pass main db for project info lookup
  );
  const webSearchProvider = new ExaWebSearchProvider(secrets.EXA_API_KEY);
  const appContext: AppContext = {
    db: dbClient.db,
    logDb: logDbClient.db,
    kvStore: keyValueStore,
    pyodide: pyodide,
    env: secrets,
    eventBus: agentEventBus,
    emailService,
    mockApiRequestLogger,
    webSearchProvider,
  };
  const domainJobs = await startDomainJobs({
    ctx: appContext,
    secrets,
  });

  const app = express();

  app.use(requestLoggerMiddleware);
  app.use(
    cors({
      origin: secrets.CORS_WHITELISTED_DOMAINS.map((domain) =>
        domain.trim(),
      ).filter(Boolean),
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    }),
  );
  app.use(express.text({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));
  app.use(parseMultipartRequest);

  app.get(
    "/health",
    asyncRoute(async (_req, res) => {
      res.json({
        app: "ok",
        db: await dbClient.checkHealth(),
      });
    }),
  );

  addProjectSlugRouter(app, appContext);
  app.use(responseMiddleware);

  addRoutes(app, appContext);
  Sentry.setupExpressErrorHandler(app);
  app.use(errorMiddleware);

  return {
    app,
    async destroy() {
      await domainJobs.destroy();
      await dbClient.destroy();
      await logDbClient.destroy();
      await keyValueStore.destroy();
      await pyodide.destroy();
      await mockApiRequestLogger.destroy();
    },
  };
};

function createEmailService(
  secrets: Awaited<ReturnType<typeof getSecrets>>,
): IEmailService {
  return new MailerSendEmailService({
    apiKey: secrets.MAILERSEND_API_KEY,
    ...(secrets.MAILERSEND_BASE_URL
      ? { baseUrl: secrets.MAILERSEND_BASE_URL }
      : undefined),
    from: secrets.EMAIL_FROM,
    ...(secrets.EMAIL_REPLY_TO
      ? { replyTo: secrets.EMAIL_REPLY_TO }
      : undefined),
  });
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const { app, destroy } = await createApiApp();

const server = app.listen(port, host, () => {
  logger.info({ host, port }, "API server listening");
});

const shutdown = async () => {
  server.close(async () => {
    await destroy();
    logger.info("API server shut down");
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
