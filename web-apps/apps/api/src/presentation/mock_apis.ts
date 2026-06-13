import type { Express } from "express";

import { MockApisUsecase } from "../domain/usecases/mock_api/apis";
import { executePublicMockApi } from "../domain/usecases/mock_api/execution";
import { ApiGatewayException } from "../domain/exceptions/exception";
import { HttpStatusCode } from "../domain/exceptions/exception";
import { ProjectsUsecase } from "../domain/usecases/mock_api/projects";
import { asyncRoute } from "../middleware/async_route";
import type { AppContext } from "../server";
import {
  createMockApiDto,
  executePublicMockApiDto,
  listMockApisFilterDto,
  listMockApisPaginationDto,
  listMockApisSortDto,
} from "./dtos/mock_api";
import { getNumber, getString, getStringArray } from "./utils";

const getAuthenticatedUser = (user: Express.Request["user"]) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
};

const buildMockApiCurlCommand = (input: {
  method: string;
  path: string;
  projectSlug: string;
  mockApiBaseUrlTemplate: string;
}) => {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const baseUrl = input.mockApiBaseUrlTemplate.replace(
    "{projectSlug}",
    input.projectSlug,
  );
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const method = input.method.toUpperCase();

  if (["POST", "PUT", "PATCH"].includes(method)) {
    return `curl -X ${method} -H "Content-Type: application/json" -d '{}' ${url}`;
  }

  return `curl -X ${method} ${url}`;
};

export const addMockApiRoutes = (app: Express, ctx: AppContext) => {
  const mock_apis = MockApisUsecase(ctx);
  const projects = ProjectsUsecase(ctx);

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
        fetch_deleted?: boolean;
      } = {};
      const ids = getStringArray(req.query.id);
      const project_ids = getStringArray(req.query.project_id);
      const method = getString(req.query.method);
      const path = getString(req.query.path);
      const name = getString(req.query.name);
      const description = getString(req.query.description);
      const fetch_deleted = req.query.fetch_deleted === "true";

      if (ids?.length) filters.ids = ids;
      if (project_ids?.length) filters.project_ids = project_ids;
      if (method) filters.method = method;
      if (path) filters.path = path;
      if (name) filters.name = name;
      if (description) filters.description = description;
      filters.fetch_deleted = fetch_deleted;

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
      const mockApi = await mock_apis.getMockApi(req.params.id as string);
      const project = await projects.getProject(
        getAuthenticatedUser(req.user),
        mockApi.project_id,
      );

      res.json({
        ...mockApi,
        curl_command: buildMockApiCurlCommand({
          method: mockApi.method,
          path: mockApi.path,
          projectSlug: project.slug,
          mockApiBaseUrlTemplate: ctx.env.MOCK_API_BASE_URL_TEMPLATE,
        }),
      });
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
    "/api/v1/mock-apis/:id/restore",
    asyncRoute(async (req, res) => {
      await mock_apis.restoreMockApi(req.params.id as string);
      res.json({});
    }),
  );
};
