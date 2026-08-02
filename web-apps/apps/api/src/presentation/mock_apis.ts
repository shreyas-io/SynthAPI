import type { Hono } from "hono";

import { MockApisUsecase } from "../domain/usecases/mock_api/apis";
import { ApiGatewayException } from "../domain/exceptions/exception";
import { HttpStatusCode } from "../domain/exceptions/exception";
import { ProjectsUsecase } from "../domain/usecases/mock_api/projects";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { AppContext } from "../context";
import {
  createMockApiDto,
  listMockApisFilterDto,
  listMockApisPaginationDto,
  listMockApisSortDto,
} from "./dtos/mock_api";
import { getNumber, getString, getStringArray } from "./utils";

const getAuthenticatedUser = (user: AuthenticatedUser | undefined) => {
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

export const addMockApiRoutes = (app: Hono, ctx: AppContext) => {
  const mock_apis = MockApisUsecase(ctx);
  const projects = ProjectsUsecase(ctx);

  app.post("/api/v1/mock-apis", async (c) => {
    const parsed = createMockApiDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const input = parsed.data;
    const user = getAuthenticatedUser(c.var.user);
    const mock_api = await mock_apis.createMockApi(user, {
      method: input.method,
      path: input.path,
      name: input.name,
      description: input.description,
      project_id: input.project_id,
      variables: input.variables ?? null,
    });
    return c.json(mock_api, 201);
  });

  app.get("/api/v1/mock-apis", async (c) => {
    const query = c.req.query();
    const filters: {
      ids?: string[];
      project_ids?: string[];
      method?: string;
      path?: string;
      name?: string;
      description?: string;
      fetch_deleted?: boolean;
    } = {};
    const ids = getStringArray(query.id);
    const project_ids = getStringArray(query.project_id);
    const method = getString(query.method);
    const path = getString(query.path);
    const name = getString(query.name);
    const description = getString(query.description);
    const fetch_deleted = query.fetch_deleted === "true";

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

    const limitRaw = getNumber(query.limit, 100);
    if (limitRaw > 100) {
      throw new ApiGatewayException({
        public_message: "Limit cannot exceed 100",
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    const parsedPagination = listMockApisPaginationDto.safeParse({
      limit: limitRaw,
      offset: getNumber(query.offset, 0),
    });
    if (!parsedPagination.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedPagination.error.issues),
      });
    }

    const parsedSort = listMockApisSortDto.safeParse({
      by: getString(query.sort_by) ?? "created_at",
      order: getString(query.sort_order) ?? "desc",
    });
    if (!parsedSort.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedSort.error.issues),
      });
    }

    return c.json(
      await mock_apis.getMockApis(
        parsedFilters.data,
        parsedPagination.data,
        parsedSort.data,
      ),
    );
  });

  app.get("/api/v1/mock-apis/:id", async (c) => {
    const mockApi = await mock_apis.getMockApi(c.req.param("id"));
    const project = await projects.getProject(
      getAuthenticatedUser(c.var.user),
      mockApi.project_id,
    );

    return c.json({
      ...mockApi,
      curl_command: buildMockApiCurlCommand({
        method: mockApi.method,
        path: mockApi.path,
        projectSlug: project.slug,
        mockApiBaseUrlTemplate: ctx.env.MOCK_API_BASE_URL_TEMPLATE,
      }),
    });
  });

  app.put("/api/v1/mock-apis/:id", async (c) => {
    const parsed = createMockApiDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const input = parsed.data;
    const user = getAuthenticatedUser(c.var.user);
    await mock_apis.updateMockApi(user, c.req.param("id"), {
      method: input.method,
      path: input.path,
      name: input.name,
      description: input.description,
      project_id: input.project_id,
      variables: input.variables ?? null,
    });
    return c.json({});
  });

  app.delete("/api/v1/mock-apis/:id", async (c) => {
    const user = getAuthenticatedUser(c.var.user);
    await mock_apis.deleteMockApi(user, c.req.param("id"));
    return c.body(null, 204);
  });

  app.post("/api/v1/mock-apis/:id/restore", async (c) => {
    const user = getAuthenticatedUser(c.var.user);
    await mock_apis.restoreMockApi(user, c.req.param("id"));
    return c.json({});
  });
};
