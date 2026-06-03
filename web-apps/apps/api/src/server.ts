import "dotenv/config";

import cors from "cors";
import express, { type Express } from "express";

import { getSecrets } from "./config/secrets";
import { runMigrations } from "./infrastructure/kysely/run_migrations";
import { runAgentConfigMigrations } from "./run_agent_config_migrations";
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
import type { IKeyValueStore } from "./domain/interfaces/kv_store";
import type { IEventBus } from "./domain/interfaces/agent_orchestration/event_bus";
import { asyncRoute } from "./middleware/async_route";

type ApiApp = {
  app: Express;
  destroy: () => Promise<void>;
};

export type AppContext = {
  db: ReturnType<typeof createDatabaseClient>["db"];
  kvStore: IKeyValueStore;
  pyodide: PyodideWorkerPool;
  env: Awaited<ReturnType<typeof getSecrets>>;
  eventBus: IEventBus;
};

export const createApiApp = async (): Promise<ApiApp> => {
  const secrets = await getSecrets();
  const dbClient = createDatabaseClient(secrets);
  await runMigrations(dbClient.db);

  const keyValueStore = RedisKeyValueStore({
    redis_host: secrets.REDIS_HOST,
    redis_pass: secrets.REDIS_PASSWORD,
    redis_port: secrets.REDIS_PORT,
  });

  const pyodide = createPyodideWorkerPool({
    size: 1,
    max_queue_size: 100,
    worker_memory_limit_mb: 28,
    worker_boot_timeout_ms: 10_000,
  });

  const agentEventBus = InMemoryEventBus();

  const appContext: AppContext = {
    db: dbClient.db,
    kvStore: keyValueStore,
    pyodide: pyodide,
    env: secrets,
    eventBus: agentEventBus,
  };

  /**
   * TODO: create different DB users for both
   * app (only DML permissions) and migration (with DDL permissions)
   * */
  await runAgentConfigMigrations(appContext);

  const app = express();

  app.use(
    cors({
      origin: secrets.CORS_WHITELISTED_DOMAINS.map((domain) =>
        domain.trim(),
      ).filter(Boolean),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.text({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

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
  app.use(errorMiddleware);

  return {
    app,
    async destroy() {
      await dbClient.destroy();
      await keyValueStore.destroy();
      await pyodide.destroy();
    },
  };
};

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const { app, destroy } = await createApiApp();

const server = app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await destroy();
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
