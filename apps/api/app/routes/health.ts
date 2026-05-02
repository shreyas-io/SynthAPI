import type { Express } from "express";

import { asyncRoute } from "../middleware/async_route.js";

export const addHealthRoutes = (
  app: Express,
  application: {
    getHealth: () => Promise<unknown>;
  },
) => {
  app.get(
    "/health",
    asyncRoute(async (_req, res) => {
      res.json(await application.getHealth());
    }),
  );
};
