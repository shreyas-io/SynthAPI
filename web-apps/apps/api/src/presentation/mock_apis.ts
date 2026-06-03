import type { Express } from "express";

import { MockApisUsecase } from "../domain/usecases/mock_api/apis";
import { executePublicMockApi } from "../domain/usecases/mock_api/execution";
import { ApiGatewayException } from "../domain/exceptions/exception";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import {
  createMockApiDto,
  executeMockApiDto,
  executePublicMockApiDto,
  listMockApisFilterDto,
  listMockApisPaginationDto,
  listMockApisSortDto,
} from "./dtos/mock_api";

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

export const addMockApiRoutes = (app: Express, ctx: AppContext) => {
  const mock_apis = MockApisUsecase(ctx);

  app.post(
    "/api/v1/mock-apis/:id/execute",
    asyncRoute(async (req, res) => {
      const parsed = executeMockApiDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }

      res.json({
        mock_api_id: req.params.id as string,
        request: parsed.data,
      });
    }),
  );

  app.post(
    "/api/v1/mock-apis",
    asyncRoute(async (req, res) => {
      const parsed = createMockApiDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }
      const input = parsed.data;
      const mock_api = await mock_apis.createMockApi({
        method: input.method,
        path: input.path,
        name: input.name,
        description: input.description,
        project_id: input.project_id,
        variables: input.variables ?? null,
      });
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

      const parsedFilters = listMockApisFilterDto.safeParse(filters);
      if (!parsedFilters.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedFilters.error.issues),
        });
      }

      const parsedPagination = listMockApisPaginationDto.safeParse({
        limit: getNumber(req.query.limit, 20),
        offset: getNumber(req.query.offset, 0),
      });
      if (!parsedPagination.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedPagination.error.issues),
        });
      }

      const parsedSort = listMockApisSortDto.safeParse({
        by: getString(req.query.sort_by) ?? "created_at",
        order: getString(req.query.sort_order) ?? "desc",
      });
      if (!parsedSort.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedSort.error.issues),
        });
      }

      res.json(
        await mock_apis.getMockApis(
          parsedFilters.data,
          parsedPagination.data,
          parsedSort.data,
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
      const parsed = createMockApiDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }
      const input = parsed.data;
      await mock_apis.updateMockApi(req.params.id as string, {
        method: input.method,
        path: input.path,
        name: input.name,
        description: input.description,
        project_id: input.project_id,
        variables: input.variables ?? null,
      });
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

  app.post(
    "/api/v1/mock-apis/public/execute",
    asyncRoute(async (req, res) => {
      const parsed = executePublicMockApiDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }

      res.json(await executePublicMockApi(ctx, parsed.data));
    }),
  );
};
