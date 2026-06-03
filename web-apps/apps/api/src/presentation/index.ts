import type { Express } from "express";

import type { AppContext } from "../server";
import { addAuthRoutes } from "./auth";
import { bearerAuthMiddleware } from "../middleware/auth";
import { addMockApiResponseRoutes } from "./mock_api_responses";
import { addMockApiRoutes } from "./mock_apis";
import { addProjectChatRoutes } from "./project_chats";
import { addProjectRoutes } from "./projects";

export const addRoutes = (app: Express, ctx: AppContext) => {
  addAuthRoutes(app, ctx);
  app.use("/api/v1", bearerAuthMiddleware(ctx));

  addProjectRoutes(app, ctx);
  addMockApiRoutes(app, ctx);
  addMockApiResponseRoutes(app, ctx);
  addProjectChatRoutes(app, ctx);
};
