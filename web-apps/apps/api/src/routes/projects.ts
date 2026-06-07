import type { Express } from "express";

import type { AuthenticatedUser } from "../domain/entities/authenticated_user";
import {
  ApiGatewayException,
  HttpStatusCode,
} from "../domain/exceptions/exception";
import { asyncRoute } from "../middleware/async_route";

export type ProjectsSdk = {
  createProject: (user: AuthenticatedUser, data: unknown) => Promise<unknown>;
  getProject: (user: AuthenticatedUser, id: string) => Promise<unknown>;
  listProjects: (
    user: AuthenticatedUser,
    filters: unknown,
    pagination: unknown,
    sort: unknown,
  ) => Promise<unknown>;
  updateProject: (
    user: AuthenticatedUser,
    id: string,
    data: unknown,
  ) => Promise<void>;
  deleteProject: (user: AuthenticatedUser, id: string) => Promise<void>;
};

const getAuthenticatedUser = (user: Express.Request["user"]) => {
  if (!user) {
    throw new ApiGatewayException({
      public_message: "Unauthorized",
      status_code: HttpStatusCode.UNAUTHORIZED,
    });
  }

  return user;
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

export const addProjectRoutes = (app: Express, projects: ProjectsSdk) => {
  app.post(
    "/api/v1/projects",
    asyncRoute(async (req, res) => {
      const project = await projects.createProject(
        getAuthenticatedUser(req.user),
        req.body,
      );
      res.status(201).json(project);
    }),
  );

  app.get(
    "/api/v1/projects",
    asyncRoute(async (req, res) => {
      const filters: {
        ids?: string[];
        slug?: string;
        name?: string;
        description?: string;
      } = {};
      const ids = getStringArray(req.query.id);
      const slug = getString(req.query.slug);
      const name = getString(req.query.name);
      const description = getString(req.query.description);

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

      res.json(
        await projects.listProjects(
          getAuthenticatedUser(req.user),
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
      await projects.updateProject(
        getAuthenticatedUser(req.user),
        req.params.id as string,
        req.body,
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
};
