import type { Express } from "express";

import { addHealthRoutes } from "./health.js";

export const addRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
  },
) => {
  addHealthRoutes(app, application);
};
