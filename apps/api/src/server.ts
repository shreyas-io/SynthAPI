import "dotenv/config";

import cors from "cors";
import express, { type Express } from "express";

import { getSecrets } from "../app/config/secrets.js";
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

  const keyValueStore = getRedisKeyValueStore({
    redis_host: secrets.REDIS_HOST,
    redis_pass: secrets.REDIS_PASS,
    redis_port: secrets.REDIS_PORT,
  });
  const applicationDependencies = {
    environment: secrets,
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

  addRoutes(app, application);
  app.use(errorMiddleware);

  return {
    app,
    async destroy() {
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
