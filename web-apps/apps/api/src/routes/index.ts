import type { Express } from "express";

import type { OrchestrationEngine, ServerContext } from "../server";
import { addAuthRoutes } from "./auth";
import { addHealthRoutes } from "./health";
import { authMiddleware } from "../middleware/auth";
import {
  addMockApiResponseRoutes,
  type MockApiResponsesSdk,
} from "./mock_api_responses";
import { addMockApiRoutes, type MockApisSdk } from "./mock_apis";
import { addProjectChatRoutes } from "./project_chats";
import { addProjectRoutes, type ProjectsSdk } from "./projects";
import type { getSecrets } from "../config/secrets";

type RouteSecrets = Awaited<ReturnType<typeof getSecrets>>;

export const addRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
    agent_orchestration: OrchestrationEngine;
    mock_api_responses: MockApiResponsesSdk;
    mock_apis: MockApisSdk;
    projects: ProjectsSdk;
  },
  serverContext: ServerContext,
  secrets: RouteSecrets,
) => {
  addHealthRoutes(app, application);
  addAuthRoutes(app, serverContext, secrets);
  app.use("/api/v1", authMiddleware(serverContext));
  addProjectChatRoutes(
    app,
    application.agent_orchestration,
    application.projects,
  );
  addMockApiRoutes(app, application.mock_apis);
  addMockApiResponseRoutes(app, application.mock_api_responses);
  addProjectRoutes(app, application.projects);
};
