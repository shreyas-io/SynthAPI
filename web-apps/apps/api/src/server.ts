import "dotenv/config";

import cors from "cors";
import express, { type Express } from "express";

import { getSecrets } from "./config/secrets";
import { createApiGatewayDatabase } from "./infrastructure/kysely/index";
import { runMigrations } from "./infrastructure/kysely/run_migrations";
import { errorMiddleware } from "./middleware/error";
import { responseMiddleware } from "./middleware/response";
import { addRoutes } from "./routes/index";
import { addPublicMockApiRoutes } from "./routes/public_mock_apis";
import { createApplication as createAgentOrchestrationApplication } from "@mock-stack/agent-orchestration-engine";
import { createApplication as createMockApiApplication } from "@mock-stack/mockapi-engine";
import { RedisKeyValueStore } from "./infrastructure/infrastructure/redis";
import type { Kysely } from "kysely";
import type { Database } from "./infrastructure/kysely/models/index";

type ApiApp = {
  app: Express;
  destroy: () => Promise<void>;
};

export type ServerContext = {
  db: Kysely<Database>;
};

export type OrchestrationEngine = Awaited<
  ReturnType<typeof createAgentOrchestrationApplication>
>;

export const createApiApp = async (): Promise<ApiApp> => {
  const secrets = await getSecrets();
  const apiGatewayDatabase = createApiGatewayDatabase(secrets);
  await runMigrations(apiGatewayDatabase.db);
  const serverContext: ServerContext = {
    db: apiGatewayDatabase.db,
  };

  const keyValueStore = RedisKeyValueStore({
    redis_host: secrets.REDIS_HOST,
    redis_pass: secrets.REDIS_PASSWORD,
    redis_port: secrets.REDIS_PORT,
  });
  const mockApiApplicationDependencies = {
    environment: {
      DB_USER: secrets.DB_USER,
      DB_PASS: secrets.DB_PASS,
      DB_HOST: secrets.DB_HOST,
      DB_PORT: secrets.DB_PORT,
      DB_NAME: secrets.DB_NAME,
    },
    keyValueStore,
  };

  const agentOrchestrationDependencies = {
    environment: {
      DB_USER: secrets.DB_USER,
      DB_PASS: secrets.DB_PASS,
      DB_HOST: secrets.DB_HOST,
      DB_PORT: secrets.DB_PORT,
      DB_NAME: secrets.DB_NAME,
      CLOUDFLARE_ACCOUNT_ID: secrets.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_AI_GATEWAY_ID: secrets.CLOUDFLARE_AI_GATEWAY_ID,
      CLOUDFLARE_AI_GATEWAY_TOKEN: secrets.CLOUDFLARE_AI_GATEWAY_TOKEN,
      OPENROUTER_API_KEY: secrets.OPENROUTER_API_KEY,
      OLLAMA_BASE_URL: secrets.OLLAMA_BASE_URL,
    },
  };

  const application = await createMockApiApplication(
    mockApiApplicationDependencies,
  );
  const agent_orchestration = await createAgentOrchestrationApplication(
    agentOrchestrationDependencies,
  );

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
  addPublicMockApiRoutes(app, application.mock_apis);
  app.use(responseMiddleware);

  addRoutes(
    app,
    {
      ...application,
      agent_orchestration,
    },
    serverContext,
  );
  app.use(errorMiddleware);

  return {
    app,
    async destroy() {
      await apiGatewayDatabase.destroy();
      await application.destroy();
      await agent_orchestration.destroy();
      await keyValueStore.destroy();
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
