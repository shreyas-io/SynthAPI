import type { Express } from "express";

import type { ServerContext } from "../server";
import { addAuthRoutes } from "./auth";
import { addHealthRoutes } from "./health";
import { addProjectRoutes, type ProjectsSdk } from "./projects";

export const addRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
    projects: ProjectsSdk;
  },
  serverContext: ServerContext,
) => {
  addHealthRoutes(app, application);
  addProjectRoutes(app, application.projects);
  addAuthRoutes(app, serverContext);
};
