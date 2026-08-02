import { randomBytes } from "node:crypto";
import type { Hono } from "hono";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { ProjectsUsecase } from "../domain/usecases/mock_api/projects";
import { ProjectApiKeysUsecase } from "../domain/usecases/mock_api/project_api_keys";
import { RequestLogsUsecase } from "../domain/usecases/mock_api/request_logs";
import { OpenApiUsecase } from "../domain/usecases/mock_api/openapi";
import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import type { AppContext } from "../context";
import {
  createProjectApiKeyDto,
  createProjectDto,
  listProjectsFilterDto,
  listProjectsPaginationDto,
  listProjectsSortDto,
  importOpenApiDto,
} from "./dtos/projects";
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

const getSlugBase = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 244);

  return slug || "project";
};

const getProjectSlug = (name: string): string => {
  return `${getSlugBase(name)}-${randomBytes(5).toString("hex")}`;
};

export const addProjectRoutes = (app: Hono, ctx: AppContext) => {
  const projects = ProjectsUsecase(ctx);
  const projectApiKeys = ProjectApiKeysUsecase(ctx);
  const requestLogs = RequestLogsUsecase(ctx);
  const openApiUsecase = OpenApiUsecase(ctx);

  app.post("/api/v1/projects", async (c) => {
    const parsed = createProjectDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const input = parsed.data;
    const project = await projects.createProject(
      getAuthenticatedUser(c.var.user),
      {
        slug: getProjectSlug(input.name),
        name: input.name,
        description: input.description,
        organization_id: input.organization_id,
        globals: input.globals ?? null,
        constants: input.constants ?? null,
      },
    );
    return c.json(project, 201);
  });

  app.get("/api/v1/projects", async (c) => {
    const filters: {
      ids?: string[];
      organization_id?: string;
      slug?: string;
      name?: string;
      description?: string;
      search?: string;
      fetch_deleted?: boolean;
    } = {};
    const query = c.req.query();
    const organization_id = getString(query.organization_id);
    if (!organization_id) {
      return c.json([]);
    }

    filters.organization_id = organization_id;

    const ids = getStringArray(query.id);
    const slug = getString(query.slug);
    const name = getString(query.name);
    const description = getString(query.description);
    const search = getString(query.search);
    const fetch_deleted = query.fetch_deleted === "true";

    if (ids?.length) {
      filters.ids = ids;
    }

    if (slug) {
      filters.slug = slug;
    }

    if (name) {
      filters.name = name;
    }

    if (description) {
      filters.description = description;
    }

    if (search) {
      filters.search = search;
    }

    filters.fetch_deleted = fetch_deleted;

    const parsedFilters = listProjectsFilterDto.safeParse(filters);
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

    const parsedPagination = listProjectsPaginationDto.safeParse({
      limit: limitRaw,
      offset: getNumber(query.offset, 0),
    });
    if (!parsedPagination.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedPagination.error.issues),
      });
    }

    const parsedSort = listProjectsSortDto.safeParse({
      by: getString(query.sort_by) ?? "created_at",
      order: getString(query.sort_order) ?? "desc",
    });
    if (!parsedSort.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedSort.error.issues),
      });
    }

    return c.json(
      await projects.getProjects(
        getAuthenticatedUser(c.var.user),
        parsedFilters.data,
        parsedPagination.data,
        parsedSort.data,
      ),
    );
  });

  app.get("/api/v1/projects/:id", async (c) => {
    return c.json(
      await projects.getProject(
        getAuthenticatedUser(c.var.user),
        c.req.param("id"),
      ),
    );
  });

  app.put("/api/v1/projects/:id", async (c) => {
    const parsed = createProjectDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }
    const input = parsed.data;
    await projects.updateProject(
      getAuthenticatedUser(c.var.user),
      c.req.param("id"),
      {
        name: input.name,
        description: input.description,
        globals: input.globals ?? null,
        constants: input.constants ?? null,
      },
    );
    return c.json({});
  });

  app.delete("/api/v1/projects/:id", async (c) => {
    await projects.deleteProject(
      getAuthenticatedUser(c.var.user),
      c.req.param("id"),
    );
    return c.body(null, 204);
  });

  app.post("/api/v1/projects/:id/restore", async (c) => {
    await projects.restoreProject(
      getAuthenticatedUser(c.var.user),
      c.req.param("id"),
    );
    return c.json({});
  });

  app.get("/api/v1/projects/:id/api-keys", async (c) => {
    return c.json(
      await projectApiKeys.listProjectApiKeys(
        getAuthenticatedUser(c.var.user),
        c.req.param("id"),
      ),
    );
  });

  app.post("/api/v1/projects/:id/api-keys", async (c) => {
    const parsed = createProjectApiKeyDto.safeParse(c.get("body"));
    if (!parsed.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsed.error.issues),
      });
    }

    const apiKey = await projectApiKeys.createProjectApiKey(
      getAuthenticatedUser(c.var.user),
      c.req.param("id"),
      parsed.data,
    );

    return c.json(apiKey, 201);
  });

  app.delete("/api/v1/projects/:id/api-keys/:keyId", async (c) => {
    await projectApiKeys.revokeProjectApiKey(
      getAuthenticatedUser(c.var.user),
      c.req.param("id"),
      c.req.param("keyId"),
    );

    return c.body(null, 204);
  });

  app.get("/api/v1/projects/:id/logs", async (c) => {
    const query = c.req.query();
    const mock_api_id = getString(query.mock_api_id);
    const cursor = getString(query.cursor);
    const limit = getNumber(query.limit, 20);
    if (limit > 20) {
      throw new ApiGatewayException({
        public_message: "Limit cannot exceed 20",
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    return c.json(
      await requestLogs.listProjectRequestLogs(
        getAuthenticatedUser(c.var.user),
        c.req.param("id"),
        mock_api_id ? { mock_api_id } : {},
        { limit, ...(cursor ? { cursor } : {}) },
      ),
    );
  });

  app.post("/api/v1/projects/:id/import-openapi", async (c) => {
    const parsedBody = importOpenApiDto.safeParse(c.get("body"));
    if (!parsedBody.success) {
      throw new ApiGatewayException({
        public_message: JSON.stringify(parsedBody.error.issues),
        status_code: HttpStatusCode.BAD_REQUEST,
      });
    }

    const result = await openApiUsecase.importSpec(
      getAuthenticatedUser(c.var.user),
      c.req.param("id"),
      parsedBody.data.spec,
    );

    return c.json(result, 200);
  });
};
