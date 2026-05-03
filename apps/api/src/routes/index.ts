import type { Express } from "express";

import type { ServerContext } from "../server";
import { addAuthRoutes } from "./auth";
import { addHealthRoutes } from "./health";
import { addMockApiRoutes, type MockApisSdk } from "./mock_apis";
import { addProjectRoutes, type ProjectsSdk } from "./projects";

export const addRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
    mock_apis: MockApisSdk;
    projects: ProjectsSdk;
  },
  serverContext: ServerContext,
) => {
  addHealthRoutes(app, application);
  addMockApiRoutes(app, application.mock_apis);
  addProjectRoutes(app, application.projects);
  addAuthRoutes(app, serverContext);
};
