import type { Express } from "express";

import { asyncRoute } from "../middleware/async_route";

export type MockApisSdk = {
  createMockApi: (data: unknown) => Promise<unknown>;
  getMockApi: (id: string) => Promise<unknown>;
  listMockApis: (
    filters: unknown,
    pagination: unknown,
    sort: unknown,
  ) => Promise<unknown>;
  updateMockApi: (id: string, data: unknown) => Promise<void>;
  deleteMockApi: (id: string) => Promise<void>;
};

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
};

const getStringArray = (value: unknown): string[] | undefined => {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return undefined;
};

const getNumber = (value: unknown, fallback: number): number => {
  const stringValue = getString(value);
  const numberValue = stringValue ? Number(stringValue) : fallback;

  return Number.isFinite(numberValue) ? numberValue : fallback;
};

export const addMockApiRoutes = (app: Express, mock_apis: MockApisSdk) => {
  app.post(
    "/api/v1/mock-apis",
    asyncRoute(async (req, res) => {
      const mock_api = await mock_apis.createMockApi(req.body);
      res.status(201).json(mock_api);
    }),
  );

  app.get(
    "/api/v1/mock-apis",
    asyncRoute(async (req, res) => {
      const filters: {
        ids?: string[];
        project_ids?: string[];
        method?: string;
        path?: string;
        name?: string;
        description?: string;
      } = {};
      const ids = getStringArray(req.query.id);
      const project_ids = getStringArray(req.query.project_id);
      const method = getString(req.query.method);
      const path = getString(req.query.path);
      const name = getString(req.query.name);
      const description = getString(req.query.description);

      if (ids?.length) {
        filters.ids = ids;
      }

      if (project_ids?.length) {
        filters.project_ids = project_ids;
      }

      if (method) {
        filters.method = method;
      }

      if (path) {
        filters.path = path;
      }

      if (name) {
        filters.name = name;
      }

      if (description) {
        filters.description = description;
      }

      res.json(
        await mock_apis.listMockApis(
          filters,
          {
            limit: getNumber(req.query.limit, 20),
            offset: getNumber(req.query.offset, 0),
          },
          {
            by: getString(req.query.sort_by) ?? "created_at",
            order: getString(req.query.sort_order) ?? "desc",
          },
        ),
      );
    }),
  );

  app.get(
    "/api/v1/mock-apis/:id",
    asyncRoute(async (req, res) => {
      res.json(await mock_apis.getMockApi(req.params.id as string));
    }),
  );

  app.put(
    "/api/v1/mock-apis/:id",
    asyncRoute(async (req, res) => {
      await mock_apis.updateMockApi(req.params.id as string, req.body);
      res.json({});
    }),
  );

  app.delete(
    "/api/v1/mock-apis/:id",
    asyncRoute(async (req, res) => {
      await mock_apis.deleteMockApi(req.params.id as string);
      res.status(204).send();
    }),
  );
};
