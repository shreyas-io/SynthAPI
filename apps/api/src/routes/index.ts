import type { Express } from "express";

import type { ServerContext } from "../server";
import { addAuthRoutes } from "./auth";
import { addHealthRoutes } from "./health";

export const addRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
  },
  serverContext: ServerContext,
) => {
  addHealthRoutes(app, application);
  addAuthRoutes(app, serverContext);
};
