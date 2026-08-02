import { Hono } from "hono";
import { cors } from "hono/cors";

import type { AppContext } from "./context";
import { errorHandler } from "./middleware/error";
import { responseMiddleware } from "./middleware/response";
import { requestLoggerMiddleware } from "./middleware/request_logger";
import { parseMultipartRequest } from "./middleware/multipart";
import { bodyParserMiddleware } from "./middleware/body_parser";
import { addProjectSlugRouter } from "./presentation/public_mock_apis";
import { addRoutes } from "./presentation";

export const createApp = (ctx: AppContext): Hono => {
  const app = new Hono();

  app.use(requestLoggerMiddleware);
  app.use(
    cors({
      origin: ctx.env.CORS_WHITELISTED_DOMAINS.map((domain) =>
        domain.trim(),
      ).filter(Boolean),
      credentials: true,
    }),
  );
  app.use(bodyParserMiddleware);
  app.use(parseMultipartRequest);

  app.get("/health", async (c) => {
    return c.json({
      app: "ok",
      db: await ctx.dbClient.checkHealth(),
    });
  });

  addProjectSlugRouter(app, ctx);
  app.use(responseMiddleware);

  addRoutes(app, ctx);
  app.onError(errorHandler(ctx));

  return app;
};
