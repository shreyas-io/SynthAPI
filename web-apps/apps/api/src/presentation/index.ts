import type { Express } from "express";

import type { AppContext } from "../server";
import { addAuthRoutes } from "./auth";
import { bearerAuthMiddleware } from "../middleware/auth";
import { addContactRoutes } from "./contact";
import { addMockApiResponseRoutes } from "./mock_api_responses";
import { addMockApiRoutes } from "./mock_apis";
import { addOrganizationRoutes } from "./organizations";
import { addProjectChatRoutes } from "./project_chats";
import { addProjectRoutes } from "./projects";
import { addProfileRoutes } from "./profile";
import { addTemplateRoutes } from "./templates";
import { addBillingRoutes, addBillingWebhookRoutes } from "./billing";

export const addRoutes = (app: Express, ctx: AppContext) => {
  addAuthRoutes(app, ctx);
  addContactRoutes(app, ctx);
  
  addBillingWebhookRoutes(app, ctx);
  
  app.use("/api/v1", bearerAuthMiddleware(ctx));

  addOrganizationRoutes(app, ctx);
  addProfileRoutes(app, ctx);
  addProjectRoutes(app, ctx);
  addMockApiRoutes(app, ctx);
  addMockApiResponseRoutes(app, ctx);
  addProjectChatRoutes(app, ctx);
  addTemplateRoutes(app, ctx);
  addBillingRoutes(app, ctx);
};
