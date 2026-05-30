import type { Express } from "express";

import type { OrchestrationEngine, ServerContext } from "../server";
import { addAgentChatRoutes, type AgentChatSdk } from "./agent_chat";
import { addAuthRoutes } from "./auth";
import { addHealthRoutes } from "./health";
import { authMiddleware } from "../middleware/auth";
import {
  addMockApiResponseRoutes,
  type MockApiResponsesSdk,
} from "./mock_api_responses";
import { addMockApiRoutes, type MockApisSdk } from "./mock_apis";
import { addProjectRoutes, type ProjectsSdk } from "./projects";

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
) => {
  addHealthRoutes(app, application);
  addAuthRoutes(app, serverContext);
  app.use("/api/v1", authMiddleware(serverContext));
  addAgentChatRoutes(app, application.agent_orchestration);
  addMockApiRoutes(app, application.mock_apis);
  addMockApiResponseRoutes(app, application.mock_api_responses);
  addProjectRoutes(app, application.projects);
};
