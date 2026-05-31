import type { AppContext } from "../../../../application/agent_orchestration/context";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { ProjectsRepository } from "../../../../infrastructure/kysely/repositories/projects";
import type { ProjectEt } from "../../../entities/project";

type ProjectFilters = {
  ids?: string[];
  slug?: string;
  name?: string;
  description?: string;
};

type ProjectPagination = {
  limit: number;
  offset: number;
};

type ProjectSort = {
  by: "name" | "created_at";
  order: "asc" | "desc";
};

export const ProjectsUsecase = (ctx: AppContext) => {
  const projects_repository = ProjectsRepository(ctx.database);

  return {
    createProject: async (
      input: Pick<
        ProjectEt,
        "slug" | "name" | "description" | "globals" | "constants"
      >,
    ) => {
      const projects_repository = ProjectsRepository(ctx.database);
      const id = await projects_repository.create(input);

      const projects = await projects_repository.list({
        filters: {
          ids: [id],
        },
      });
      const project = projects.at(0);
      if (!project) {
        throw new MockApiException({
          public_message: "Error encountered while creating project.",
        });
      }

      return project;
    },
    getProject: async (id: string): Promise<ProjectEt> => {
      const projects = await projects_repository.list({
        filters: {
          ids: [id],
        },
      });
      const project = projects.at(0);
      if (!project) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return project;
    },
    getProjects: async (
      filters: ProjectFilters,
      pagination: ProjectPagination,
      sort: ProjectSort,
    ) => {
      const [total, records] = await Promise.all([
        projects_repository.count({ filters, pagination }),
        projects_repository.list({
          filters,
          pagination,
          sort,
          columns: ["id", "slug", "name", "description"],
        }),
      ]);

      return {
        total,
        records,
      };
    },
    updateProject(
      id: string,
      input: Pick<
        ProjectEt,
        "name" | "description" | "globals" | "constants"
      >,
    ): Promise<void> {
      return projects_repository.update(id, input);
    },
    deleteProject(id: string): Promise<void> {
      return projects_repository.delete(id);
    },
  };
};
