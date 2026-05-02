import "dotenv/config";

import cors from "cors";
import express, { type Express } from "express";

import { getSecrets } from "../app/config/secrets.js";
import { createApiGatewayDatabase } from "../app/infrastructure/kysely/index.js";
import { errorMiddleware } from "../app/middleware/error.js";
import { responseMiddleware } from "../app/middleware/response.js";
import { addRoutes } from "../app/routes/index.js";
import { createApplication } from "@mock-stack/application";
import { getRedisKeyValueStore } from "./infrastructure/redis.js";

type ApiApp = {
  app: Express;
  destroy: () => Promise<void>;
};

export const createApiApp = async (): Promise<ApiApp> => {
  const secrets = await getSecrets();
  const apiGatewayDatabase = createApiGatewayDatabase(secrets);

  const keyValueStore = getRedisKeyValueStore({
    redis_host: secrets.REDIS_HOST,
    redis_pass: secrets.REDIS_PASS,
    redis_port: secrets.REDIS_PORT,
  });
  const applicationDependencies = {
    environment: {
      DB_USER: secrets.APPLICATION_DB_USER,
      DB_PASS: secrets.APPLICATION_DB_PASS,
      DB_HOST: secrets.APPLICATION_DB_HOST,
      DB_PORT: secrets.APPLICATION_DB_PORT,
      DB_NAME: secrets.APPLICATION_DB_NAME,
    },
    keyValueStore,
  };

  const application = createApplication(applicationDependencies);
  const app = express();

  app.use(
    cors({
      origin: secrets.CORS_WHITELISTED_DOMAINS.map((domain) =>
        domain.trim(),
      ).filter(Boolean),
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(responseMiddleware);

  addRoutes(app, application, apiGatewayDatabase);
  app.use(errorMiddleware);

  return {
    app,
    async destroy() {
      await apiGatewayDatabase.destroy();
      await application.destroy();
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
