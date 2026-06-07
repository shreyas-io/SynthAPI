import { randomBytes } from "node:crypto";

import type { AuthenticatedUser } from "../../domain/entities/authenticated_user";
import { MockApiException } from "../../domain/exceptions/exception";
import { ProjectsUsecase } from "../../domain/usecases/mock_api/projects";
import type { AppContext } from "../agent_orchestration/context";
import {
  createProjectDto,
  listProjectsFilterDto,
  listProjectsPaginationDto,
  listProjectsSortDto,
} from "./validation/projects";

type ProjectFilters = {
  ids?: string[];
  slug?: string;
  name?: string;
  description?: string;
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

export function ProjectsApplication(ctx: AppContext) {
  const projects = ProjectsUsecase(ctx);

  return {
    createProject: (user: AuthenticatedUser, data: unknown) => {
      const { data: input, success, error } = createProjectDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      return projects.createProject(user, {
        slug: getProjectSlug(input.name),
        name: input.name,
        description: input.description,
        globals: input.globals ?? null,
        constants: input.constants ?? null,
      });
    },
    getProject: (user: AuthenticatedUser, id: string) =>
      projects.getProject(user, id),
    listProjects: (
      user: AuthenticatedUser,
      filters: unknown,
      pagination: unknown,
      sort: unknown,
    ) => {
      const {
        data: parsed_filters,
        success: filters_success,
        error: filters_error,
      } = listProjectsFilterDto.safeParse(filters);
      if (!filters_success) {
        throw new MockApiException({
          public_message: JSON.stringify(filters_error.issues),
        });
      }

      const {
        data: parsed_pagination,
        success: pagination_success,
        error: pagination_error,
      } = listProjectsPaginationDto.safeParse(pagination);
      if (!pagination_success) {
        throw new MockApiException({
          public_message: JSON.stringify(pagination_error.issues),
        });
      }

      const {
        data: parsed_sort,
        success: sort_success,
        error: sort_error,
      } = listProjectsSortDto.safeParse(sort);
      if (!sort_success) {
        throw new MockApiException({
          public_message: JSON.stringify(sort_error.issues),
        });
      }

      const project_filters: ProjectFilters = {};

      if (parsed_filters.ids?.length) project_filters.ids = parsed_filters.ids;
      if (parsed_filters.slug) project_filters.slug = parsed_filters.slug;
      if (parsed_filters.name) project_filters.name = parsed_filters.name;
      if (parsed_filters.description) {
        project_filters.description = parsed_filters.description;
      }

      return projects.getProjects(
        user,
        project_filters,
        parsed_pagination,
        parsed_sort,
      );
    },
    updateProject: async (
      user: AuthenticatedUser,
      id: string,
      data: unknown,
    ) => {
      const { data: input, success, error } = createProjectDto.safeParse(data);

      if (!success) {
        throw new MockApiException({
          public_message: JSON.stringify(error.issues),
        });
      }

      await projects.updateProject(user, id, {
        name: input.name,
        description: input.description,
        globals: input.globals ?? null,
        constants: input.constants ?? null,
      });
    },
    deleteProject: (user: AuthenticatedUser, id: string) =>
      projects.deleteProject(user, id),
  };
}
