import { randomBytes } from "node:crypto";
import express, { type Express } from "express";

import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { asyncRoute } from "../middleware/async_route";
import { ProjectsUsecase } from "../domain/usecases/mock_api/projects";
import { ProjectApiKeysUsecase } from "../domain/usecases/mock_api/project_api_keys";
import { RequestLogsUsecase } from "../domain/usecases/mock_api/request_logs";
import { OpenApiUsecase } from "../domain/usecases/mock_api/openapi";
import type { AppContext } from "../server";
import {
  createProjectApiKeyDto,
  createProjectDto,
  listProjectsFilterDto,
  listProjectsPaginationDto,
  listProjectsSortDto,
  importOpenApiDto,
} from "./dtos/projects";
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

export const addProjectRoutes = (app: Express, ctx: AppContext) => {
  const projects = ProjectsUsecase(ctx);
  const projectApiKeys = ProjectApiKeysUsecase(ctx);
  const requestLogs = RequestLogsUsecase(ctx);
  const openApiUsecase = OpenApiUsecase(ctx);

  app.post(
    "/api/v1/projects",
    asyncRoute(async (req, res) => {
      const parsed = createProjectDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }
      const input = parsed.data;
      const project = await projects.createProject(
        getAuthenticatedUser(req.user),
        {
          slug: getProjectSlug(input.name),
          name: input.name,
          description: input.description,
          organization_id: input.organization_id,
          globals: input.globals ?? null,
          constants: input.constants ?? null,
        },
      );
      res.status(201).json(project);
    }),
  );

  app.get(
    "/api/v1/projects",
    asyncRoute(async (req, res) => {
      const filters: {
        ids?: string[];
        organization_id?: string;
        slug?: string;
        name?: string;
        description?: string;
        search?: string;
        fetch_deleted?: boolean;
      } = {};
      const organization_id = getString(req.query.organization_id);
      if (!organization_id) {
        res.json([]);
        return;
      }

      filters.organization_id = organization_id;

      const ids = getStringArray(req.query.id);
      const slug = getString(req.query.slug);
      const name = getString(req.query.name);
      const description = getString(req.query.description);
      const search = getString(req.query.search);
      const fetch_deleted = req.query.fetch_deleted === "true";

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

      const limitRaw = getNumber(req.query.limit, 100);
      if (limitRaw > 100) {
        throw new ApiGatewayException({
          public_message: "Limit cannot exceed 100",
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      const parsedPagination = listProjectsPaginationDto.safeParse({
        limit: limitRaw,
        offset: getNumber(req.query.offset, 0),
      });
      if (!parsedPagination.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedPagination.error.issues),
        });
      }

      const parsedSort = listProjectsSortDto.safeParse({
        by: getString(req.query.sort_by) ?? "created_at",
        order: getString(req.query.sort_order) ?? "desc",
      });
      if (!parsedSort.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedSort.error.issues),
        });
      }

      res.json(
        await projects.getProjects(
          getAuthenticatedUser(req.user),
          parsedFilters.data,
          parsedPagination.data,
          parsedSort.data,
        ),
      );
    }),
  );

  app.get(
    "/api/v1/projects/:id",
    asyncRoute(async (req, res) => {
      res.json(
        await projects.getProject(
          getAuthenticatedUser(req.user),
          req.params.id as string,
        ),
      );
    }),
  );

  app.put(
    "/api/v1/projects/:id",
    asyncRoute(async (req, res) => {
      const parsed = createProjectDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }
      const input = parsed.data;
      await projects.updateProject(
        getAuthenticatedUser(req.user),
        req.params.id as string,
        {
          name: input.name,
          description: input.description,
          globals: input.globals ?? null,
          constants: input.constants ?? null,
        },
      );
      res.json({});
    }),
  );

  app.delete(
    "/api/v1/projects/:id",
    asyncRoute(async (req, res) => {
      await projects.deleteProject(
        getAuthenticatedUser(req.user),
        req.params.id as string,
      );
      res.status(204).send();
    }),
  );

  app.post(
    "/api/v1/projects/:id/restore",
    asyncRoute(async (req, res) => {
      await projects.restoreProject(
        getAuthenticatedUser(req.user),
        req.params.id as string,
      );
      res.json({});
    }),
  );

  app.get(
    "/api/v1/projects/:id/api-keys",
    asyncRoute(async (req, res) => {
      res.json(
        await projectApiKeys.listProjectApiKeys(
          getAuthenticatedUser(req.user),
          req.params.id as string,
        ),
      );
    }),
  );

  app.post(
    "/api/v1/projects/:id/api-keys",
    asyncRoute(async (req, res) => {
      const parsed = createProjectApiKeyDto.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsed.error.issues),
        });
      }

      const apiKey = await projectApiKeys.createProjectApiKey(
        getAuthenticatedUser(req.user),
        req.params.id as string,
        parsed.data,
      );

      res.status(201).json(apiKey);
    }),
  );

  app.delete(
    "/api/v1/projects/:id/api-keys/:keyId",
    asyncRoute(async (req, res) => {
      await projectApiKeys.revokeProjectApiKey(
        getAuthenticatedUser(req.user),
        req.params.id as string,
        req.params.keyId as string,
      );

      res.status(204).send();
    }),
  );

  app.get(
    "/api/v1/projects/:id/logs",
    asyncRoute(async (req, res) => {
      const mock_api_id = getString(req.query.mock_api_id);
      const cursor = getString(req.query.cursor);
      const limit = getNumber(req.query.limit, 20);
      if (limit > 20) {
        throw new ApiGatewayException({
          public_message: "Limit cannot exceed 20",
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      res.json(
        await requestLogs.listProjectRequestLogs(
          getAuthenticatedUser(req.user),
          req.params.id as string,
          mock_api_id ? { mock_api_id } : {},
          { limit, ...(cursor ? { cursor } : {}) },
        ),
      );
    }),
  );

  app.post(
    "/api/v1/projects/:id/import-openapi",
    express.json({ limit: "5mb" }),
    asyncRoute(async (req, res) => {
      const parsedBody = importOpenApiDto.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiGatewayException({
          public_message: JSON.stringify(parsedBody.error.issues),
          status_code: HttpStatusCode.BAD_REQUEST,
        });
      }

      const result = await openApiUsecase.importSpec(
        getAuthenticatedUser(req.user),
        req.params.id as string,
        parsedBody.data.spec,
      );

      res.status(200).json(result);
    }),
  );
};
