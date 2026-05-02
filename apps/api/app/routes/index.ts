import type { Express } from "express";

import type { ApiGatewayDatabase } from "../infrastructure/kysely/index.js";
import { addAuthRoutes } from "./auth.js";
import { addHealthRoutes } from "./health.js";

export const addRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
  },
  apiGatewayDatabase: ApiGatewayDatabase,
) => {
  addHealthRoutes(app, application);
  addAuthRoutes(app, apiGatewayDatabase);
};
