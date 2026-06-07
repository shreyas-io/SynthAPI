import type { AppContext } from "../../../../application/agent_orchestration/context";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import { ProjectsRepository } from "../../../../infrastructure/kysely/repositories/projects";
import { OrganizationMembershipsRepository } from "../../../../infrastructure/kysely/repositories/organizations";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { ProjectEt } from "../../../entities/project";

type ProjectFilters = {
  ids?: string[];
  organization_ids?: string[];
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
  const memberships_repository = OrganizationMembershipsRepository(
    ctx.database,
  );

  const getAccessibleOrganizationId = async (
    user: AuthenticatedUser,
  ): Promise<string> => {
    const organizationId = user.default_organization_id;

    if (!organizationId) {
      throw new MockApiException({
        public_message: "Default organization not found.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }

    const memberships = await memberships_repository.list({
      filters: {
        organization_ids: [organizationId],
        user_ids: [user.id],
        statuses: ["active"],
      },
      columns: ["id"],
    });

    if (!memberships.length) {
      throw new MockApiException({
        public_message: "You do not have access to this organization.",
        status_code: HttpStatusCode.FORBIDDEN,
      });
    }

    return organizationId;
  };

  return {
    createProject: async (
      user: AuthenticatedUser,
      input: Pick<
        ProjectEt,
        "slug" | "name" | "description" | "globals" | "constants"
      >,
    ) => {
      const projects_repository = ProjectsRepository(ctx.database);
      const organizationId = await getAccessibleOrganizationId(user);
      const id = await projects_repository.create({
        ...input,
        organization_id: organizationId,
      });

      const projects = await projects_repository.list({
        filters: {
          ids: [id],
          organization_ids: [organizationId],
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
    getProject: async (
      user: AuthenticatedUser,
      id: string,
    ): Promise<ProjectEt> => {
      const organizationId = await getAccessibleOrganizationId(user);
      const projects = await projects_repository.list({
        filters: {
          ids: [id],
          organization_ids: [organizationId],
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
      user: AuthenticatedUser,
      filters: ProjectFilters,
      pagination: ProjectPagination,
      sort: ProjectSort,
    ) => {
      const organizationId = await getAccessibleOrganizationId(user);
      const scopedFilters = {
        ...filters,
        organization_ids: [organizationId],
      };
      const [total, records] = await Promise.all([
        projects_repository.count({ filters: scopedFilters, pagination }),
        projects_repository.list({
          filters: scopedFilters,
          pagination,
          sort,
          columns: ["id", "organization_id", "slug", "name", "description"],
        }),
      ]);

      return {
        total,
        records,
      };
    },
    updateProject: async (
      user: AuthenticatedUser,
      id: string,
      input: Pick<
        ProjectEt,
        "name" | "description" | "globals" | "constants"
      >,
    ): Promise<void> => {
      const organizationId = await getAccessibleOrganizationId(user);
      const projects = await projects_repository.list({
        filters: {
          ids: [id],
          organization_ids: [organizationId],
        },
        columns: ["id"],
      });

      if (!projects.length) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return projects_repository.update(id, input);
    },
    deleteProject: async (
      user: AuthenticatedUser,
      id: string,
    ): Promise<void> => {
      const organizationId = await getAccessibleOrganizationId(user);
      const projects = await projects_repository.list({
        filters: {
          ids: [id],
          organization_ids: [organizationId],
        },
        columns: ["id"],
      });

      if (!projects.length) {
        throw new MockApiException({
          public_message: "Project not found.",
          status_code: HttpStatusCode.NOT_FOUND,
        });
      }

      return projects_repository.delete(id);
    },
  };
};
