import "dotenv/config";

import cors from "cors";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import { getSecrets } from "../config/secrets.js";
import { createApplication } from "@mock-stack/application";
import { getRedisKeyValueStore } from "./infrastructure/redis.js";

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };

export const createApiApp = async () => {
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

  app.get(
    "/health",
    asyncRoute(async (_req, res) => {
      res.json(await application.getHealth());
    }),
  );

  app.get("/greeting", (_req, res) => {
    res.json(application.getGreeting());
  });

  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return {
    app,
    async destroy() {
      await application.destroy();
      await keyValueStore.destroy();
    },
  };
};

const port = Number(process.env.PORT ?? 8787);
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
