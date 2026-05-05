import type { Express } from "express";

import { asyncRoute } from "../middleware/async_route";

export type MockApiResponsesSdk = {
  createMockApiResponse: (data: unknown) => Promise<unknown>;
  getMockApiResponse: (id: string) => Promise<unknown>;
  listMockApisResponse: (
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

export const addMockApiResponseRoutes = (
  app: Express,
  mock_api_responses: MockApiResponsesSdk,
) => {
  app.post(
    "/api/v1/mock-apis/:id/responses",
    asyncRoute(async (req, res) => {
      const mock_api_response = await mock_api_responses.createMockApiResponse({
        ...req.body,
        mock_api_id: req.params.id,
      });

      res.status(201).json(mock_api_response);
    }),
  );

  app.get(
    "/api/v1/mock-apis/:id/responses",
    asyncRoute(async (req, res) => {
      const filters: {
        ids?: string[];
        mock_api_ids: string[];
        name?: string;
      } = {
        mock_api_ids: [req.params.id as string],
      };
      const ids = getStringArray(req.query.id);
      const name = getString(req.query.name);

      if (ids?.length) {
        filters.ids = ids;
      }

      if (name) {
        filters.name = name;
      }

      res.json(
        await mock_api_responses.listMockApisResponse(
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
    "/api/v1/mock-apis/:id/responses/:response_id",
    asyncRoute(async (req, res) => {
      res.json(
        await mock_api_responses.getMockApiResponse(
          req.params.response_id as string,
        ),
      );
    }),
  );

  app.put(
    "/api/v1/mock-apis/:id/responses/:response_id",
    asyncRoute(async (req, res) => {
      await mock_api_responses.updateMockApi(req.params.response_id as string, {
        ...req.body,
        mock_api_id: req.params.id,
      });
      res.json({});
    }),
  );

  app.delete(
    "/api/v1/mock-apis/:id/responses/:response_id",
    asyncRoute(async (req, res) => {
      await mock_api_responses.deleteMockApi(req.params.response_id as string);
      res.status(204).send();
    }),
  );
};
