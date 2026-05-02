import { createApplication } from "@mock-stack/application";
import { Hono } from "hono";

export type ApiEnv = {
  Bindings: {
    FRONTEND_ORIGIN?: string;
  };
};

const defaultFrontendOrigin = "http://127.0.0.1:5173";

const buildAllowedOrigins = (env?: ApiEnv["Bindings"]) =>
  [defaultFrontendOrigin, env?.FRONTEND_ORIGIN].filter(
    (origin): origin is string => Boolean(origin),
  );

export const createApiApp = () => {
  const app = new Hono<ApiEnv>();

  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin");
    const allowedOrigins = buildAllowedOrigins(c.env);

    if (origin && allowedOrigins.includes(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Methods", "GET,OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type");
      c.header("Vary", "Origin");
    }

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  });

  app.get("/health", (c) => {
    const application = createApplication({
      now: () => new Date().toISOString(),
      getGreetingTarget: () => "Cloudflare Workers",
    });

    return c.json(application.getHealth());
  });

  app.get("/greeting", (c) => {
    const application = createApplication({
      now: () => new Date().toISOString(),
      getGreetingTarget: () => "Hono on Cloudflare Workers",
    });

    return c.json(application.getGreeting());
  });

  return app;
};
